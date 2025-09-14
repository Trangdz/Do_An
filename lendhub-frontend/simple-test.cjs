// Simple test to check basic connectivity
const { ethers } = require('ethers');

async function simpleTest() {
  try {
    console.log('🔍 Simple Test Starting...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    console.log('✅ Provider created');
    
    const network = await provider.getNetwork();
    console.log('Network:', network);
    
    const accounts = await provider.listAccounts();
    console.log('Available accounts:', accounts.length);
    
    if (accounts.length > 0) {
      const balance = await provider.getBalance(accounts[0]);
      console.log('First account balance:', ethers.formatEther(balance), 'ETH');
    }
    
    // Test WETH contract
    const WETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const ERC20_ABI = [
      'function balanceOf(address owner) external view returns (uint256)',
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)',
      'function mint(address to, uint256 amount) external',
    ];
    
    console.log('\n🔍 Testing WETH Contract...');
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);
    
    try {
      const symbol = await wethContract.symbol();
      console.log('WETH Symbol:', symbol);
    } catch (error) {
      console.error('WETH Symbol error:', error.message);
    }
    
    try {
      const decimals = await wethContract.decimals();
      console.log('WETH Decimals:', decimals);
    } catch (error) {
      console.error('WETH Decimals error:', error.message);
    }
    
    try {
      const balance = await wethContract.balanceOf(accounts[0]);
      console.log('WETH Balance:', ethers.formatEther(balance));
    } catch (error) {
      console.error('WETH Balance error:', error.message);
    }
    
    console.log('✅ Basic connectivity works!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleTest();