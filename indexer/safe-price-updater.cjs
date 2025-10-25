const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: './config.env' });

class SafePriceUpdater {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.isRunning = false;
    this.updateInterval = 120000; // 2 minutes to avoid rate limiting
    this.currentPrices = {};
    this.fallbackPrices = {
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 1.0,  // USDC
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 2000.0,  // WETH
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 1.0   // DAI
    };
    
    this.assets = [
      { address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472', symbol: 'USDC', coingecko: 'usd-coin' },
      { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WETH', coingecko: 'weth' },
      { address: '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254', symbol: 'DAI', coingecko: 'dai' }
    ];
  }

  async start() {
    try {
      console.log('🚀 Starting Safe Price Updater...');
      console.log('⚠️ Using 2-minute intervals to avoid rate limiting');
      
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB');
      
      this.isRunning = true;
      
      // Initial update
      await this.updatePrices();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      console.log('✅ Safe price updater started');
      console.log(`⏰ Update interval: ${this.updateInterval / 1000} seconds`);
      
    } catch (error) {
      console.error('❌ Error starting updater:', error);
    }
  }

  async updatePrices() {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Updating prices...`);
      
      // Try to get all prices in one request to reduce API calls
      try {
        const coinIds = this.assets.map(asset => asset.coingecko).join(',');
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'LendHub-PriceUpdater/1.0'
          }
        });
        
        console.log('✅ Successfully fetched prices from CoinGecko');
        
        for (const asset of this.assets) {
          const price = response.data[asset.coingecko]?.usd;
          if (price) {
            await this.updateAssetPrice(asset, price, 'coingecko');
          } else {
            console.log(`⚠️ No price data for ${asset.symbol}, using fallback`);
            await this.updateAssetPrice(asset, this.fallbackPrices[asset.address], 'fallback');
          }
        }
        
      } catch (apiError) {
        console.log('⚠️ CoinGecko API failed, using fallback prices');
        console.log(`❌ API Error: ${apiError.message}`);
        
        for (const asset of this.assets) {
          await this.updateAssetPrice(asset, this.fallbackPrices[asset.address], 'fallback');
        }
      }
      
      console.log('✅ Price update completed');
      
    } catch (error) {
      console.error('❌ Error updating prices:', error);
    }
  }

  async updateAssetPrice(asset, price, source) {
    try {
      // Check for price change
      const previousPrice = this.currentPrices[asset.address];
      const change = previousPrice ? ((price - previousPrice) / previousPrice * 100) : 0;
      const changeSymbol = change > 0.1 ? '📈' : change < -0.1 ? '📉' : '➡️';
      
      console.log(`💰 ${asset.symbol}: $${price} ${changeSymbol} ${change > 0 ? '+' : ''}${change.toFixed(2)}% (${source})`);
      
      // Update database
      await this.db.collection('assets').updateOne(
        { address: asset.address },
        {
          $set: {
            address: asset.address,
            symbol: asset.symbol,
            currentPrice: price,
            priceSource: source,
            lastUpdated: new Date(),
            priceChange: change
          }
        },
        { upsert: true }
      );
      
      this.currentPrices[asset.address] = price;
      
    } catch (error) {
      console.error(`❌ Error updating ${asset.symbol}:`, error.message);
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
    console.log('🛑 Stopping safe price updater...');
    this.isRunning = false;
    if (this.client) {
      await this.client.close();
    }
    console.log('✅ Safe price updater stopped');
  }
}

// Start the updater if run directly
if (require.main === module) {
  const updater = new SafePriceUpdater();
  
  updater.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping price updater...');
    await updater.stop();
    process.exit(0);
  });
}

module.exports = SafePriceUpdater;
