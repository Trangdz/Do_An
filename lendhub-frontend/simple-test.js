// Simple test to check basic connectivity
import { ethers } from 'ethers';

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
    
    console.log('✅ Basic connectivity works!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleTest();

