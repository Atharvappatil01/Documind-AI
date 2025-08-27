#!/bin/bash

# DocuMind AI - Stop Script
echo "🛑 Stopping DocuMind AI..."

# Stop all containers
docker-compose down

echo "✅ DocuMind AI stopped successfully!"
echo ""
echo "To start again, run: ./start.sh"
echo "To remove all data, run: docker-compose down -v"
