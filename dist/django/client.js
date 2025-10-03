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
exports.djangoClient = void 0;
class DjangoAPIClient {
    constructor() {
        this.baseURL = process.env.DJANGO_API_URL || 'http://localhost:8000';
        this.apiKey = process.env.DJANGO_API_KEY;
    }
    makeRequest(endpoint_1) {
        return __awaiter(this, arguments, void 0, function* (endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
            if (this.apiKey) {
                headers['Authorization'] = `JWT ${this.apiKey}`;
            }
            const response = yield fetch(url, Object.assign(Object.assign({}, options), { headers }));
            if (!response.ok) {
                throw new Error(`Django API error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        });
    }
    verifyToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest('/api/auth/verify-token/', {
                method: 'POST',
                body: JSON.stringify({ token }),
            });
        });
    }
    getUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/users/${userId}/`);
        });
    }
    getConversation(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/conversations/${conversationId}/`);
        });
    }
    saveMessage(messageData) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest('/api/messages/', {
                method: 'POST',
                body: JSON.stringify(messageData),
            });
        });
    }
    getNotificationPreferences(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/users/${userId}/notification-preferences/`);
        });
    }
    getPushTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/users/${userId}/push-tokens/`);
        });
    }
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.makeRequest(`/api/messages/${messageId}/mark-read/`, {
                method: 'PATCH',
            });
        });
    }
    getConversationParticipants(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/conversations/${conversationId}/participants/`);
        });
    }
    canSendMessage(userId, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversation = yield this.getConversation(conversationId);
                return conversation.tenantID === userId || conversation.ownerID === userId;
            }
            catch (error) {
                console.error('Error checking message permission:', error);
                return false;
            }
        });
    }
    getUserConversations(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(`/api/users/${userId}/conversations/`);
        });
    }
    createConversation(conversationData) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest('/api/conversations/', {
                method: 'POST',
                body: JSON.stringify(conversationData),
            });
        });
    }
}
exports.djangoClient = new DjangoAPIClient();
exports.default = exports.djangoClient;
