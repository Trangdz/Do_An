const { MongoClient } = require('mongodb');
const CoinGeckoPriceService = require('./coingecko-price-service.cjs');
require('dotenv').config({ path: './config.env' });

class RealtimePriceUpdater {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.priceService = new CoinGeckoPriceService();
    this.isRunning = false;
    this.updateInterval = 10000; // 10 seconds for more frequent updates
    this.assetAddresses = [
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472', // USDC
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WETH
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254', // DAI
      '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5'  // WETH
    ];
    this.currentPrices = {};
  }

  async start() {
    try {
      console.log('🚀 Starting Realtime Price Updater...');
      
      // Connect to database
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB');
      
      this.isRunning = true;
      
      // Initial price fetch
      await this.updateAllPrices();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      console.log('✅ Realtime price updater started');
      console.log(`⏰ Update interval: ${this.updateInterval / 1000} seconds`);
      console.log('🔄 Prices will update every 10 seconds for real-time changes');
      
    } catch (error) {
      console.error('❌ Error starting price updater:', error);
    }
  }

  async updateAllPrices() {
    try {
      console.log('🔄 Updating all asset prices...');
      
      // Get prices from CoinGecko
      const prices = await this.priceService.getMultiplePrices(this.assetAddresses);
      
      // Update database with new prices
      for (const [assetAddress, price] of Object.entries(prices)) {
        if (price) {
          this.currentPrices[assetAddress] = price;
          
          // Update asset collection
          await this.db.collection('assets').updateOne(
            { address: assetAddress },
            {
              $set: {
                address: assetAddress,
                currentPrice: price,
                lastUpdated: new Date(),
                priceSource: 'coingecko'
              }
            },
            { upsert: true }
          );
          
          // Check for price change
          const previousPrice = this.currentPrices[assetAddress];
          const change = previousPrice ? ((price - previousPrice) / previousPrice * 100) : 0;
          const changeSymbol = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
          
          console.log(`💰 Updated ${assetAddress}: $${price} ${changeSymbol} ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
        }
      }
      
      // Update metadata
      await this.db.collection('metadata').updateOne(
        { _id: 'priceUpdate' },
        {
          $set: {
            _id: 'priceUpdate',
            lastUpdate: new Date(),
            prices: this.currentPrices,
            updateCount: { $inc: 1 }
          }
        },
        { upsert: true }
      );
      
      console.log('✅ Price update completed');
      
    } catch (error) {
      console.error('❌ Error updating prices:', error);
    }
  }

  startPeriodicUpdates() {
    setInterval(async () => {
      if (this.isRunning) {
        console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Updating prices...`);
        await this.updateAllPrices();
      }
    }, this.updateInterval);
  }

  async stop() {
    console.log('🛑 Stopping price updater...');
    this.isRunning = false;
    if (this.client) {
      await this.client.close();
    }
    console.log('✅ Price updater stopped');
  }

  getCurrentPrices() {
    return this.currentPrices;
  }

  async getPriceHistory(assetAddress, hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const history = await this.db.collection('priceHistory').find({
        assetAddress: assetAddress,
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 }).toArray();
      
      return history;
    } catch (error) {
      console.error('❌ Error getting price history:', error);
      return [];
    }
  }

  async savePriceHistory(assetAddress, price) {
    try {
      await this.db.collection('priceHistory').insertOne({
        assetAddress: assetAddress,
        price: price,
        timestamp: new Date(),
        source: 'coingecko'
      });
    } catch (error) {
      console.error('❌ Error saving price history:', error);
    }
  }
}

// Start the updater if run directly
if (require.main === module) {
  const updater = new RealtimePriceUpdater();
  
  updater.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await updater.stop();
    process.exit(0);
  });
}

module.exports = RealtimePriceUpdater;
