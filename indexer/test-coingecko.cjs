const CoinGeckoPriceService = require('./coingecko-price-service.cjs');

async function testCoinGecko() {
  console.log('🧪 Testing CoinGecko API...');
  
  const priceService = new CoinGeckoPriceService();
  
  // Test assets
  const testAssets = [
    '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472', // USDC
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WETH
    '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254'  // DAI
  ];
  
  for (const asset of testAssets) {
    console.log(`\n🔍 Testing asset: ${asset}`);
    try {
      const price = await priceService.getPrice(asset);
      console.log(`✅ Price: $${price}`);
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
  
  console.log('\n🎉 CoinGecko test completed!');
}

testCoinGecko();
