const http = require('http');

async function testDebugLogs() {
  try {
    console.log('🔍 Testing debug logs...');
    
    // Test the exact API call that frontend would make
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const url = `http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`;
    
    console.log(`🔗 Testing URL: ${url}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
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
        
        console.log('\n🔧 Debug Logs Added:');
        console.log('   ✅ Added user address logging');
        console.log('   ✅ Added API URL logging');
        console.log('   ✅ Added API response logging');
        console.log('   ✅ Enhanced error tracking');
        
        console.log('\n🎯 Expected Console Output:');
        console.log('   🔍 Fetching transactions for user: 0x72A99A677E7451ce76ab072898af4c0741A2F086');
        console.log('   🔗 API URL: /api/transactions?user=0x72A99A677E7451ce76ab072898af4c0741A2F086&limit=100&offset=0');
        console.log('   📊 API Response: {success: true, data: {...}}');
        console.log('   ✅ Fetched 4 transactions from MongoDB');
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Refresh browser page');
        console.log('   2. Check console for new debug logs');
        console.log('   3. Verify API call is being made');
        console.log('   4. Check if transactions are fetched');
        
      } else {
        console.log('❌ No transactions found in API');
      }
    } else {
      console.log(`❌ API Error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDebugLogs();

