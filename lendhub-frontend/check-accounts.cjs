// Check accounts and WETH balance
const { ethers } = require('ethers');

async function checkAccounts() {
  try {
    console.log('🔍 Checking Accounts...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const accounts = await provider.listAccounts();
    
    console.log('Available accounts:');
    accounts.forEach((account, index) => {
      console.log(`${index}: ${account}`);
    });
    
    // Check WETH balance for each account
    const WETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const ERC20_ABI = [
      'function balanceOf(address owner) external view returns (uint256)',
      'function symbol() external view returns (string)',
    ];
    
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);
    
    console.log('\n🔍 WETH Balances:');
    for (let i = 0; i < accounts.length; i++) {
      try {
        const balance = await wethContract.balanceOf(accounts[i]);
        console.log(`Account ${i}: ${ethers.formatEther(balance)} WETH`);
      } catch (error) {
        console.log(`Account ${i}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAccounts();
