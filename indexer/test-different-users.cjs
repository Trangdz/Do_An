const http = require('http');

async function testDifferentUsers() {
  try {
    console.log('🔍 Testing with different users...');
    
    const users = [
      '0x72A99A677E7451ce76ab072898af4c0741A2F086', // User with transactions
      '0x1234567890123456789012345678901234567890', // User without transactions
      '0xA8B33EbB3ADeD5dE4E389A98eFee1970b46Eb09d'  // Another user
    ];
    
    for (const user of users) {
      console.log(`\n👤 Testing user: ${user}`);
      
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:3000/api/transactions?user=${user}&limit=10&offset=0`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          });
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('Timeout')));
        });
        
        if (response.status === 200) {
          const data = JSON.parse(response.data);
          console.log(`✅ Found ${data.data?.transactions?.length || 0} transactions`);
          
          if (data.data?.transactions?.length > 0) {
            data.data.transactions.forEach((tx, i) => {
              console.log(`   ${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol}`);
            });
          } else {
            console.log('   📝 No transactions for this user');
          }
        } else {
          console.log(`❌ API error: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error testing user ${user}: ${error.message}`);
      }
    }
    
    // Test without user parameter (should return empty)
    console.log('\n🔍 Testing without user parameter...');
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/transactions?limit=10&offset=0', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
      });
      
      if (response.status === 200) {
        const data = JSON.parse(response.data);
        console.log(`✅ Found ${data.data?.transactions?.length || 0} transactions (all users)`);
      } else {
        console.log(`❌ API error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDifferentUsers();

