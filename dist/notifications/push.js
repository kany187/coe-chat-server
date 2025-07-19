"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createPushProvider = createPushProvider;
exports.sendPushNotification = sendPushNotification;
exports.sendBatchPushNotifications = sendBatchPushNotifications;
exports.getPushTokens = getPushTokens;
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
            const { djangoClient } = yield Promise.resolve().then(() => __importStar(require('../django/client')));
            const tokens = yield djangoClient.getPushTokens(userId);
            return tokens.map(token => token.token);
        }
        catch (error) {
            console.error('Error fetching push tokens:', error);
            return [];
        }
    });
}
