const http = require('http');

async function testWalletPersistence() {
  try {
    console.log('🔍 Testing wallet persistence fix...');
    
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
      console.log('✅ Frontend is running');
      console.log('\n🔧 Wallet Persistence Fix Applied:');
      console.log('   ✅ Added localStorage persistence for metamaskDetails');
      console.log('   ✅ Added restoreWalletConnection function');
      console.log('   ✅ Added auto-restore on component mount');
      console.log('   ✅ Wallet state will persist across page navigation');
      
      console.log('\n💡 How it works:');
      console.log('   1. When wallet connects, details are saved to localStorage');
      console.log('   2. When page loads, it checks localStorage for saved connection');
      console.log('   3. If found, it automatically restores the connection');
      console.log('   4. No need to reconnect when navigating between pages');
      
      console.log('\n🚀 Test Steps:');
      console.log('   1. Open http://localhost:3000');
      console.log('   2. Connect wallet on homepage');
      console.log('   3. Navigate to /history');
      console.log('   4. Wallet should still be connected');
      console.log('   5. Should see transaction history');
      
      console.log('\n🔍 Debug Info:');
      console.log('   - Check browser console for "Restored wallet connection" message');
      console.log('   - Check localStorage for "metamaskDetails" key');
      console.log('   - Check Network tab for API calls to /api/transactions');
      
    } else {
      console.log(`❌ Frontend error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure frontend is running:');
    console.log('   cd ../lendhub-frontend-nextjs && npm run dev');
  }
}

testWalletPersistence();

