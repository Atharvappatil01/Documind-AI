#!/bin/bash

# DocuMind AI - Production Deployment Script
echo "🚀 Deploying DocuMind AI to Production..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your GOOGLE_API_KEY"
    exit 1
fi

# Check if GOOGLE_API_KEY is set
if ! grep -q "GOOGLE_API_KEY=" .env || grep -q "GOOGLE_API_KEY=your_api_key_here" .env; then
    echo "❌ Please set your GOOGLE_API_KEY in the .env file"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🔧 Building and deploying services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ DocuMind AI deployed successfully!"
    echo ""
    echo "🌐 Application: http://localhost"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo ""
    echo "To stop the application, run: docker-compose -f docker-compose.prod.yml down"
    echo "To view logs, run: docker-compose -f docker-compose.prod.yml logs -f"
else
    echo "❌ Failed to deploy services. Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi
