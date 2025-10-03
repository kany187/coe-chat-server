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
exports.setupReceiptValidation = exports.sendMessageNotification = exports.sendNewConversationNotification = exports.validateReceipts = exports.sendNotifications = exports.createMessages = void 0;
exports.createPushProvider = createPushProvider;
exports.sendPushNotification = sendPushNotification;
exports.sendBatchPushNotifications = sendBatchPushNotifications;
exports.getPushTokens = getPushTokens;
const expo_server_sdk_1 = require("expo-server-sdk");
const client_1 = require("../django/client");
const expo = new expo_server_sdk_1.Expo();
const tickets = [];
class FirebasePushProvider {
    constructor() {
        this.serverKey = process.env.FIREBASE_SERVER_KEY || '';
        this.projectId = process.env.FIREBASE_PROJECT_ID || '';
    }
    sendPushNotification(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (!this.serverKey) {
                    throw new Error('Firebase Server Key not configured');
                }
                const payload = {
                    notification: {
                        title: message.title,
                        body: message.body,
                    },
                    data: message.data,
                    token: message.token,
                };
                const response = yield fetch(`https://fcm.googleapis.com/fcm/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `key=${this.serverKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`Push notification failed: ${error}`);
                }
                const result = yield response.json();
                if (result.failure > 0) {
                    const error = ((_b = (_a = result.results) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.error) || 'Unknown error';
                    return {
                        success: false,
                        error,
                    };
                }
                return {
                    success: true,
                    messageId: result.message_id,
                };
            }
            catch (error) {
                console.error('Push notification error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    sendBatchPushNotifications(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.serverKey) {
                    throw new Error('Firebase Server Key not configured');
                }
                const batchSize = 500;
                const batches = [];
                for (let i = 0; i < messages.length; i += batchSize) {
                    batches.push(messages.slice(i, i + batchSize));
                }
                let totalSuccessCount = 0;
                let totalFailureCount = 0;
                const allResults = [];
                for (const batch of batches) {
                    const tokens = batch.map(msg => msg.token);
                    const firstMessage = batch[0];
                    const payload = {
                        notification: {
                            title: firstMessage.title,
                            body: firstMessage.body,
                        },
                        data: firstMessage.data,
                        registration_ids: tokens,
                    };
                    const response = yield fetch(`https://fcm.googleapis.com/fcm/send`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `key=${this.serverKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
                    if (!response.ok) {
                        const error = yield response.text();
                        throw new Error(`Batch push notification failed: ${error}`);
                    }
                    const result = yield response.json();
                    totalSuccessCount += result.success || 0;
                    totalFailureCount += result.failure || 0;
                    allResults.push(...(result.results || []));
                }
                return {
                    successCount: totalSuccessCount,
                    failureCount: totalFailureCount,
                    results: allResults,
                };
            }
            catch (error) {
                console.error('Batch push notification error:', error);
                return {
                    successCount: 0,
                    failureCount: messages.length,
                    results: messages.map(() => ({ error: error instanceof Error ? error.message : 'Unknown error' })),
                };
            }
        });
    }
}
class ExpoPushProvider {
    constructor() {
        this.accessToken = process.env.EXPO_ACCESS_TOKEN;
    }
    sendPushNotification(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const payload = {
                    to: message.token,
                    title: message.title,
                    body: message.body,
                    data: message.data,
                    sound: 'default',
                    priority: 'high',
                };
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (this.accessToken) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                }
                const response = yield fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`Expo push notification failed: ${error}`);
                }
                const result = yield response.json();
                if (((_a = result.data) === null || _a === void 0 ? void 0 : _a.status) === 'error') {
                    return {
                        success: false,
                        error: ((_b = result.data) === null || _b === void 0 ? void 0 : _b.message) || 'Expo push notification failed',
                    };
                }
                return {
                    success: true,
                    messageId: (_c = result.data) === null || _c === void 0 ? void 0 : _c.id,
                };
            }
            catch (error) {
                console.error('Expo push notification error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    sendBatchPushNotifications(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payloads = messages.map(message => ({
                    to: message.token,
                    title: message.title,
                    body: message.body,
                    data: message.data,
                    sound: 'default',
                    priority: 'high',
                }));
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (this.accessToken) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                }
                const response = yield fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payloads),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`Expo batch push notification failed: ${error}`);
                }
                const results = yield response.json();
                let successCount = 0;
                let failureCount = 0;
                results.forEach((result) => {
                    if (result.status === 'ok') {
                        successCount++;
                    }
                    else {
                        failureCount++;
                    }
                });
                return {
                    successCount,
                    failureCount,
                    results,
                };
            }
            catch (error) {
                console.error('Expo batch push notification error:', error);
                return {
                    successCount: 0,
                    failureCount: messages.length,
                    results: messages.map(() => ({ error: error instanceof Error ? error.message : 'Unknown error' })),
                };
            }
        });
    }
}
function createPushProvider() {
    var _a;
    const provider = ((_a = process.env.PUSH_PROVIDER) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'firebase';
    switch (provider) {
        case 'expo':
            return new ExpoPushProvider();
        case 'firebase':
        default:
            return new FirebasePushProvider();
    }
}
function sendPushNotification(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = createPushProvider();
        return provider.sendPushNotification(message);
    });
}
function sendBatchPushNotifications(messages) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = createPushProvider();
        return provider.sendBatchPushNotifications(messages);
    });
}
function getPushTokens(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokens = yield client_1.djangoClient.getPushTokens(userId);
            return tokens.map(token => token.token);
        }
        catch (error) {
            console.error('Error fetching push tokens:', error);
            return [];
        }
    });
}
const createMessages = (pushTokens, body, conversationID, senderName, propertyTitle) => {
    const messages = [];
    for (const token of pushTokens) {
        if (!expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            console.error(`Push token ${token} is not a valid Expo push token`);
            continue;
        }
        messages.push({
            to: token,
            sound: "default",
            body,
            title: senderName,
            data: {
                url: `exp://${process.env.EXPO_DEV_SERVER || '192.168.30.24:19000'}/--/messages/${conversationID}/${senderName}`,
                conversationId: conversationID.toString(),
                senderName,
                propertyTitle: propertyTitle || '',
                type: 'message'
            },
        });
    }
    return messages;
};
exports.createMessages = createMessages;
const sendNotifications = (messages) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (messages.length === 0) {
        return;
    }
    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                console.log('Push notification tickets:', ticketChunk);
                tickets.push(...ticketChunk);
                for (const ticket of ticketChunk) {
                    if (ticket.status === 'error') {
                        console.error('Push notification error:', (_a = ticket.details) === null || _a === void 0 ? void 0 : _a.error);
                    }
                }
            }
            catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }
    }
    catch (error) {
        console.error('Error in sendNotifications:', error);
    }
});
exports.sendNotifications = sendNotifications;
const validateReceipts = () => __awaiter(void 0, void 0, void 0, function* () {
    const receiptIds = [];
    for (const ticket of tickets) {
        if (ticket.status === 'ok' && ticket.id) {
            receiptIds.push(ticket.id);
        }
    }
    if (receiptIds.length === 0) {
        return;
    }
    try {
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        for (const chunk of receiptIdChunks) {
            try {
                const receipts = yield expo.getPushNotificationReceiptsAsync(chunk);
                console.log('Push notification receipts:', receipts);
                for (const receiptId in receipts) {
                    const { status, details } = receipts[receiptId];
                    if (status === 'ok') {
                        console.log(`Push notification ${receiptId} delivered successfully`);
                    }
                    else if (status === 'error') {
                        console.error(`Push notification ${receiptId} failed:`, details === null || details === void 0 ? void 0 : details.error);
                        if (details === null || details === void 0 ? void 0 : details.error) {
                            switch (details.error) {
                                case 'DeviceNotRegistered':
                                    console.log('Device token is no longer valid, should be removed from database');
                                    break;
                                case 'MessageTooBig':
                                    console.log('Message payload is too large');
                                    break;
                                case 'MessageRateExceeded':
                                    console.log('Message rate exceeded, should retry later');
                                    break;
                                default:
                                    console.log(`Unknown error: ${details.error}`);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error processing receipt chunk:', error);
            }
        }
    }
    catch (error) {
        console.error('Error validating receipts:', error);
    }
});
exports.validateReceipts = validateReceipts;
const sendNewConversationNotification = (userID, senderName, propertyTitle, messageText, conversationID) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = yield getPushTokens(userID);
        if (tokens.length === 0) {
            console.log('No push tokens found for user:', userID);
            return;
        }
        const messages = (0, exports.createMessages)(tokens, messageText, conversationID, senderName, propertyTitle);
        yield (0, exports.sendNotifications)(messages);
        console.log(`New conversation notification sent to user ${userID}`);
    }
    catch (error) {
        console.error('Error sending new conversation notification:', error);
    }
});
exports.sendNewConversationNotification = sendNewConversationNotification;
const sendMessageNotification = (userID, senderName, messageText, conversationID, propertyTitle) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = yield getPushTokens(userID);
        if (tokens.length === 0) {
            console.log('No push tokens found for user:', userID);
            return;
        }
        const messages = (0, exports.createMessages)(tokens, messageText, conversationID, senderName, propertyTitle);
        yield (0, exports.sendNotifications)(messages);
        console.log(`Message notification sent to user ${userID}`);
    }
    catch (error) {
        console.error('Error sending message notification:', error);
    }
});
exports.sendMessageNotification = sendMessageNotification;
const setupReceiptValidation = () => {
    setInterval(() => {
        (0, exports.validateReceipts)();
    }, 30 * 60 * 1000);
    console.log('Receipt validation scheduled every 30 minutes');
};
exports.setupReceiptValidation = setupReceiptValidation;
