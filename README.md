# Congo Estate Chat Server

A real-time chat server for the Congo Estate marketplace, built with Node.js, TypeScript, and Socket.IO.

## 🚀 Quick Start

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### Docker Mode

```bash
docker-compose up -d
```

## 📁 Project Structure

```
congo-estate-chat-server/
├── src/                    # TypeScript source code
├── dist/                   # Compiled JavaScript
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose (production)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── start-dev.sh           # Development startup script
├── start-prod.sh          # Production startup script
└── README.md              # This file
```

## 🔧 Configuration

The server uses environment variables for configuration. Create a `.env` file:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
PGHOST=127.0.0.1
PGUSER=kany
PGPASSWORD=root
PGDATABASE=coe_db
PGPORT=5432

# Django API Configuration
DJANGO_API_URL=http://localhost:8000
DJANGO_API_KEY=your-django-api-key

# Frontend Configuration
FRONTEND_URL=http://localhost:19000
CORS_ORIGIN=http://localhost:19000
```

## 🏥 Health Checks

- **Server Health**: `http://localhost:3000/health`
- **Database Health**: `http://localhost:3000/health/db`

## 🚀 Deployment

### Direct Deployment

```bash
./start-prod.sh
```

### Docker Deployment

```bash
docker-compose up -d
```

### Integration with Backend

The chat server is designed to integrate with your existing Django backend infrastructure. It shares the same PostgreSQL database and Redis cache.

## 📱 Socket.IO Events

### Client to Server

- `sendMessage` - Send a message
- `getConversations` - Get user conversations
- `createConversation` - Create new conversation
- `markMessageAsRead` - Mark message as read

### Server to Client

- `getMessage` - Receive new message
- `messageSent` - Message sent confirmation
- `conversationsList` - List of conversations
- `error` - Error messages

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📊 Features

- **Real-time Messaging**: WebSocket-based chat with Socket.IO
- **Django Integration**: Seamless integration with Django backend
- **Database Persistence**: All messages saved to PostgreSQL
- **Health Monitoring**: Built-in health check endpoints
- **Docker Support**: Easy deployment with Docker
- **TypeScript**: Full TypeScript support for type safety
