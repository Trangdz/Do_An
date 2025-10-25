const http = require('http');

async function testWalletConnection() {
  try {
    console.log('🔍 Testing wallet connection issue...');
    
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
        
        console.log('\n🎯 Expected Frontend Behavior:');
        console.log('   ✅ Should show 4 transactions');
        console.log('   ✅ Should show $14,700 total volume');
        console.log('   ✅ Should show transaction details');
        console.log('   ✅ Should NOT show "No Transactions Yet"');
        
        console.log('\n🔍 Debug Steps:');
        console.log('   1. Open browser to http://localhost:3000/history');
        console.log('   2. Open Developer Tools (F12)');
        console.log('   3. Check Console tab for JavaScript errors');
        console.log('   4. Check Network tab for API calls to /api/transactions');
        console.log('   5. Connect wallet with address: 0x72A99A677E7451ce76ab072898af4c0741A2F086');
        console.log('   6. Check if wallet connection is working');
        console.log('   7. Look for API calls in Network tab');
        
        console.log('\n💡 Possible Issues:');
        console.log('   1. Wallet not connected in browser');
        console.log('   2. JavaScript errors in browser console');
        console.log('   3. useMongoTransactions hook not working');
        console.log('   4. Frontend not calling API correctly');
        console.log('   5. Address mismatch between wallet and API');
        
        console.log('\n🔧 Quick Fix:');
        console.log('   1. Make sure wallet is connected');
        console.log('   2. Check browser console for errors');
        console.log('   3. Verify API calls in Network tab');
        console.log('   4. Check if address matches: 0x72A99A677E7451ce76ab072898af4c0741A2F086');
        
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

testWalletConnection();

