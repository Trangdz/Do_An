const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function checkBlockchain() {
  try {
    console.log('🔍 Checking blockchain connection...');
    console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
    console.log(`🏦 Pool Address: ${process.env.LENDING_POOL_ADDRESS}`);
    
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Test connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Get block info
    const block = await provider.getBlock(latestBlock);
    console.log(`📊 Block ${latestBlock}:`);
    console.log(`   - Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    console.log(`   - Transactions: ${block.transactions.length}`);
    console.log(`   - Gas used: ${block.gasUsed}`);
    console.log(`   - Gas limit: ${block.gasLimit}`);
    
    // Check if pool contract exists
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    const code = await provider.getCode(poolAddress);
    
    if (code === '0x') {
      console.log(`❌ No contract found at ${poolAddress}`);
      console.log('   Make sure to deploy contracts first!');
    } else {
      console.log(`✅ Contract found at ${poolAddress}`);
      console.log(`   Code length: ${code.length} characters`);
    }
    
    // Get recent transactions
    console.log(`\n🔍 Recent transactions (last 5 blocks):`);
    for (let i = Math.max(0, latestBlock - 5); i <= latestBlock; i++) {
      const block = await provider.getBlock(i);
      if (block.transactions.length > 0) {
        console.log(`   Block ${i}: ${block.transactions.length} transactions`);
        
        // Get transaction details
        for (const txHash of block.transactions.slice(0, 3)) { // Show first 3 txs
          const tx = await provider.getTransaction(txHash);
          console.log(`     - ${txHash}: ${ethers.formatEther(tx.value)} ETH to ${tx.to}`);
        }
      }
    }
    
    // Check account balances
    console.log(`\n💰 Account balances:`);
    const accounts = [
      '0xc7c744636f70D3ee88141e8a2a44F8225DeE6c76',
      '0x8ba1f109551bD432803012645Hac136c',
      '0x90F79bf6EB2c4f870365E785982E1f101E9b61d'
    ];
    
    for (const account of accounts) {
      try {
        const balance = await provider.getBalance(account);
        console.log(`   ${account}: ${ethers.formatEther(balance)} ETH`);
      } catch (error) {
        console.log(`   ${account}: Error getting balance`);
      }
    }
    
    console.log('\n✅ Blockchain check completed!');
    
  } catch (error) {
    console.error('❌ Blockchain check failed:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure Ganache is running on port 7545');
    console.log('   2. Check if contracts are deployed');
    console.log('   3. Verify RPC URL in config.env');
  }
}

checkBlockchain();


