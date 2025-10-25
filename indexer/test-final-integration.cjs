const http = require('http');

async function testFinalIntegration() {
  try {
    console.log('🔍 Testing final integration...');
    
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    console.log(`👤 Testing with user: ${testUser}`);
    
    // Test API endpoint
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('\n✅ API Response:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Transactions: ${data.data?.transactions?.length || 0}`);
      
      if (data.data?.transactions?.length > 0) {
        console.log('\n📋 Available Transactions:');
        data.data.transactions.forEach((tx, i) => {
          console.log(`   ${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol} ($${tx.amountUSD})`);
        });
        
        console.log('\n🎯 Expected Frontend Behavior:');
        console.log('   ✅ No "Rules of Hooks" errors');
        console.log('   ✅ No hydration errors');
        console.log('   ✅ Wallet persistence works');
        console.log('   ✅ History page shows these transactions');
        console.log('   ✅ Total volume: $14,500');
        
        console.log('\n💡 Final Test Steps:');
        console.log('   1. Open http://localhost:3000');
        console.log('   2. Connect wallet with address: 0x72A99A677E7451ce76ab072898af4c0741A2F086');
        console.log('   3. Navigate to /history');
        console.log('   4. Should see 3 transactions');
        console.log('   5. No console errors');
        
      } else {
        console.log('❌ No transactions found for this user');
      }
    } else {
      console.log(`❌ API Error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFinalIntegration();
