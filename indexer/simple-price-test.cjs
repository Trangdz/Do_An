const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: './config.env' });

async function testSimplePriceUpdate() {
  console.log('🧪 Testing simple price update...');
  
  let client;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Test assets
    const assets = [
      { address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472', symbol: 'USDC', coingecko: 'usd-coin' },
      { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WETH', coingecko: 'weth' },
      { address: '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254', symbol: 'DAI', coingecko: 'dai' }
    ];
    
    console.log('🔄 Fetching prices from CoinGecko...');
    
    for (const asset of assets) {
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.coingecko}&vs_currencies=usd`, {
          timeout: 5000
        });
        
        const price = response.data[asset.coingecko]?.usd;
        if (price) {
          console.log(`💰 ${asset.symbol}: $${price}`);
          
          // Update database
          await db.collection('assets').updateOne(
            { address: asset.address },
            {
              $set: {
                address: asset.address,
                symbol: asset.symbol,
                currentPrice: price,
                priceSource: 'coingecko',
                lastUpdated: new Date()
              }
            },
            { upsert: true }
          );
          
          console.log(`✅ Updated ${asset.symbol} in database`);
        }
      } catch (error) {
        console.error(`❌ Error fetching ${asset.symbol}:`, error.message);
      }
    }
    
    console.log('\n🎉 Simple price update completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testSimplePriceUpdate();
