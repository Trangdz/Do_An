const http = require('http');

async function debugFrontend() {
  try {
    console.log('🔍 Debugging frontend...');
    
    // Test if frontend is accessible
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
      console.log('✅ Frontend is accessible');
    } else {
      console.log(`❌ Frontend error: ${frontendResponse.status}`);
      return;
    }
    
    // Test history page specifically
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
    
    // Test API with different scenarios
    console.log('\n3. Testing API scenarios...');
    
    const scenarios = [
      { name: 'With valid user', user: '0x72A99A677E7451ce76ab072898af4c0741A2F086' },
      { name: 'With invalid user', user: '0x1234567890123456789012345678901234567890' },
      { name: 'Without user', user: null }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n   Testing: ${scenario.name}`);
      
      try {
        const url = scenario.user 
          ? `http://localhost:3000/api/transactions?user=${scenario.user}&limit=100&offset=0`
          : 'http://localhost:3000/api/transactions?limit=100&offset=0';
          
        const response = await new Promise((resolve, reject) => {
          const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          });
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('API Timeout')));
        });
        
        if (response.status === 200) {
          const data = JSON.parse(response.data);
          console.log(`     ✅ Found ${data.data?.transactions?.length || 0} transactions`);
        } else {
          console.log(`     ❌ API error: ${response.status}`);
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n4. Possible issues:');
    console.log('   - Wallet not connected in browser');
    console.log('   - JavaScript errors in browser console');
    console.log('   - Hook not being called with correct address');
    console.log('   - CORS issues');
    console.log('   - Network connectivity problems');
    
    console.log('\n💡 Debug steps:');
    console.log('1. Open browser to http://localhost:3000/history');
    console.log('2. Open browser developer tools (F12)');
    console.log('3. Check Console tab for JavaScript errors');
    console.log('4. Check Network tab for API calls');
    console.log('5. Connect wallet and check if address is correct');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFrontend();

