// Check Ganache status and accounts
import { ethers } from 'ethers';

async function checkGanache() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    
    // Check network
    const network = await provider.getNetwork();
    console.log('Network:', network);
    
    // Check accounts
    const accounts = await provider.listAccounts();
    console.log('Available accounts:', accounts.length);
    
    // Check balances
    for (let i = 0; i < Math.min(3, accounts.length); i++) {
      const balance = await provider.getBalance(accounts[i]);
      console.log(`Account ${i}: ${accounts[i]} - ${ethers.formatEther(balance)} ETH`);
    }
    
  } catch (error) {
    console.error('Error connecting to Ganache:', error.message);
  }
}

checkGanache();

