"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const client_1 = require("./django/client");
const notifications_1 = require("./notifications");
const push_1 = require("./notifications/push");
const config_1 = require("./config");
(0, config_1.validateConfig)();
const io = new socket_io_1.Server({
    cors: {
        origin: config_1.config.cors.origin,
        methods: config_1.config.cors.methods
    }
});
const sessionMap = new Map();
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
        const session = sessionMap.get(sessionID);
        if (session) {
            socket.sessionID = sessionID;
            socket.userID = session.userID;
            socket.userSocketID = session.userSocketID;
            socket.username = session.username;
            socket.connected = true;
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
        const user = yield client_1.djangoClient.verifyToken(token);
        const newSessionID = (0, uuid_1.v4)();
        const newUserSocketID = (0, uuid_1.v4)();
        socket.sessionID = newSessionID;
        socket.userSocketID = newUserSocketID;
        socket.userID = user.id;
        socket.username = user.username;
        sessionMap.set(user.id, {
            userID: user.id,
            sessionID: newSessionID,
            userSocketID: newUserSocketID,
            username: user.username,
            connected: true,
        });
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error);
        next(new Error("Invalid token"));
    }
}));
io.on("connection", (socket) => {
    console.log("🔌 New connection:", socket.userID);
    socket.join(socket.userSocketID);
    socket.emit("session", {
        sessionID: socket.sessionID,
    });
    console.log("📋 Current sessions:", Array.from(sessionMap.entries()).map(([userID, session]) => ({
        userID,
        username: session.username,
        connected: session.connected,
        userSocketID: session.userSocketID
    })));
    socket.on("sendMessage", (_a) => __awaiter(void 0, [_a], void 0, function* ({ senderID, receiverID, conversationID, text, senderName, }) {
        console.log("📨 Received sendMessage:", {
            senderID,
            receiverID,
            conversationID,
            text: text.substring(0, 50),
            senderName
        });
        try {
            const canSend = yield client_1.djangoClient.canSendMessage(senderID, conversationID);
            if (!canSend) {
                console.error("❌ User not authorized to send message in this conversation");
                socket.emit("error", { message: "Not authorized to send message in this conversation" });
                return;
            }
            const savedMessage = yield client_1.djangoClient.saveMessage({
                conversation_id: conversationID,
                sender_id: senderID,
                content: text,
            });
            console.log("✅ Message saved to database:", savedMessage.id);
            const conversation = yield client_1.djangoClient.getConversation(conversationID);
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
            }
            else {
                console.log("⚠️ Receiver not found or not connected");
            }
            try {
                const pushTokens = yield (0, push_1.getPushTokens)(receiverID);
                if (pushTokens.length > 0) {
                    const messages = (0, notifications_1.createMessages)(pushTokens, text, conversationID, senderName, conversation.property_title);
                    yield (0, notifications_1.sendNotifications)(messages, receiverID, 'message');
                    console.log("✅ Notifications sent to receiver");
                }
            }
            catch (notificationError) {
                console.error("❌ Error sending notifications:", notificationError);
            }
            socket.emit("messageSent", {
                messageId: savedMessage.id,
                conversationID,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error("❌ Error processing message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    }));
    socket.on("markMessageAsRead", (_a) => __awaiter(void 0, [_a], void 0, function* ({ messageId }) {
        try {
            yield client_1.djangoClient.markMessageAsRead(messageId);
            socket.emit("messageMarkedAsRead", { messageId });
        }
        catch (error) {
            console.error("❌ Error marking message as read:", error);
            socket.emit("error", { message: "Failed to mark message as read" });
        }
    }));
    socket.on("getConversations", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = socket.userID;
            const conversations = yield client_1.djangoClient.getUserConversations(userId);
            socket.emit("conversationsList", conversations);
        }
        catch (error) {
            console.error("❌ Error fetching conversations:", error);
            socket.emit("error", { message: "Failed to fetch conversations" });
        }
    }));
    socket.on("createConversation", (_a) => __awaiter(void 0, [_a], void 0, function* ({ propertyId, buyerId, sellerId }) {
        try {
            const conversation = yield client_1.djangoClient.createConversation({
                property_id: propertyId,
                buyer_id: buyerId,
                seller_id: sellerId,
            });
            socket.emit("conversationCreated", conversation);
            yield (0, notifications_1.sendNewConversationNotification)(sellerId, socket.username, "Property Inquiry", "New conversation started", conversation.id);
        }
        catch (error) {
            console.error("❌ Error creating conversation:", error);
            socket.emit("error", { message: "Failed to create conversation" });
        }
    }));
    socket.on("disconnect", () => {
        console.log("🔌 User disconnected:", socket.userID);
        const userSession = sessionMap.get(socket.userID);
        if (userSession) {
            userSession.connected = false;
            sessionMap.set(userSession.userID, userSession);
        }
    });
});
io.listen(config_1.config.server.port);
console.log(`🚀 Congo Estate Chat Server listening on port ${config_1.config.server.port}`);
console.log(`🌐 Environment: ${config_1.config.server.environment}`);
console.log(`🔗 Django API: ${config_1.config.django.apiUrl}`);
