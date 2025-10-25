const http = require('http');

async function testCaseInsensitive() {
  try {
    console.log('🔍 Testing case-insensitive address fix...');
    
    // Test with different address formats
    const addresses = [
      '0x72A99A677E7451ce76ab072898af4c0741A2F086', // Mixed case
      '0x72a99a677e7451ce76ab072898af4c0741a2f086', // Lowercase
      '0x72a99A677E7451ce76ab072898af4c0741A2F086'  // Mixed case 2
    ];
    
    for (const address of addresses) {
      console.log(`\n👤 Testing address: ${address}`);
      
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:3000/api/transactions?user=${address}&limit=100&offset=0`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          });
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('Timeout')));
        });
        
        if (response.status === 200) {
          const data = JSON.parse(response.data);
          console.log(`   ✅ Found ${data.data?.transactions?.length || 0} transactions`);
          
          if (data.data?.transactions?.length > 0) {
            console.log(`   📋 Transactions:`);
            data.data.transactions.forEach((tx, i) => {
              console.log(`      ${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol} ($${tx.amountUSD})`);
            });
          }
        } else {
          console.log(`   ❌ API error: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Expected Results:');
    console.log('   ✅ All address formats should return 4 transactions');
    console.log('   ✅ Case-insensitive comparison should work');
    console.log('   ✅ Frontend should now show transactions');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Refresh browser page');
    console.log('   2. Check console for debug logs');
    console.log('   3. Verify transactions are displayed');
    console.log('   4. Check if wallet address case matches');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCaseInsensitive();

