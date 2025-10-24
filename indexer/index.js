const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

class LendHubIndexer {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.poolAddress = process.env.LENDING_POOL_ADDRESS;
    this.oracleAddress = process.env.ORACLE_ADDRESS;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;
  }

  async start() {
    try {
      console.log('🚀 Starting LendHub Indexer...');
      console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
      console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
      console.log(`🏦 Pool Address: ${process.env.LENDING_POOL_ADDRESS}`);
      console.log(`💰 Oracle Address: ${process.env.ORACLE_ADDRESS}`);
      
      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB Local');

      // Create indexes
      await this.createIndexes();
      console.log('✅ Created indexes');

      // Start indexing
      await this.indexFromLatestBlock();
      console.log('✅ Started indexing');

      this.isRunning = true;

      // Listen for new blocks
      this.provider.on('block', (blockNumber) => {
        if (this.isRunning) {
          console.log(`📦 New block: ${blockNumber}`);
          this.indexBlock(blockNumber);
        }
      });

      // Keep alive heartbeat
      setInterval(() => {
        if (this.isRunning) {
          console.log('💓 Indexer heartbeat...');
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Indexer error:', error);
      await this.handleError(error);
    }
  }

  async createIndexes() {
    try {
      console.log('🔧 Creating database indexes...');
      
      // Transactions indexes
      await this.db.collection('transactions').createIndex({ hash: 1 }, { unique: true });
      await this.db.collection('transactions').createIndex({ user: 1, timestamp: -1 });
      await this.db.collection('transactions').createIndex({ type: 1, timestamp: -1 });
      await this.db.collection('transactions').createIndex({ 'asset.symbol': 1 });
      await this.db.collection('transactions').createIndex({ blockNumber: 1 });

      // Users indexes
      await this.db.collection('users').createIndex({ address: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ 'profile.name': 1 });

      // Assets indexes
      await this.db.collection('assets').createIndex({ address: 1 }, { unique: true });
      await this.db.collection('assets').createIndex({ symbol: 1 });

      // Metadata indexes
      await this.db.collection('metadata').createIndex({ key: 1 }, { unique: true });

      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  async indexFromLatestBlock() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const lastIndexed = await this.getLastIndexedBlock();
      const fromBlock = lastIndexed + 1;
      
      console.log(`🔍 Indexing blocks ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock + 1} blocks)`);
      
      if (fromBlock <= currentBlock) {
        for (let block = fromBlock; block <= currentBlock; block++) {
          await this.indexBlock(block);
          // Small delay to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('✅ Initial indexing completed');
    } catch (error) {
      console.error('❌ Error indexing from latest block:', error);
      throw error;
    }
  }

  async indexBlock(blockNumber) {
    try {
      const pool = new ethers.Contract(this.poolAddress, this.getPoolABI(), this.provider);
      
      // Get all events from this block with error handling
      const [suppliedEvents, withdrawnEvents, borrowedEvents, repaidEvents, liquidatedEvents] = await Promise.all([
        pool.queryFilter('Supplied', blockNumber, blockNumber).catch(err => {
          console.warn(`⚠️ Failed to fetch Supplied events for block ${blockNumber}:`, err.message);
          return [];
        }),
        pool.queryFilter('Withdrawn', blockNumber, blockNumber).catch(err => {
          console.warn(`⚠️ Failed to fetch Withdrawn events for block ${blockNumber}:`, err.message);
          return [];
        }),
        pool.queryFilter('Borrowed', blockNumber, blockNumber).catch(err => {
          console.warn(`⚠️ Failed to fetch Borrowed events for block ${blockNumber}:`, err.message);
          return [];
        }),
        pool.queryFilter('Repaid', blockNumber, blockNumber).catch(err => {
          console.warn(`⚠️ Failed to fetch Repaid events for block ${blockNumber}:`, err.message);
          return [];
        }),
        pool.queryFilter('Liquidated', blockNumber, blockNumber).catch(err => {
          console.warn(`⚠️ Failed to fetch Liquidated events for block ${blockNumber}:`, err.message);
          return [];
        }),
      ]);

      const allEvents = [...suppliedEvents, ...withdrawnEvents, ...borrowedEvents, ...repaidEvents, ...liquidatedEvents];
      
      if (allEvents.length > 0) {
        console.log(`📈 Found ${allEvents.length} events in block ${blockNumber}`);
        
        for (const event of allEvents) {
          await this.processEvent(event);
        }
      }

      // Update last indexed block
      await this.updateLastIndexedBlock(blockNumber);
      
    } catch (error) {
      console.error(`❌ Error indexing block ${blockNumber}:`, error);
      await this.handleError(error);
    }
  }

  async processEvent(event) {
    try {
      const transaction = {
        hash: event.transactionHash,
        user: event.args.user,
        asset: {
          address: event.args.asset,
          symbol: await this.getAssetSymbol(event.args.asset),
          decimals: await this.getAssetDecimals(event.args.asset)
        },
        amount: ethers.formatUnits(event.args.amount, 18),
        amountUSD: await this.calculateUSD(event.args.amount, event.args.asset),
        type: this.getEventType(event),
        timestamp: Date.now(),
        blockNumber: event.blockNumber,
        gas: await this.getGasInfo(event.transactionHash),
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert transaction
      await this.db.collection('transactions').insertOne(transaction);
      console.log(`✅ Indexed ${transaction.type} transaction: ${transaction.hash.slice(0, 10)}...`);
      console.log(`   📊 Amount: ${transaction.amount} ${transaction.asset.symbol}`);
      console.log(`   💰 USD Value: $${transaction.amountUSD}`);
      console.log(`   👤 User: ${transaction.user}`);
      
      // Update user stats
      await this.updateUserStats(transaction.user, transaction);
      
      // Update asset stats
      await this.updateAssetStats(transaction.asset.address, transaction);
      
    } catch (error) {
      console.error('❌ Error processing event:', error);
      await this.handleError(error);
    }
  }

  getPoolABI() {
    return [
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
      'event ReserveDataUpdated(address indexed asset, uint256 liquidityRate, uint256 borrowRate, uint256 timestamp)',
      'event CollateralEnabled(address indexed user, address indexed asset)',
      'event CollateralDisabled(address indexed user, address indexed asset)',
      'event Liquidated(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
      'event CollateralSet(address indexed user, address indexed asset, bool useAsCollateral)'
    ];
  }

  getEventType(event) {
    console.log(`🔍 Event name: ${event.event}`);
    const eventMap = {
      'Supplied': 'Lend',
      'Withdrawn': 'Withdraw', 
      'Borrowed': 'Borrow',
      'Repaid': 'Repay',
      'Liquidated': 'Liquidate'
    };
    const eventType = eventMap[event.event] || 'Unknown';
    console.log(`📝 Mapped to: ${eventType}`);
    return eventType;
  }

  async getAssetSymbol(assetAddress) {
    try {
      // Hardcoded symbols for known assets
      const knownAssets = {
        '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 'USDC',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'WETH',
        '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 'DAI',
        '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 'WETH'
      };
      
      if (knownAssets[assetAddress]) {
        return knownAssets[assetAddress];
      }
      
      const tokenContract = new ethers.Contract(assetAddress, ['function symbol() view returns (string)'], this.provider);
      return await tokenContract.symbol();
    } catch (error) {
      console.warn(`⚠️ Failed to get symbol for asset ${assetAddress}:`, error.message);
      return 'UNKNOWN';
    }
  }

  async getAssetDecimals(assetAddress) {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ['function decimals() view returns (uint8)'], this.provider);
      return await tokenContract.decimals();
    } catch (error) {
      console.warn(`⚠️ Failed to get decimals for asset ${assetAddress}:`, error.message);
      return 18;
    }
  }

  async calculateUSD(amount, assetAddress) {
    try {
      // Hardcoded prices for known assets (in USD)
      const knownPrices = {
        '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 1.0,  // USDC
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 2000.0,  // WETH
        '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 1.0,  // DAI
        '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 2000.0   // WETH
      };
      
      if (knownPrices[assetAddress]) {
        const amountFloat = parseFloat(ethers.formatUnits(amount, 18));
        const usdValue = amountFloat * knownPrices[assetAddress];
        console.log(`💰 Calculated USD: ${amountFloat} * ${knownPrices[assetAddress]} = $${usdValue}`);
        return usdValue;
      }
      
      // Default estimation for unknown assets
      const amountFloat = parseFloat(ethers.formatUnits(amount, 18));
      const estimatedValue = amountFloat * 100; // Default estimation
      console.log(`💰 Estimated USD: ${amountFloat} * 100 = $${estimatedValue}`);
      return estimatedValue;
    } catch (error) {
      console.warn(`⚠️ Failed to calculate USD for asset ${assetAddress}:`, error.message);
      // Return estimated value based on amount
      const amountFloat = parseFloat(ethers.formatUnits(amount, 18));
      return amountFloat * 100; // Default estimation
    }
  }

  async getGasInfo(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return {
        used: receipt.gasUsed.toString(),
        price: tx.gasPrice.toString(),
        fee: ethers.formatEther(receipt.gasUsed * tx.gasPrice)
      };
    } catch (error) {
      console.warn(`⚠️ Failed to get gas info for tx ${txHash}:`, error.message);
      return { used: '0', price: '0', fee: '0' };
    }
  }

  async updateUserStats(userAddress, transaction) {
    try {
      await this.db.collection('users').updateOne(
        { address: userAddress },
        {
          $set: {
            address: userAddress,
            lastActivity: new Date(),
            updatedAt: new Date()
          },
          $inc: {
            totalTransactions: 1,
            totalVolume: transaction.amountUSD
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
    }
  }

  async updateAssetStats(assetAddress, transaction) {
    try {
      await this.db.collection('assets').updateOne(
        { address: assetAddress },
        {
          $set: {
            address: assetAddress,
            symbol: transaction.asset.symbol,
            decimals: transaction.asset.decimals,
            updatedAt: new Date()
          },
          $inc: {
            totalTransactions: 1,
            totalVolume: transaction.amountUSD
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating asset stats:', error);
    }
  }

  async getLastIndexedBlock() {
    try {
      const result = await this.db.collection('metadata').findOne({ key: 'lastIndexedBlock' });
      return result ? result.value : 0;
    } catch (error) {
      console.warn('⚠️ Failed to get last indexed block:', error.message);
      return 0;
    }
  }

  async updateLastIndexedBlock(blockNumber) {
    try {
      await this.db.collection('metadata').updateOne(
        { key: 'lastIndexedBlock' },
        { 
          $set: { 
            value: blockNumber, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating last indexed block:', error);
    }
  }

  async handleError(error) {
    this.retryCount++;
    console.error(`❌ Error occurred (${this.retryCount}/${this.maxRetries}):`, error.message);
    
    if (this.retryCount < this.maxRetries) {
      console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      this.retryDelay *= 2; // Exponential backoff
    } else {
      console.error('❌ Max retries exceeded. Stopping indexer.');
      this.isRunning = false;
      process.exit(1);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.client.close();
    console.log('🛑 Indexer stopped');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down indexer...');
  await indexer.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down indexer...');
  await indexer.stop();
  process.exit(0);
});

// Start indexer
const indexer = new LendHubIndexer();
indexer.start().catch(console.error);

