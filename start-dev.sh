#!/bin/bash

# Congo Estate Chat Server - Development Startup Script
echo "🚀 Starting Congo Estate Chat Server in Development Mode..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please update the values as needed."
    else
        echo "❌ No .env.example file found. Please create a .env file manually."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Start the development server
echo "🚀 Starting development server..."
echo "📱 Chat Server will be available at: http://localhost:3000"
echo "🏥 Health check available at: http://localhost:3000/health"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

npm run dev
