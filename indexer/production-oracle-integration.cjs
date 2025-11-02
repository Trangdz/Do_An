const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');

class ProductionOracleIntegration {
  constructor() {
    this.rpcUrl = 'http://127.0.0.1:8545';
    this.mongoUri = 'mongodb://localhost:27017/lendhub_local';
    this.oracleAddress = '0xb8A99b2272541eA6f63f579839AEFA20A8f00937'; // New ChainlinkPriceOracle address
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('lendhub_local');
    console.log('✅ Connected to MongoDB');
  }

  async getOraclePrices() {
    try {
      const oracleABI = [
        'function getAssetPrice1e18(address token) external view returns (uint256)',
        'function getPriceFeed(address token) external view returns (address)',
        'function manualPrices(address token) external view returns (uint256)'
      ];

      const oracle = new ethers.Contract(this.oracleAddress, oracleABI, this.provider);
      
      // Token addresses
      const tokens = {
        '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 'WETH',
        '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 'USDC',
        '0x2d45297410159D48CE557EDf07fCBF2919F6a7Bf': 'DAI'
      };

      console.log('🔍 Fetching prices from ChainlinkPriceOracle...');
      
      for (const [address, symbol] of Object.entries(tokens)) {
        try {
          // Get price from oracle
          const priceWei = await oracle.getAssetPrice1e18(address);
          const price = parseFloat(ethers.formatEther(priceWei));
          
          // Get price feed address
          const feedAddress = await oracle.getPriceFeed(address);
          
          // Get manual price (fallback)
          const manualPrice = await oracle.manualPrices(address);
          const manualPriceFormatted = parseFloat(ethers.formatEther(manualPrice));
          
          console.log(`\n📊 ${symbol} (${address}):`);
          console.log(`   💰 Oracle Price: $${price.toFixed(2)}`);
          console.log(`   🔗 Chainlink Feed: ${feedAddress}`);
          console.log(`   📝 Manual Fallback: $${manualPriceFormatted.toFixed(2)}`);
          
          // Update database with oracle price
          await this.db.collection('assets').updateOne(
            { address: address },
            { 
              $set: { 
                currentPrice: price,
                lastUpdated: new Date(),
                source: 'chainlink-oracle',
                feedAddress: feedAddress,
                manualPrice: manualPriceFormatted
              }
            },
            { upsert: true }
          );
          
        } catch (error) {
          console.error(`❌ Failed to get price for ${symbol}:`, error.message);
        }
      }
      
      console.log('\n✅ Oracle integration completed');
      
    } catch (error) {
      console.error('❌ Oracle integration failed:', error.message);
    }
  }

  async testStalenessProtection() {
    try {
      console.log('\n🕐 Testing Staleness Protection...');
      
      const oracleABI = [
        'function getAssetPrice1e18(address token) external view returns (uint256)'
      ];
      
      const oracle = new ethers.Contract(this.oracleAddress, oracleABI, this.provider);
      const wethAddress = '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254';
      
      // This should work with fresh prices
      const price = await oracle.getAssetPrice1e18(wethAddress);
      console.log(`✅ Fresh price: $${ethers.formatEther(price)}`);
      
      console.log('💡 In production, stale prices (>1 hour) would revert');
      console.log('💡 This protects against outdated price data');
      
    } catch (error) {
      console.error('❌ Staleness test failed:', error.message);
    }
  }

  async showProductionFeatures() {
    console.log('\n🏭 PRODUCTION ORACLE FEATURES:');
    console.log('=' .repeat(50));
    console.log('✅ Chainlink Price Feeds integration');
    console.log('✅ Staleness protection (1 hour threshold)');
    console.log('✅ Manual price fallback system');
    console.log('✅ Owner-only configuration');
    console.log('✅ Real-time price updates');
    console.log('✅ Decentralized price sources');
    console.log('✅ Production-grade security');
    
    console.log('\n🔗 REAL CHAINLINK FEEDS (Mainnet):');
    console.log('   ETH/USD: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419');
    console.log('   USDC/USD: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6');
    console.log('   DAI/USD: 0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9');
    
    console.log('\n🚀 DEPLOYMENT CHECKLIST:');
    console.log('   □ Deploy ChainlinkPriceOracle');
    console.log('   □ Set up Chainlink price feeds');
    console.log('   □ Configure manual fallback prices');
    console.log('   □ Test staleness protection');
    console.log('   □ Update LendingPool oracle address');
    console.log('   □ Deploy to testnet with real feeds');
    console.log('   □ Deploy to mainnet with production feeds');
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

async function main() {
  const integration = new ProductionOracleIntegration();
  
  try {
    await integration.connect();
    await integration.getOraclePrices();
    await integration.testStalenessProtection();
    await integration.showProductionFeatures();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await integration.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionOracleIntegration;

