// Simple balance check
const { ethers } = require('ethers');

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const accounts = await provider.listAccounts();
    const userAddress = accounts[0];
    
    console.log('👤 User address:', userAddress);
    
    // Check ETH balance
    const ethBalance = await provider.getBalance(userAddress);
    console.log('💰 ETH balance:', ethers.formatEther(ethBalance));
    
    // Check if user has any WETH by looking at recent transactions
    console.log('🔄 Checking recent transactions...');
    
    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('📊 Latest block:', blockNumber);
    
    // Check last 10 blocks for transactions
    for (let i = 0; i < 10; i++) {
      const block = await provider.getBlock(blockNumber - i);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.from.toLowerCase() === userAddress.toLowerCase()) {
            console.log('📝 Transaction found:');
            console.log('  To:', tx.to);
            console.log('  Value:', ethers.formatEther(tx.value));
            console.log('  Data:', tx.data);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBalance();
