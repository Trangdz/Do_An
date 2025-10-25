const axios = require('axios');

class CoinGeckoPriceService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    
    // Mapping từ asset addresses đến CoinGecko IDs
    this.assetMapping = {
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 'usd-coin', // USDC
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'weth', // WETH
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 'dai', // DAI
      '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 'weth' // WETH
    };
  }

  async getPrice(assetAddress) {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();

      const coinId = this.assetMapping[assetAddress];
      if (!coinId) {
        console.warn(`⚠️ Unknown asset for CoinGecko: ${assetAddress}`);
        return this.getFallbackPrice(assetAddress);
      }

      console.log(`🔍 Fetching price for ${coinId} from CoinGecko...`);
      
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd'
        },
        timeout: 5000
      });

      const price = response.data[coinId]?.usd;
      if (price) {
        console.log(`💰 CoinGecko price for ${coinId}: $${price}`);
        return price;
      } else {
        console.warn(`⚠️ No price data from CoinGecko for ${coinId}`);
        return this.getFallbackPrice(assetAddress);
      }

    } catch (error) {
      console.warn(`⚠️ CoinGecko API error:`, error.message);
      return this.getFallbackPrice(assetAddress);
    }
  }

  getFallbackPrice(assetAddress) {
    // Fallback prices nếu CoinGecko không hoạt động
    const fallbackPrices = {
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 1.0,  // USDC
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 2000.0,  // WETH
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 1.0,  // DAI
      '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 2000.0   // WETH
    };
    
    const price = fallbackPrices[assetAddress] || 100.0;
    console.log(`💰 Fallback price for ${assetAddress}: $${price}`);
    return price;
  }

  async getMultiplePrices(assetAddresses) {
    try {
      const coinIds = assetAddresses
        .map(addr => this.assetMapping[addr])
        .filter(id => id);
      
      if (coinIds.length === 0) {
        return {};
      }

      console.log(`🔍 Fetching prices for ${coinIds.length} assets from CoinGecko...`);
      
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd'
        },
        timeout: 10000
      });

      const prices = {};
      for (const [coinId, data] of Object.entries(response.data)) {
        if (data.usd) {
          prices[coinId] = data.usd;
        }
      }

      console.log(`💰 CoinGecko prices:`, prices);
      return prices;

    } catch (error) {
      console.warn(`⚠️ CoinGecko batch API error:`, error.message);
      return {};
    }
  }
}

module.exports = CoinGeckoPriceService;
