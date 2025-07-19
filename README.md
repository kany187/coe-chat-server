# Congo Estate Chat Server

A real-time chat server for the Congo Estate platform that integrates with Django backend for comprehensive communication and notification capabilities.

## Features

- **Real-time Messaging**: WebSocket-based chat with Socket.IO
- **Django Integration**: Seamless integration with Django backend for data persistence
- **Multi-channel Notifications**: Email, SMS, and Push notifications
- **Authentication**: JWT-based authentication with Django backend
- **Message Persistence**: All messages saved to Django database
- **Conversation Management**: Create and manage property-related conversations
- **Read Receipts**: Track message read status

## Architecture

This chat server is designed to work alongside a Django backend, leveraging the strengths of both platforms:

- **Django**: Business logic, data persistence, user management, authentication
- **Node.js**: Real-time communication, WebSocket handling, notification delivery

## Prerequisites

- Node.js 18+
- TypeScript
- Django backend with REST API
- PostgreSQL (or your preferred database)
- Email service (Resend, SendGrid, etc.)
- SMS service (Twilio, Africa's Talking, etc.)
- Push notification service (Firebase, Expo, etc.)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd congo-estate-chat-server
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Configure environment variables (see Configuration section)

5. Build the project:

```bash
npm run build
```

6. Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Configuration

Create a `.env` file with the following variables:

### Required Configuration

```env
# Django API Configuration
DJANGO_API_URL=http://localhost:8000
DJANGO_API_KEY=your-django-api-key-here

# JWT Configuration
ACCESS_TOKEN_SECRET=your-jwt-secret-key-here

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### Email Configuration

```env
# Choose provider: resend or sendgrid
EMAIL_PROVIDER=resend

# For Resend
RESEND_API_KEY=your-resend-api-key-here

# For SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key-here

# From email address
FROM_EMAIL=noreply@congo-estate.com
```

### SMS Configuration

```env
# Choose provider: twilio or africastalking
SMS_PROVIDER=twilio

# For Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890

# For Africa's Talking
AFRICASTALKING_API_KEY=your-africastalking-api-key
AFRICASTALKING_USERNAME=your-africastalking-username
AFRICASTALKING_FROM=CongoEstate
```

### Push Notification Configuration

```env
# Choose provider: firebase or expo
PUSH_PROVIDER=firebase

# For Firebase
FIREBASE_SERVER_KEY=your-firebase-server-key
FIREBASE_PROJECT_ID=your-firebase-project-id

# For Expo
EXPO_ACCESS_TOKEN=your-expo-access-token
```

### Server Configuration

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Django API Endpoints

The chat server expects the following Django API endpoints:

### Authentication

- `POST /api/auth/verify-token/` - Verify JWT token

### Users

- `GET /api/users/{id}/` - Get user details
- `GET /api/users/{id}/notification-preferences/` - Get user notification preferences
- `GET /api/users/{id}/push-tokens/` - Get user push tokens
- `GET /api/users/{id}/conversations/` - Get user conversations

### Conversations

- `GET /api/conversations/{id}/` - Get conversation details
- `POST /api/conversations/` - Create new conversation
- `GET /api/conversations/{id}/participants/` - Get conversation participants

### Messages

- `POST /api/messages/` - Save new message
- `PATCH /api/messages/{id}/mark-read/` - Mark message as read

## Socket.IO Events

### Client to Server

#### Authentication

- `connect` with `accessToken` in auth

#### Messaging

- `sendMessage` - Send a message
  ```typescript
  {
    senderID: number;
    receiverID: number;
    conversationID: number;
    text: string;
    senderName: string;
  }
  ```

#### Conversation Management

- `getConversations` - Get user's conversations
- `createConversation` - Create new conversation
  ```typescript
  {
    propertyId: number;
    buyerId: number;
    sellerId: number;
  }
  ```

#### Message Management

- `markMessageAsRead` - Mark message as read
  ```typescript
  {
    messageId: number;
  }
  ```

### Server to Client

#### Authentication

- `session` - Session established
  ```typescript
  {
    sessionID: string;
  }
  ```

#### Messaging

- `getMessage` - Receive new message
  ```typescript
  {
    senderID: number;
    text: string;
    senderName: string;
    conversationID: number;
    messageId: number;
    timestamp: string;
  }
  ```
- `messageSent` - Message sent confirmation
- `error` - Error message

#### Conversation Management

- `conversationsList` - List of user conversations
- `conversationCreated` - New conversation created

#### Message Management

- `messageMarkedAsRead` - Message marked as read confirmation

## Notification System

The chat server supports three types of notifications:

### 1. Push Notifications

- Real-time notifications for mobile and web apps
- Supports Firebase Cloud Messaging and Expo
- Configurable per user

### 2. Email Notifications

- HTML email templates
- Supports Resend and SendGrid
- Includes conversation links

### 3. SMS Notifications

- Text message notifications
- Supports Twilio and Africa's Talking
- Configurable message templates

## Usage Examples

### Frontend Integration (JavaScript/TypeScript)

```typescript
import { io } from "socket.io-client";

// Connect to chat server
const socket = io("http://localhost:3000", {
  auth: {
    accessToken: "your-jwt-token-from-django",
  },
});

// Listen for messages
socket.on("getMessage", (message) => {
  console.log("New message:", message);
});

// Send a message
socket.emit("sendMessage", {
  senderID: 1,
  receiverID: 2,
  conversationID: 123,
  text: "Hello! I'm interested in this property.",
  senderName: "John Doe",
});

// Get conversations
socket.emit("getConversations");
socket.on("conversationsList", (conversations) => {
  console.log("Conversations:", conversations);
});

// Create new conversation
socket.emit("createConversation", {
  propertyId: 456,
  buyerId: 1,
  sellerId: 2,
});
```

### Django Integration

The Django backend should implement the required API endpoints and models:

```python
# models.py
class Conversation(models.Model):
    property = models.ForeignKey('Property', on_delete=models.CASCADE)
    buyer = models.ForeignKey('User', on_delete=models.CASCADE, related_name='buyer_conversations')
    seller = models.ForeignKey('User', on_delete=models.CASCADE, related_name='seller_conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    sender = models.ForeignKey('User', on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

class PushToken(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    token = models.CharField(max_length=255)
    device_type = models.CharField(max_length=20, choices=[
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('web', 'Web')
    ])
    created_at = models.DateTimeField(auto_now_add=True)
```

## Development

### Project Structure

```
src/
├── config.ts              # Configuration management
├── index.ts               # Main server file
├── types.ts               # TypeScript type definitions
├── db/
│   └── index.ts           # Database connection (legacy)
├── django/
│   └── client.ts          # Django API client
└── notifications/
    ├── index.ts           # Main notification orchestrator
    ├── types.ts           # Notification type definitions
    ├── email.ts           # Email notification service
    ├── sms.ts             # SMS notification service
    └── push.ts            # Push notification service
```

### Adding New Notification Providers

1. Create a new provider class implementing the provider interface
2. Add configuration options to `config.ts`
3. Update the factory function in the respective service file
4. Add environment variables to `.env.example`

### Testing

```bash
# Run in development mode
npm run dev

# Build and run in production
npm run build
npm start
```

## Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables

Set all required environment variables in your deployment environment:

```bash
# Production example
DJANGO_API_URL=https://api.congo-estate.com
DJANGO_API_KEY=your-production-api-key
ACCESS_TOKEN_SECRET=your-production-jwt-secret
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-production-resend-key
# ... other variables
```

## Troubleshooting

### Common Issues

1. **Connection refused to Django API**

   - Check `DJANGO_API_URL` is correct
   - Verify Django server is running
   - Check CORS settings in Django

2. **JWT verification fails**

   - Ensure `ACCESS_TOKEN_SECRET` matches Django's secret
   - Verify token format and expiration

3. **Notifications not sending**

   - Check provider API keys are configured
   - Verify user notification preferences
   - Check provider-specific error logs

4. **Messages not persisting**
   - Verify Django API endpoints are working
   - Check database connection
   - Review Django API logs

### Logs

The server provides detailed logging for debugging:

- Connection events
- Message processing
- Notification delivery
- Error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
