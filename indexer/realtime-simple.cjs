const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: './config.env' });

class SimpleRealtimeUpdater {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.isRunning = false;
    this.updateInterval = 60000; // 60 seconds to avoid rate limiting
    this.currentPrices = {};
    
    this.assets = [
      { address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472', symbol: 'USDC', coingecko: 'usd-coin' },
      { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WETH', coingecko: 'weth' },
      { address: '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254', symbol: 'DAI', coingecko: 'dai' }
    ];
  }

  async start() {
    try {
      console.log('🚀 Starting Simple Real-time Price Updater...');
      
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB');
      
      this.isRunning = true;
      
      // Initial update
      await this.updatePrices();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      console.log('✅ Simple real-time updater started');
      console.log(`⏰ Update interval: ${this.updateInterval / 1000} seconds`);
      
    } catch (error) {
      console.error('❌ Error starting updater:', error);
    }
  }

  async updatePrices() {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Updating prices...`);
      
      for (const asset of this.assets) {
        try {
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.coingecko}&vs_currencies=usd`, {
            timeout: 10000,
            headers: {
              'User-Agent': 'LendHub-PriceUpdater/1.0'
            }
          });
          
          const price = response.data[asset.coingecko]?.usd;
          if (price) {
            // Check for price change
            const previousPrice = this.currentPrices[asset.address];
            const change = previousPrice ? ((price - previousPrice) / previousPrice * 100) : 0;
            const changeSymbol = change > 0.1 ? '📈' : change < -0.1 ? '📉' : '➡️';
            
            console.log(`💰 ${asset.symbol}: $${price} ${changeSymbol} ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
            
            // Update database
            await this.db.collection('assets').updateOne(
              { address: asset.address },
              {
                $set: {
                  address: asset.address,
                  symbol: asset.symbol,
                  currentPrice: price,
                  priceSource: 'coingecko',
                  lastUpdated: new Date(),
                  priceChange: change
                }
              },
              { upsert: true }
            );
            
            this.currentPrices[asset.address] = price;
          }
        } catch (error) {
          console.error(`❌ Error fetching ${asset.symbol}:`, error.message);
        }
      }
      
      console.log('✅ Price update completed');
      
    } catch (error) {
      console.error('❌ Error updating prices:', error);
    }
  }

  startPeriodicUpdates() {
    setInterval(async () => {
      if (this.isRunning) {
        await this.updatePrices();
      }
    }, this.updateInterval);
  }

  async stop() {
    console.log('🛑 Stopping simple price updater...');
    this.isRunning = false;
    if (this.client) {
      await this.client.close();
    }
    console.log('✅ Simple price updater stopped');
  }
}

// Start the updater if run directly
if (require.main === module) {
  const updater = new SimpleRealtimeUpdater();
  
  updater.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping price updater...');
    await updater.stop();
    process.exit(0);
  });
}

module.exports = SimpleRealtimeUpdater;
