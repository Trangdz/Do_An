const http = require('http');

async function testBrowserAPI() {
  try {
    console.log('🌐 Testing browser API calls...');
    
    // Test the exact URL that frontend would call
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    const url = `http://localhost:3000/api/transactions?user=${testUser}&limit=100&offset=0`;
    
    console.log(`🔗 Testing URL: ${url}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
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
    console.log(`📋 Headers:`, response.headers);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('\n✅ API Response:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Transactions: ${data.data?.transactions?.length || 0}`);
      
      if (data.data?.transactions?.length > 0) {
        console.log('\n📋 Transaction Details:');
        data.data.transactions.forEach((tx, i) => {
          console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol}`);
          console.log(`   User: ${tx.user}`);
          console.log(`   USD: $${tx.amountUSD}`);
          console.log(`   Hash: ${tx.hash}`);
          console.log(`   Time: ${new Date(tx.timestamp).toLocaleString()}`);
        });
        
        console.log('\n📊 Summary:');
        console.log(`   Total transactions: ${data.data.transactions.length}`);
        console.log(`   Total volume: $${data.data.transactions.reduce((sum, tx) => sum + parseFloat(tx.amountUSD || '0'), 0)}`);
        
        const types = {};
        data.data.transactions.forEach(tx => {
          types[tx.type] = (types[tx.type] || 0) + 1;
        });
        console.log(`   Transaction types:`, types);
      }
    } else {
      console.log(`❌ API Error: ${response.status}`);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBrowserAPI();

