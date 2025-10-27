#!/bin/bash

# Chainlink Docker Setup Script
echo "🔗 Setting up Chainlink Docker Environment..."

# Create directories
echo "📁 Creating directories..."
mkdir -p node1/chainlink-data
mkdir -p node1/api
mkdir -p node1/password
mkdir -p node2/chainlink-data
mkdir -p node2/api
mkdir -p node2/password

# Copy environment files
echo "📝 Setting up environment files..."
cp chainlink-node1.env node1/.env
cp chainlink-node2.env node2/.env

# Generate API keys and passwords
echo "🔑 Generating API keys and passwords..."
echo "node1-api-key-$(date +%s)" > node1/api
echo "node2-api-key-$(date +%s)" > node2/api
echo "node1-password-$(date +%s)" > node1/password
echo "node2-password-$(date +%s)" > node2/password

# Set permissions
chmod 600 node1/api node1/password
chmod 600 node2/api node2/password

echo "✅ Setup complete!"
echo ""
echo "🚀 To start services:"
echo "   docker-compose up -d"
echo ""
echo "🌐 Access points:"
echo "   Ganache: http://localhost:8545"
echo "   Chainlink Node 1: http://localhost:6688"
echo "   Chainlink Node 2: http://localhost:6689"
echo ""
echo "📊 Check status:"
echo "   docker-compose ps"
echo ""
echo "📋 View logs:"
echo "   docker-compose logs -f"





