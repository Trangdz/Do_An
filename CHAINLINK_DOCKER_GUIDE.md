# 🔗 Chainlink Docker Setup Guide

## 📋 Overview

This setup creates a complete Chainlink development environment with:
- **Ganache** local blockchain
- **2 Chainlink nodes** with independent PostgreSQL databases
- **Production-like** configuration for testing

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
# Windows: Docker Desktop
# Linux: docker.io + docker-compose
# macOS: Docker Desktop
```

### 2. Setup Directories
```bash
# Create required directories
mkdir -p node1/chainlink-data
mkdir -p node1/api
mkdir -p node1/password
mkdir -p node2/chainlink-data
mkdir -p node2/api
mkdir -p node2/password

# Copy environment files
cp chainlink-node1.env node1/.env
cp chainlink-node2.env node2/.env
```

### 3. Generate API Keys and Passwords
```bash
# Generate API key for Node 1
echo "your-api-key-here" > node1/api

# Generate API key for Node 2  
echo "your-api-key-here" > node2/api

# Generate password for Node 1
echo "your-password-here" > node1/password

# Generate password for Node 2
echo "your-password-here" > node2/password
```

### 4. Start Services
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🌐 Access Points

### Ganache Blockchain
- **RPC URL**: http://localhost:8545
- **Network ID**: 1337
- **Chain ID**: 1337
- **Accounts**: 10 accounts with 1000 ETH each

### Chainlink Node 1
- **Web UI**: http://localhost:6688
- **Database**: postgres1:5433
- **API**: http://localhost:6688/api

### Chainlink Node 2
- **Web UI**: http://localhost:6689
- **Database**: postgres2:5434
- **API**: http://localhost:6689/api

## 🔧 Configuration Details

### Network Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Ganache       │    │   Chainlink     │
│   (Blockchain)  │◄───┤   Node 1        │
│   Port: 8545    │    │   Port: 6688    │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL 1 │
                       │   Port: 5433   │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   Ganache       │    │   Chainlink     │
│   (Blockchain)  │◄───┤   Node 2        │
│   Port: 8545    │    │   Port: 6689    │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL 2 │
                       │   Port: 5434   │
                       └─────────────────┘
```

### Service Dependencies
1. **Ganache** starts first (blockchain)
2. **PostgreSQL** databases start
3. **Chainlink nodes** start after dependencies
4. **Database migrations** run automatically

## 🧪 Testing Smart Contracts

### 1. Deploy Oracle Contract
```bash
# Deploy your Oracle contract to Ganache
npx hardhat run scripts/deploy_production_oracle.cjs --network ganache
```

### 2. Configure Chainlink Nodes
```bash
# Add your Oracle contract address to Chainlink nodes
# Use the web UI at localhost:6688 and localhost:6689
```

### 3. Test Price Feeds
```bash
# Test Oracle contract with Chainlink nodes
node indexer/test-oracle-integration.cjs
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check if ports are in use
netstat -an | findstr :8545
netstat -an | findstr :6688
netstat -an | findstr :6689
netstat -an | findstr :5433
netstat -an | findstr :5434

# Kill processes using ports
taskkill /F /PID <PID>
```

#### 2. Volume Conflicts
```bash
# Clean up volumes
docker-compose down -v
docker volume prune

# Remove specific volumes
docker volume rm chainlink-local_postgres1_data
docker volume rm chainlink-local_postgres2_data
```

#### 3. Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres1
docker-compose logs postgres2

# Restart databases
docker-compose restart postgres1 postgres2
```

#### 4. Chainlink Node Issues
```bash
# Check Chainlink logs
docker-compose logs chainlink-node1
docker-compose logs chainlink-node2

# Restart nodes
docker-compose restart chainlink-node1 chainlink-node2
```

### Health Checks

#### Ganache Health
```bash
# Test Ganache connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### Chainlink Node Health
```bash
# Test Node 1
curl http://localhost:6688/health

# Test Node 2
curl http://localhost:6689/health
```

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ganache
docker-compose logs -f chainlink-node1
docker-compose logs -f chainlink-node2
```

### Check Status
```bash
# Service status
docker-compose ps

# Resource usage
docker stats
```

## 🛑 Cleanup

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Complete Cleanup
```bash
# Remove everything
docker-compose down -v
docker system prune -a
```

## 🎯 Production Notes

### Security Considerations
- **Change default passwords** in production
- **Use TLS** for database connections
- **Secure API keys** and passwords
- **Enable authentication** for web interfaces

### Performance Tuning
- **Increase memory** for PostgreSQL
- **Optimize Chainlink** configuration
- **Monitor resource usage**
- **Set up logging** aggregation

### Scaling
- **Add more Chainlink nodes** as needed
- **Use load balancers** for high availability
- **Implement monitoring** and alerting
- **Set up backups** for databases

## 🚀 Next Steps

1. **Deploy your Oracle contract** to Ganache
2. **Configure Chainlink nodes** with your contract
3. **Test price feeds** and data sources
4. **Integrate with your application**
5. **Scale to testnet/mainnet** when ready

## 📞 Support

For issues with this setup:
1. Check the troubleshooting section
2. Review Docker and Chainlink documentation
3. Check service logs for errors
4. Ensure all prerequisites are met





