#!/bin/bash

# Congo Estate Chat Server - Production Startup Script
echo "🚀 Starting Congo Estate Chat Server in Production Mode..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your production settings."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing production dependencies..."
    npm ci --only=production
fi

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Start the production server
echo "🚀 Starting production server..."
echo "📱 Chat Server will be available at: http://localhost:3000"
echo "🏥 Health check available at: http://localhost:3000/health"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

npm start
