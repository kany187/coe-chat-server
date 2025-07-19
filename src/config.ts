import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Django API Configuration
  django: {
    apiUrl: process.env.DJANGO_API_URL || 'http://localhost:8000',
    apiKey: process.env.DJANGO_API_KEY,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.ACCESS_TOKEN_SECRET || 'your-temporary-secret-key-for-testing',
  },

  // Frontend Configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER?.toLowerCase() || 'resend',
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@congo-estate.com',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@congo-estate.com',
    },
  },

  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER?.toLowerCase() || 'twilio',
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

  // Push Notification Configuration
  push: {
    provider: process.env.PUSH_PROVIDER?.toLowerCase() || 'firebase',
    firebase: {
      serverKey: process.env.FIREBASE_SERVER_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
    },
    expo: {
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    },
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
};

// Validation function to check required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'DJANGO_API_URL',
    'ACCESS_TOKEN_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing required environment variables:', missingVars);
    console.warn('Please check your .env file or environment configuration');
  }

  // Check email provider configuration
  if (config.email.provider === 'resend' && !config.email.resend.apiKey) {
    console.warn('⚠️  Resend API key not configured. Email notifications will be disabled.');
  } else if (config.email.provider === 'sendgrid' && !config.email.sendgrid.apiKey) {
    console.warn('⚠️  SendGrid API key not configured. Email notifications will be disabled.');
  }

  // Check SMS provider configuration
  if (config.sms.provider === 'twilio' && (!config.sms.twilio.accountSid || !config.sms.twilio.authToken)) {
    console.warn('⚠️  Twilio credentials not configured. SMS notifications will be disabled.');
  } else if (config.sms.provider === 'africastalking' && (!config.sms.africastalking.apiKey || !config.sms.africastalking.username)) {
    console.warn('⚠️  Africa\'s Talking credentials not configured. SMS notifications will be disabled.');
  }

  // Check push notification configuration
  if (config.push.provider === 'firebase' && !config.push.firebase.serverKey) {
    console.warn('⚠️  Firebase Server Key not configured. Push notifications will be disabled.');
  }
} 