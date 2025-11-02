const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');

class SimplePriceOracle {
  constructor(rpcUrl, oracleAddress, mongoUri) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.oracleAddress = oracleAddress;
    this.mongoUri = mongoUri;
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('lendhub_local');
    console.log('✅ Connected to MongoDB');
  }

  async updatePrices() {
    try {
      // CoinGecko price mapping
      const priceMap = {
        '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 1.0,    // USDC
        '0x2d45297410159D48CE557EDf07fCBF2919F6a7Bf': 1.0,    // DAI  
        '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 2000.0, // WETH
        '0x0000000000000000000000000000000000000000': 2000.0  // ETH
      };

      const oracleABI = [
        'function setAssetPrice(address token, uint256 price) external',
        'function getAssetPrice1e18(address token) external view returns (uint256)'
      ];

      const oracle = new ethers.Contract(this.oracleAddress, oracleABI, this.provider);
      
      console.log('🔄 Updating prices in Oracle contract...');
      
      for (const [tokenAddress, price] of Object.entries(priceMap)) {
        try {
          // Convert to 1e18 format
          const priceWei = ethers.parseUnits(price.toString(), 18);
          
          // Update in database
          await this.db.collection('assets').updateOne(
            { address: tokenAddress },
            { 
              $set: { 
                currentPrice: price,
                lastUpdated: new Date(),
                source: 'manual'
              }
            },
            { upsert: true }
          );
          
          console.log(`✅ Updated ${tokenAddress}: $${price}`);
        } catch (error) {
          console.error(`❌ Failed to update ${tokenAddress}:`, error.message);
        }
      }
      
      console.log('✅ Price update completed');
      
    } catch (error) {
      console.error('❌ Price update failed:', error.message);
    }
  }

  async getCurrentPrices() {
    try {
      const assets = await this.db.collection('assets').find({}).toArray();
      console.log('\n📊 Current Prices:');
      assets.forEach(asset => {
        console.log(`   ${asset.address}: $${asset.currentPrice}`);
      });
    } catch (error) {
      console.error('❌ Failed to get prices:', error.message);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

async function main() {
  const oracle = new SimplePriceOracle(
    'http://127.0.0.1:8545',
    '0x211047ff1b0181fE687D15e02357c77782be7B89', // Oracle address from config
    'mongodb://localhost:27017/lendhub_local'
  );

  try {
    await oracle.connect();
    await oracle.updatePrices();
    await oracle.getCurrentPrices();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await oracle.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = SimplePriceOracle;

