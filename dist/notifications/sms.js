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
exports.createSMSProvider = createSMSProvider;
exports.sendSMSNotification = sendSMSNotification;
class TwilioSMSProvider {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
        this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
        this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
    }
    sendSMS(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.accountSid || !this.authToken || !this.fromNumber) {
                    throw new Error('Twilio credentials not configured');
                }
                const auth = btoa(`${this.accountSid}:${this.authToken}`);
                const response = yield fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        To: data.to,
                        From: this.fromNumber,
                        Body: data.message,
                    }),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`SMS sending failed: ${error}`);
                }
                const result = yield response.json();
                return {
                    success: true,
                    messageId: result.sid,
                };
            }
            catch (error) {
                console.error('SMS sending error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
}
class AfricasTalkingSMSProvider {
    constructor() {
        this.apiKey = process.env.AFRICASTALKING_API_KEY || '';
        this.username = process.env.AFRICASTALKING_USERNAME || '';
        this.from = process.env.AFRICASTALKING_FROM || 'CongoEstate';
    }
    sendSMS(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (!this.apiKey || !this.username) {
                    throw new Error('Africa\'s Talking credentials not configured');
                }
                const response = yield fetch('https://api.africastalking.com/version1/messaging', {
                    method: 'POST',
                    headers: {
                        'apiKey': this.apiKey,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        username: this.username,
                        to: data.to,
                        from: this.from,
                        message: data.message,
                    }),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`SMS sending failed: ${error}`);
                }
                const result = yield response.json();
                return {
                    success: true,
                    messageId: (_c = (_b = (_a = result.SMSMessageData) === null || _a === void 0 ? void 0 : _a.Recipients) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.messageId,
                };
            }
            catch (error) {
                console.error('SMS sending error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
}
function createSMSProvider() {
    var _a;
    const provider = ((_a = process.env.SMS_PROVIDER) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'twilio';
    switch (provider) {
        case 'africastalking':
            return new AfricasTalkingSMSProvider();
        case 'twilio':
        default:
            return new TwilioSMSProvider();
    }
}
function sendSMSNotification(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = createSMSProvider();
        return provider.sendSMS(data);
    });
}
