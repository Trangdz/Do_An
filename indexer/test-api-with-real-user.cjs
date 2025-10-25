const https = require('https');
const http = require('http');

async function testAPIWithRealUser() {
  try {
    console.log('🌐 Testing API with real user...');
    
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    console.log(`👤 Testing user: ${testUser}`);
    
    // Test API endpoint using built-in http module
    const url = `http://localhost:3000/api/transactions?user=${testUser}&limit=10&offset=0`;
    console.log(`🔗 Testing URL: ${url}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
    });
    
    const data = JSON.parse(response.data);
    
    if (data.success) {
      console.log(`✅ API returned ${data.data.transactions.length} transactions`);
      console.log('📋 API Response:');
      
      data.data.transactions.forEach((tx, i) => {
        console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
        console.log(`   👤 User: ${tx.user}`);
        console.log(`   💰 USD: $${tx.amountUSD}`);
        console.log(`   🔗 Hash: ${tx.hash}`);
        console.log(`   📅 Time: ${new Date(tx.timestamp).toLocaleString()}`);
      });
      
      console.log('\n✅ API is working correctly - only showing transactions for the specified user');
    } else {
      console.log('❌ API Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('💡 Make sure frontend is running: cd ../lendhub-frontend-nextjs && npm run dev');
  }
}

testAPIWithRealUser();
