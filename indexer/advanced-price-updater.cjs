const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: './config.env' });

class AdvancedPriceUpdater {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.isRunning = false;
    this.updateInterval = 5000; // 5 seconds for ultra-fast updates
    this.priceSources = [
      'coingecko',
      'coinmarketcap',
      'cryptocompare'
    ];
    this.currentPrices = {};
    this.priceHistory = [];
    
    // Asset mapping for multiple sources
    this.assetMapping = {
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': { // USDC
        coingecko: 'usd-coin',
        coinmarketcap: '3408',
        cryptocompare: 'USDC'
      },
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { // WETH
        coingecko: 'weth',
        coinmarketcap: '2396',
        cryptocompare: 'WETH'
      },
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': { // DAI
        coingecko: 'dai',
        coinmarketcap: '4943',
        cryptocompare: 'DAI'
      },
      '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': { // WETH
        coingecko: 'weth',
        coinmarketcap: '2396',
        cryptocompare: 'WETH'
      }
    };
  }

  async start() {
    try {
      console.log('🚀 Starting Advanced Real-time Price Updater...');
      
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB');
      
      this.isRunning = true;
      
      // Initial price fetch
      await this.updateAllPrices();
      
      // Start ultra-fast updates
      this.startUltraFastUpdates();
      
      console.log('✅ Advanced price updater started');
      console.log(`⏰ Update interval: ${this.updateInterval / 1000} seconds`);
      console.log('🔄 Ultra-fast real-time price updates enabled');
      
    } catch (error) {
      console.error('❌ Error starting advanced price updater:', error);
    }
  }

  async updateAllPrices() {
    try {
      console.log('🔄 Fetching prices from multiple sources...');
      
      const allPrices = {};
      
      // Fetch from all sources in parallel
      const assetAddresses = Object.keys(this.assetMapping);
      const pricePromises = assetAddresses.map(assetAddress => 
        this.getPriceFromAllSources(assetAddress)
      );
      
      const results = await Promise.allSettled(pricePromises);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const assetAddress = assetAddresses[i];
        
        if (result.status === 'fulfilled' && result.value) {
          const { price, source, confidence } = result.value;
          allPrices[assetAddress] = { price, source, confidence };
          
          // Update database
          await this.updateAssetPrice(assetAddress, price, source, confidence);
          
          // Show price change
          const previousPrice = this.currentPrices[assetAddress];
          if (previousPrice) {
            const change = ((price - previousPrice) / previousPrice * 100);
            const changeSymbol = change > 0.1 ? '📈' : change < -0.1 ? '📉' : '➡️';
            console.log(`💰 ${assetAddress.slice(0, 10)}...: $${price} ${changeSymbol} (${source})`);
          } else {
            console.log(`💰 ${assetAddress.slice(0, 10)}...: $${price} (${source})`);
          }
          
          this.currentPrices[assetAddress] = price;
        }
      }
      
      // Save price history
      await this.savePriceHistory(allPrices);
      
      console.log('✅ Advanced price update completed');
      
    } catch (error) {
      console.error('❌ Error updating prices:', error);
    }
  }

  async getPriceFromAllSources(assetAddress) {
    const mapping = this.assetMapping[assetAddress];
    if (!mapping) return null;
    
    const sources = [
      { name: 'coingecko', price: await this.getCoinGeckoPrice(mapping.coingecko) },
      { name: 'coinmarketcap', price: await this.getCoinMarketCapPrice(mapping.coinmarketcap) },
      { name: 'cryptocompare', price: await this.getCryptoComparePrice(mapping.cryptocompare) }
    ];
    
    // Filter valid prices
    const validSources = sources.filter(s => s.price && s.price > 0);
    
    if (validSources.length === 0) return null;
    
    // Calculate weighted average
    const weights = { coingecko: 0.4, coinmarketcap: 0.4, cryptocompare: 0.2 };
    let weightedSum = 0;
    let totalWeight = 0;
    let bestSource = '';
    let confidence = 0;
    
    for (const source of validSources) {
      const weight = weights[source.name] || 0.1;
      weightedSum += source.price * weight;
      totalWeight += weight;
      
      if (weight > confidence) {
        confidence = weight;
        bestSource = source.name;
      }
    }
    
    const averagePrice = totalWeight > 0 ? weightedSum / totalWeight : validSources[0].price;
    
    return {
      price: averagePrice,
      source: bestSource,
      confidence: confidence
    };
  }

  async getCoinGeckoPrice(coinId) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
        timeout: 3000
      });
      return response.data[coinId]?.usd;
    } catch (error) {
      return null;
    }
  }

  async getCoinMarketCapPrice(coinId) {
    try {
      // Note: CoinMarketCap requires API key for real-time data
      // This is a simplified version
      const response = await axios.get(`https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail/chart?id=${coinId}&range=1D`, {
        timeout: 3000
      });
      return response.data?.data?.points?.latest?.[1]?.[0];
    } catch (error) {
      return null;
    }
  }

  async getCryptoComparePrice(symbol) {
    try {
      const response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`, {
        timeout: 3000
      });
      return response.data.USD;
    } catch (error) {
      return null;
    }
  }

  async updateAssetPrice(assetAddress, price, source, confidence) {
    try {
      await this.db.collection('assets').updateOne(
        { address: assetAddress },
        {
          $set: {
            address: assetAddress,
            currentPrice: price,
            priceSource: source,
            confidence: confidence,
            lastUpdated: new Date(),
            priceChange: this.calculatePriceChange(assetAddress, price)
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating asset price:', error);
    }
  }

  calculatePriceChange(assetAddress, newPrice) {
    const previousPrice = this.currentPrices[assetAddress];
    if (!previousPrice) return 0;
    
    return ((newPrice - previousPrice) / previousPrice * 100);
  }

  async savePriceHistory(prices) {
    try {
      const historyEntry = {
        timestamp: new Date(),
        prices: prices,
        source: 'advanced-updater'
      };
      
      await this.db.collection('priceHistory').insertOne(historyEntry);
      
      // Keep only last 1000 entries
      const count = await this.db.collection('priceHistory').countDocuments();
      if (count > 1000) {
        await this.db.collection('priceHistory').deleteMany({}, { skip: 1000 });
      }
    } catch (error) {
      console.error('❌ Error saving price history:', error);
    }
  }

  startUltraFastUpdates() {
    setInterval(async () => {
      if (this.isRunning) {
        console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Ultra-fast price update...`);
        await this.updateAllPrices();
      }
    }, this.updateInterval);
  }

  async stop() {
    console.log('🛑 Stopping advanced price updater...');
    this.isRunning = false;
    if (this.client) {
      await this.client.close();
    }
    console.log('✅ Advanced price updater stopped');
  }

  getCurrentPrices() {
    return this.currentPrices;
  }

  async getPriceHistory(assetAddress, hours = 1) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const history = await this.db.collection('priceHistory').find({
        'prices.address': assetAddress,
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 }).toArray();
      
      return history;
    } catch (error) {
      console.error('❌ Error getting price history:', error);
      return [];
    }
  }
}

// Start the advanced updater if run directly
if (require.main === module) {
  const updater = new AdvancedPriceUpdater();
  
  updater.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await updater.stop();
    process.exit(0);
  });
}

module.exports = AdvancedPriceUpdater;
