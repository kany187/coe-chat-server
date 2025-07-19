import { Server } from 'socket.io'
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import { SessionSocket, JWT } from "./types";
import { djangoClient } from './django/client';
import { 
  sendNotifications, 
  createMessages, 
  sendNewConversationNotification 
} from './notifications';
import { getPushTokens } from './notifications/push';
import { config, validateConfig } from './config';

// Validate configuration on startup
validateConfig();

const io = new Server({
    cors: {
      origin: config.cors.origin,
      methods: config.cors.methods
    }
  });
  
  const sessionMap = new Map<
  number,
  {
    sessionID: string;
    userID: number;
    userSocketID: string;
    username: string;
    connected: boolean;
  }
>();

io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = sessionMap.get(sessionID);
    if (session) {
      (socket as SessionSocket).sessionID = sessionID;
      (socket as SessionSocket).userID = session.userID;
      (socket as SessionSocket).userSocketID = session.userSocketID;
      (socket as SessionSocket).username = session.username;
      (socket as SessionSocket).connected = true;
      session.connected = true;

      sessionMap.set(session.userID, session);
      return next();
    }
  }

  const token = socket.handshake.auth.accessToken;
  if (!token) {
    return next(new Error("No access token provided"));
  }

  try {
    // Verify token with Django backend
    const user = await djangoClient.verifyToken(token);
    
    const newSessionID = uuidv4();
    const newUserSocketID = uuidv4();

    (socket as SessionSocket).sessionID = newSessionID;
    (socket as SessionSocket).userSocketID = newUserSocketID;
    (socket as SessionSocket).userID = user.id;
    (socket as SessionSocket).username = user.username;

    sessionMap.set(user.id, {
      userID: user.id,
      sessionID: newSessionID,
      userSocketID: newUserSocketID,
      username: user.username,
      connected: true,
    });

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("🔌 New connection:", (socket as SessionSocket).userID);
  socket.join((socket as SessionSocket).userSocketID);

  socket.emit("session", {
    sessionID: (socket as SessionSocket).sessionID,
  });

  // Debug: Log all connected users
  console.log("📋 Current sessions:", Array.from(sessionMap.entries()).map(([userID, session]) => ({
    userID,
    username: session.username,
    connected: session.connected,
    userSocketID: session.userSocketID
  })));

  socket.on(
    "sendMessage",
    async ({
      senderID,
      receiverID,
      conversationID,
      text,
      senderName,
    }: {
      senderID: number;
      receiverID: number;
      conversationID: number;
      text: string;
      senderName: string;
    }) => {
      console.log("📨 Received sendMessage:", {
        senderID,
        receiverID,
        conversationID,
        text: text.substring(0, 50),
        senderName
      });

      try {
        // Verify sender has permission to send message in this conversation
        const canSend = await djangoClient.canSendMessage(senderID, conversationID);
        if (!canSend) {
          console.error("❌ User not authorized to send message in this conversation");
          socket.emit("error", { message: "Not authorized to send message in this conversation" });
          return;
        }

        // Save message to Django database
        const savedMessage = await djangoClient.saveMessage({
          conversation_id: conversationID,
          sender_id: senderID,
          content: text,
        });

        console.log("✅ Message saved to database:", savedMessage.id);

        // Get conversation details for notifications
        const conversation = await djangoClient.getConversation(conversationID);
        
        // Send real-time message to connected receiver
        const receiver = sessionMap.get(receiverID);
        
        if (receiver && receiver.connected) {
          console.log("📤 Sending message to receiver socket:", receiver.userSocketID);
          
          const messageData = {
            senderID,
            text,
            senderName,
            conversationID,
            messageId: savedMessage.id,
            timestamp: new Date().toISOString()
          };
          
          socket
            .to(receiver.userSocketID)
            .emit("getMessage", messageData);
          
          console.log("✅ Message emitted to receiver");
        } else {
          console.log("⚠️ Receiver not found or not connected");
        }

        // Send notifications to receiver
        try {
          const pushTokens = await getPushTokens(receiverID);
          
          if (pushTokens.length > 0) {
            const messages = createMessages(
              pushTokens,
              text,
              conversationID,
              senderName,
              conversation.property_title
            );

            await sendNotifications(messages, receiverID, 'message');
            console.log("✅ Notifications sent to receiver");
          }
        } catch (notificationError) {
          console.error("❌ Error sending notifications:", notificationError);
          // Don't fail the message sending if notifications fail
        }

        // Confirm message sent to sender
        socket.emit("messageSent", {
          messageId: savedMessage.id,
          conversationID,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("❌ Error processing message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  );

  // Mark message as read
  socket.on("markMessageAsRead", async ({ messageId }: { messageId: number }) => {
    try {
      await djangoClient.markMessageAsRead(messageId);
      socket.emit("messageMarkedAsRead", { messageId });
    } catch (error) {
      console.error("❌ Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  });

  // Get user conversations
  socket.on("getConversations", async () => {
    try {
      const userId = (socket as SessionSocket).userID;
      const conversations = await djangoClient.getUserConversations(userId);
      socket.emit("conversationsList", conversations);
    } catch (error) {
      console.error("❌ Error fetching conversations:", error);
      socket.emit("error", { message: "Failed to fetch conversations" });
    }
  });

  // Create new conversation
  socket.on("createConversation", async ({ 
    propertyId, 
    buyerId, 
    sellerId 
  }: { 
    propertyId: number; 
    buyerId: number; 
    sellerId: number; 
  }) => {
    try {
      const conversation = await djangoClient.createConversation({
        property_id: propertyId,
        buyer_id: buyerId,
        seller_id: sellerId,
      });
      
      socket.emit("conversationCreated", conversation);
      
      // Send notification to seller about new conversation
      await sendNewConversationNotification(
        sellerId,
        (socket as SessionSocket).username,
        "Property Inquiry", // You might want to get the actual property title
        "New conversation started",
        conversation.id
      );
      
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      socket.emit("error", { message: "Failed to create conversation" });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", (socket as SessionSocket).userID);
    const userSession = sessionMap.get((socket as SessionSocket).userID);
    if (userSession) {
      userSession.connected = false;
      sessionMap.set(userSession.userID, userSession);
    }
  });
});

io.listen(config.server.port);
console.log(`🚀 Congo Estate Chat Server listening on port ${config.server.port}`);
console.log(`🌐 Environment: ${config.server.environment}`);
console.log(`🔗 Django API: ${config.django.apiUrl}`);