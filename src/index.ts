import { Server } from 'socket.io'
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { createServer } from 'http';

import { SessionSocket, JWT } from "./types";
import { djangoClient } from './django/client';
import { 
  sendNotifications, 
  createMessages, 
  sendNewConversationNotification,
  sendMessageNotification,
  setupReceiptValidation,
  getPushTokens
} from './notifications/push';
import { config, validateConfig } from './config';

// Validate configuration on startup
validateConfig();

// Setup receipt validation for push notifications
setupReceiptValidation();

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
  console.log('🔑 Received token:', token ? `${token.substring(0, 20)}...` : 'No token');
  console.log('🔍 Auth object:', socket.handshake.auth);
  
  if (!token) {
    return next(new Error("No access token provided"));
  }

  try {
    // Verify token with Django backend
    console.log('🔍 Verifying token with Django backend...');
    const user = await djangoClient.verifyToken(token);
    console.log('✅ Token verification successful for user:', user.id);
    
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

        // Send notifications to receiver using Expo SDK
        try {
          await sendMessageNotification(
            receiverID,
            senderName,
            text,
            conversationID,
            conversation.propertyName || "Property"
          );
          console.log("✅ Expo notifications sent to receiver");
        } catch (notificationError) {
          console.error("❌ Error sending Expo notifications:", notificationError);
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

  // Create new conversation (Property Inquiry)
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
        propertyID: propertyId,
        tenantID: buyerId,
        ownerID: sellerId,
      });
      
      socket.emit("conversationCreated", conversation);
      
      // Send notification to seller about new property inquiry
      await sendNewConversationNotification(
        sellerId,
        (socket as SessionSocket).username,
        conversation.propertyName || "Property Inquiry",
        "New property inquiry received",
        conversation.ID
      );
      
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      socket.emit("error", { message: "Failed to create conversation" });
    }
  });

  // Schedule property viewing appointment
  socket.on("scheduleAppointment", async ({
    conversationId,
    propertyId,
    appointmentDate,
    appointmentTime,
    message
  }: {
    conversationId: number;
    propertyId: number;
    appointmentDate: string;
    appointmentTime: string;
    message: string;
  }) => {
    try {
      // Save appointment message to conversation
      const savedMessage = await djangoClient.saveMessage({
        conversation_id: conversationId,
        sender_id: (socket as SessionSocket).userID,
        content: `Appointment scheduled for ${appointmentDate} at ${appointmentTime}. ${message}`,
      });

      // Notify all participants about the appointment
      const conversation = await djangoClient.getConversation(conversationId);
      const participants = await djangoClient.getConversationParticipants(conversationId);
      
      for (const participant of participants) {
        if (participant.id !== (socket as SessionSocket).userID) {
          await sendMessageNotification(
            participant.id,
            (socket as SessionSocket).username,
            `Appointment scheduled for ${appointmentDate}`,
            conversationId,
            conversation.propertyName || "Property"
          );
        }
      }

      socket.emit("appointmentScheduled", {
        messageId: savedMessage.id,
        conversationId,
        appointmentDate,
        appointmentTime
      });

    } catch (error) {
      console.error("❌ Error scheduling appointment:", error);
      socket.emit("error", { message: "Failed to schedule appointment" });
    }
  });

  // Share property documents
  socket.on("shareDocument", async ({
    conversationId,
    documentUrl,
    documentName,
    documentType
  }: {
    conversationId: number;
    documentUrl: string;
    documentName: string;
    documentType: string;
  }) => {
    try {
      const savedMessage = await djangoClient.saveMessage({
        conversation_id: conversationId,
        sender_id: (socket as SessionSocket).userID,
        content: `Shared document: ${documentName}`,
      });

      // Notify participants about document sharing
      const conversation = await djangoClient.getConversation(conversationId);
      const participants = await djangoClient.getConversationParticipants(conversationId);
      
      for (const participant of participants) {
        if (participant.id !== (socket as SessionSocket).userID) {
          await sendMessageNotification(
            participant.id,
            (socket as SessionSocket).username,
            `Document shared: ${documentName}`,
            conversationId,
            conversation.propertyName || "Property"
          );
        }
      }

      socket.emit("documentShared", {
        messageId: savedMessage.id,
        conversationId,
        documentUrl,
        documentName,
        documentType
      });

    } catch (error) {
      console.error("❌ Error sharing document:", error);
      socket.emit("error", { message: "Failed to share document" });
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

// Add HTTP server for health checks

const httpServer = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else if (req.url === '/health/db') {
    try {
      // Test database connection
      const db = await import('./db/index');
      const result = await db.default.query('SELECT NOW() as current_time, version() as db_version', []);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        db_time: result.rows[0].current_time,
        db_version: result.rows[0].db_version
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

io.listen(httpServer);
httpServer.listen(config.server.port);

console.log(`🚀 Congo Estate Chat Server listening on port ${config.server.port}`);
console.log(`🌐 Environment: ${config.server.environment}`);
console.log(`🔗 Django API: ${config.django.apiUrl}`);
console.log(`📱 Real Estate Marketplace Chat System Ready`);
console.log(`🏠 Property Inquiries | Agent Communication | Document Sharing`);