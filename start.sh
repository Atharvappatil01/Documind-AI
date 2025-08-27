#!/bin/bash

# DocuMind AI - Docker Startup Script
echo "🚀 Starting DocuMind AI..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env from template. Please edit .env and add your GOOGLE_API_KEY"
        echo "   Then run this script again."
        exit 1
    else
        echo "❌ No .env file or env.example template found."
        echo "   Please create a .env file with your GOOGLE_API_KEY"
        exit 1
    fi
fi

# Check if GOOGLE_API_KEY is set
if ! grep -q "GOOGLE_API_KEY=" .env || grep -q "GOOGLE_API_KEY=your_api_key_here" .env; then
    echo "❌ Please set your GOOGLE_API_KEY in the .env file"
    echo "   Example: GOOGLE_API_KEY=your_actual_api_key_here"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

echo "🔧 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ DocuMind AI is running!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo ""
    echo "To stop the application, run: docker-compose down"
    echo "To view logs, run: docker-compose logs -f"
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi
