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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.createMessages = createMessages;
exports.sendNotifications = sendNotifications;
exports.sendAppointmentNotification = sendAppointmentNotification;
const push_1 = require("./push");
const email_1 = require("./email");
const sms_1 = require("./sms");
const client_1 = require("../django/client");
__exportStar(require("./push"), exports);
__exportStar(require("./email"), exports);
__exportStar(require("./sms"), exports);
__exportStar(require("./types"), exports);
function createMessages(tokens, messageText, conversationId, senderName, propertyTitle) {
    const title = `New message from ${senderName}`;
    const body = messageText.length > 100
        ? `${messageText.substring(0, 100)}...`
        : messageText;
    return tokens.map(token => ({
        token,
        title,
        body,
        data: {
            conversationId: conversationId.toString(),
            senderName,
            type: 'message',
            propertyTitle: propertyTitle || ''
        }
    }));
}
function sendNotifications(messages_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (messages, userId, notificationType = 'message', userPreferences) {
        try {
            if (messages.length > 0) {
                yield (0, push_1.sendBatchPushNotifications)(messages);
            }
            if ((userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.emailEnabled) && messages.length > 0) {
                const message = messages[0];
                yield (0, email_1.sendEmailNotification)({
                    to: userPreferences.email,
                    subject: message.title,
                    content: message.body,
                    senderName: message.data.senderName,
                    conversationId: parseInt(message.data.conversationId),
                    propertyTitle: message.data.propertyTitle
                });
            }
            if ((userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.smsEnabled) && userPreferences.phoneNumber && messages.length > 0) {
                const message = messages[0];
                yield (0, sms_1.sendSMSNotification)({
                    to: userPreferences.phoneNumber,
                    message: `${message.title}: ${message.body}`,
                    senderName: message.data.senderName,
                    conversationId: parseInt(message.data.conversationId)
                });
            }
        }
        catch (error) {
            console.error('Error sending notifications:', error);
        }
    });
}
function sendAppointmentNotification(userId, senderName, propertyTitle, appointmentDate, conversationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokens = yield (0, push_1.getPushTokens)(userId);
            const userPreferences = yield getUserNotificationPreferences(userId);
            if (tokens && tokens.length > 0) {
                const messages = tokens.map(token => ({
                    token,
                    title: `Appointment scheduled for ${propertyTitle}`,
                    body: `${senderName} scheduled an appointment for ${appointmentDate}`,
                    data: {
                        conversationId: conversationId.toString(),
                        senderName,
                        type: 'appointment',
                        propertyTitle,
                        appointmentDate
                    }
                }));
                yield sendNotifications(messages, userId, 'appointment', userPreferences);
            }
        }
        catch (error) {
            console.error('Error sending appointment notification:', error);
        }
    });
}
function getUserNotificationPreferences(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const preferences = yield client_1.djangoClient.getNotificationPreferences(userId);
            return {
                userId: preferences.user_id,
                email: preferences.email,
                phoneNumber: preferences.phone_number,
                pushEnabled: preferences.push_enabled,
                emailEnabled: preferences.email_enabled,
                smsEnabled: preferences.sms_enabled,
                quietHoursStart: preferences.quiet_hours_start,
                quietHoursEnd: preferences.quiet_hours_end,
                timezone: preferences.timezone,
            };
        }
        catch (error) {
            console.error('Error fetching user preferences:', error);
            return undefined;
        }
    });
}
