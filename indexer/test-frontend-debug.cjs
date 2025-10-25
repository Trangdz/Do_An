const http = require('http');

async function testFrontendDebug() {
  try {
    console.log('🔍 Testing frontend debug...');
    
    // Test 1: Check if frontend is running
    console.log('\n1. Testing frontend accessibility...');
    const frontendResponse = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Frontend Timeout')));
    });
    
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is running');
    } else {
      console.log(`❌ Frontend error: ${frontendResponse.status}`);
      return;
    }
    
    // Test 2: Check history page
    console.log('\n2. Testing history page...');
    const historyResponse = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/history', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('History Timeout')));
    });
    
    if (historyResponse.status === 200) {
      console.log('✅ History page is accessible');
    } else {
      console.log(`❌ History page error: ${historyResponse.status}`);
    }
    
    // Test 3: Check API endpoint
    console.log('\n3. Testing API endpoint...');
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const apiResponse = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('API Timeout')));
    });
    
    if (apiResponse.status === 200) {
      const data = JSON.parse(apiResponse.data);
      console.log('✅ API is working');
      console.log(`   Success: ${data.success}`);
      console.log(`   Transactions: ${data.data?.transactions?.length || 0}`);
      
      if (data.data?.transactions?.length > 0) {
        console.log('\n📋 Available Transactions:');
        data.data.transactions.forEach((tx, i) => {
          console.log(`   ${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol} ($${tx.amountUSD})`);
        });
        
        console.log('\n🎯 Expected Frontend Behavior:');
        console.log('   ✅ When wallet is connected, frontend should show these transactions');
        console.log('   ✅ Total volume should be $14,700');
        console.log('   ✅ Should show 4 transactions');
        console.log('   ✅ No console errors');
        
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
        console.log('   5. Hydration errors preventing proper rendering');
        
      } else {
        console.log('❌ No transactions found in API');
      }
    } else {
      console.log(`❌ API error: ${apiResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFrontendDebug();

