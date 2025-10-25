const http = require('http');

async function testBrowserDebug() {
  try {
    console.log('🔍 Testing browser debug...');
    
    // Test the exact API call that frontend would make
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const url = `http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`;
    
    console.log(`🔗 Testing URL: ${url}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data 
        }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Timeout')));
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('\n✅ API Response Structure:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Has data: ${!!data.data}`);
      console.log(`   Has transactions: ${!!data.data?.transactions}`);
      console.log(`   Transaction count: ${data.data?.transactions?.length || 0}`);
      
      if (data.data?.transactions?.length > 0) {
        console.log('\n📋 All Transactions:');
        data.data.transactions.forEach((tx, i) => {
          console.log(`   ${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol} ($${tx.amountUSD})`);
          console.log(`      User: ${tx.user}`);
          console.log(`      Hash: ${tx.hash}`);
          console.log(`      Time: ${new Date(tx.timestamp).toLocaleString()}`);
        });
        
        console.log('\n📊 Summary:');
        const totalVolume = data.data.transactions.reduce((sum, tx) => sum + parseFloat(tx.amountUSD || '0'), 0);
        console.log(`   Total transactions: ${data.data.transactions.length}`);
        console.log(`   Total volume: $${totalVolume}`);
        
        const types = {};
        data.data.transactions.forEach(tx => {
          types[tx.type] = (types[tx.type] || 0) + 1;
        });
        console.log(`   Transaction types:`, types);
        
        console.log('\n🎯 Expected Frontend Behavior:');
        console.log('   ✅ When wallet is connected, frontend should show these transactions');
        console.log('   ✅ Total volume should be $14,700');
        console.log('   ✅ Should show 4 transactions');
        console.log('   ✅ No console errors');
        
        console.log('\n💡 If frontend still not working:');
        console.log('   1. Check browser console for JavaScript errors');
        console.log('   2. Verify wallet is connected with correct address');
        console.log('   3. Check Network tab for API calls to /api/transactions');
        console.log('   4. Check if useMongoTransactions hook is being called');
        console.log('   5. Verify user address is being passed correctly');
        
      } else {
        console.log('❌ No transactions found for this user');
      }
    } else {
      console.log(`❌ API Error: ${response.status}`);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBrowserDebug();