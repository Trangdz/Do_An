const http = require('http');

async function checkWalletConnection() {
  try {
    console.log('🔍 Checking wallet connection requirements...');
    
    // Test the exact API call that would be made when wallet is connected
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const url = `http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`;
    
    console.log(`🔗 API URL: ${url}`);
    
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
        console.log('   ✅ When wallet is connected, frontend should show these transactions');
        console.log('   ✅ Total volume should be $14,500');
        console.log('   ✅ Should show 3 transactions');
        
        console.log('\n💡 Debug Steps:');
        console.log('1. Open browser to http://localhost:3000/history');
        console.log('2. Connect MetaMask with address: 0x72A99A677E7451ce76ab072898af4c0741A2F086');
        console.log('3. Check if address appears in top-right corner');
        console.log('4. Check browser console for any errors');
        console.log('5. Check Network tab for API calls to /api/transactions');
        
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

checkWalletConnection();

