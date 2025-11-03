const axios = require('axios');

async function main() {
  try {
    // Get accounts from Ganache
    const response = await axios.post('http://127.0.0.1:7545', {
      jsonrpc: '2.0',
      method: 'eth_accounts',
      params: [],
      id: 1
    });
    
    console.log('📊 Ganache Accounts:');
    const accounts = response.data.result;
    accounts.forEach((account, i) => {
      console.log(`Account ${i}: ${account}`);
    });
    
    // Try to get private keys using personal_listAccounts or debug methods
    console.log('\n🔑 Trying to get private keys...');
    
    // Method 1: Check if Ganache exposes private keys
    try {
      const pkResponse = await axios.post('http://127.0.0.1:7545', {
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        params: [],
        id: 2
      });
      console.log('Ganache snapshot ID:', pkResponse.data.result);
    } catch (e) {
      console.log('Cannot get snapshot');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Ganache might not be running or not exposing account info API');
  }
  
  console.log('\n🎯 GIẢI PHÁP ĐƠN GIẢN:');
  console.log('════════════════════════════════════════════════════════════');
  console.log('Hãy kiểm tra cửa sổ PowerShell đang chạy Ganache.');
  console.log('Khi Ganache khởi động, nó sẽ hiển thị:');
  console.log('- Danh sách 10 accounts');
  console.log('- Private keys tương ứng');
  console.log('- Mnemonic phrase');
  console.log('\nCopy private key của Account (0) và import vào MetaMask!');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch(console.error);












