"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    django: {
        apiUrl: process.env.DJANGO_API_URL || 'http://localhost:8000',
        apiKey: process.env.DJANGO_API_KEY,
    },
    jwt: {
        secret: process.env.ACCESS_TOKEN_SECRET || 'your-temporary-secret-key-for-testing',
    },
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    email: {
        provider: ((_a = process.env.EMAIL_PROVIDER) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'resend',
        resend: {
            apiKey: process.env.RESEND_API_KEY,
            fromEmail: process.env.FROM_EMAIL || 'noreply@congo-estate.com',
        },
        sendgrid: {
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: process.env.FROM_EMAIL || 'noreply@congo-estate.com',
        },
    },
    sms: {
        provider: ((_b = process.env.SMS_PROVIDER) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || 'twilio',
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
        africastalking: {
            apiKey: process.env.AFRICASTALKING_API_KEY,
            username: process.env.AFRICASTALKING_USERNAME,
            from: process.env.AFRICASTALKING_FROM || 'CongoEstate',
        },
    },
    push: {
        provider: ((_c = process.env.PUSH_PROVIDER) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || 'firebase',
        firebase: {
            serverKey: process.env.FIREBASE_SERVER_KEY,
            projectId: process.env.FIREBASE_PROJECT_ID,
        },
        expo: {
            accessToken: process.env.EXPO_ACCESS_TOKEN,
        },
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    server: {
        port: parseInt(process.env.PORT || '3000'),
        environment: process.env.NODE_ENV || 'development',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
};
function validateConfig() {
    const requiredVars = [
        'DJANGO_API_URL',
        'ACCESS_TOKEN_SECRET',
    ];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn('⚠️  Missing required environment variables:', missingVars);
        console.warn('Please check your .env file or environment configuration');
    }
    if (exports.config.email.provider === 'resend' && !exports.config.email.resend.apiKey) {
        console.warn('⚠️  Resend API key not configured. Email notifications will be disabled.');
    }
    else if (exports.config.email.provider === 'sendgrid' && !exports.config.email.sendgrid.apiKey) {
        console.warn('⚠️  SendGrid API key not configured. Email notifications will be disabled.');
    }
    if (exports.config.sms.provider === 'twilio' && (!exports.config.sms.twilio.accountSid || !exports.config.sms.twilio.authToken)) {
        console.warn('⚠️  Twilio credentials not configured. SMS notifications will be disabled.');
    }
    else if (exports.config.sms.provider === 'africastalking' && (!exports.config.sms.africastalking.apiKey || !exports.config.sms.africastalking.username)) {
        console.warn('⚠️  Africa\'s Talking credentials not configured. SMS notifications will be disabled.');
    }
    if (exports.config.push.provider === 'firebase' && !exports.config.push.firebase.serverKey) {
        console.warn('⚠️  Firebase Server Key not configured. Push notifications will be disabled.');
    }
}
