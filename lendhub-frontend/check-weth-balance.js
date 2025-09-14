// Test script to check WETH balance
import { ethers } from 'ethers';

// Check the deployed WETH contract
const WETH_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
const RPC_URL = 'http://127.0.0.1:7545';

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

async function checkWETHBalance() {
  try {
    console.log('🔄 Connecting to Ganache...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('🔄 Getting accounts...');
    const accounts = await provider.listAccounts();
    console.log('📊 Available accounts:', accounts.length);
    
    if (accounts.length === 0) {
      console.error('❌ No accounts found!');
      return;
    }
    
    const userAddress = accounts[0];
    console.log('👤 Using account:', userAddress);
    
    console.log('🔄 Checking WETH contract...');
    console.log(`📍 WETH address: ${WETH_ADDRESS}`);
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);
    
    // Check contract info
    try {
      const symbol = await wethContract.symbol();
      const name = await wethContract.name();
      const decimals = await wethContract.decimals();
      console.log('✅ Contract found!');
      console.log('  Symbol:', symbol);
      console.log('  Name:', name);
      console.log('  Decimals:', decimals);
      
      // Check balance
      console.log('🔄 Checking WETH balance...');
      const balanceWei = await wethContract.balanceOf(userAddress);
      const balanceEth = ethers.formatEther(balanceWei);
      
      console.log('📊 WETH Balance:');
      console.log('  Raw Wei:', balanceWei.toString());
      console.log('  Formatted ETH:', balanceEth);
      
      if (balanceWei > 0) {
        console.log('🎉 Found WETH balance!');
      }
    } catch (error) {
      console.log('❌ Contract not found or error:', error.message);
    }
    
    // Check ETH balance
    console.log('🔄 Checking ETH balance...');
    const ethBalanceWei = await provider.getBalance(userAddress);
    const ethBalanceEth = ethers.formatEther(ethBalanceWei);
    
    console.log('📊 ETH Balance:');
    console.log('  Raw Wei:', ethBalanceWei.toString());
    console.log('  Formatted ETH:', ethBalanceEth);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWETHBalance().catch(console.error);
