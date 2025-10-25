const http = require('http');

async function testFrontendConnection() {
  try {
    console.log('🌐 Testing frontend connection...');
    
    // Test if frontend is running
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    if (response.status === 200) {
      console.log('✅ Frontend is running on http://localhost:3000');
    } else {
      console.log(`⚠️ Frontend returned status: ${response.status}`);
    }
    
    // Test API endpoint
    console.log('\n🔍 Testing API endpoint...');
    
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const apiResponse = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3000/api/transactions?user=${testUser}&limit=10&offset=0`, (res) => {
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
      console.log(`📊 Found ${data.data?.transactions?.length || 0} transactions`);
      
      if (data.data?.transactions?.length > 0) {
        console.log('\n📋 Sample transaction:');
        const tx = data.data.transactions[0];
        console.log(`   Type: ${tx.type}`);
        console.log(`   Amount: ${tx.amount} ${tx.asset?.symbol}`);
        console.log(`   User: ${tx.user}`);
        console.log(`   USD: $${tx.amountUSD}`);
      }
    } else {
      console.log(`❌ API returned status: ${apiResponse.status}`);
      console.log('Response:', apiResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('1. Start frontend: cd ../lendhub-frontend-nextjs && npm run dev');
    console.log('2. Check if port 3000 is available');
    console.log('3. Check for any errors in frontend console');
  }
}

testFrontendConnection();
