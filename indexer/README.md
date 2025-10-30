# LendHub Indexer

MongoDB indexer for LendHub v2 blockchain events monitoring.

## 🚀 Features

- **Real-time indexing**: Monitors blockchain events in real-time
- **MongoDB Atlas integration**: Stores data in cloud database
- **Error handling**: Robust error handling with retry mechanisms
- **Performance optimized**: Efficient indexing with proper database indexes
- **Scalable**: Handles high-volume transaction processing

## 📋 Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Ganache blockchain running
- LendHub contracts deployed

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `config.env` and update with your values:

```bash
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lendhub?retryWrites=true&w=majority

# Blockchain Configuration
RPC_URL=http://localhost:8545
LENDING_POOL_ADDRESS=0x... # Your LendingPool contract address
ORACLE_ADDRESS=0x... # Your PriceOracle contract address

# Indexer Configuration
INDEXER_INTERVAL=5000
BATCH_SIZE=100
MAX_RETRIES=3
RETRY_DELAY=1000
```

### 3. Test Connection

```bash
npm test
```

### 4. Start Indexer

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 Database Schema

### Collections

- **transactions**: Blockchain transaction events
- **users**: User statistics and profiles
- **assets**: Token information and market data
- **metadata**: Indexer state and configuration

### Indexes

- Unique indexes on transaction hash and user address
- Compound indexes for efficient querying
- Time-based indexes for analytics

## 🔍 Monitoring

The indexer provides detailed logging:

- ✅ Successful operations
- ⚠️ Warnings for non-critical issues
- ❌ Errors with retry attempts
- 📊 Performance metrics

## 🛠️ Troubleshooting

### Common Issues

1. **Connection failed**: Check MongoDB URI and network access
2. **RPC errors**: Verify Ganache is running and accessible
3. **Contract errors**: Ensure contract addresses are correct
4. **Memory issues**: Adjust batch size and retry settings

### Logs

Check console output for detailed error messages and status updates.

## 📈 Performance

- **Indexing speed**: ~100-500 transactions per minute
- **Memory usage**: ~50-100MB typical
- **Database size**: Grows with transaction volume
- **Query performance**: Optimized with proper indexes

## 🔄 Maintenance

- Monitor database size and performance
- Update contract addresses when redeploying
- Backup metadata collection regularly
- Monitor error rates and retry patterns














