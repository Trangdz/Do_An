const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function checkBlockTransactions() {
  console.log('🔍 Checking recent blocks for transactions...');
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    
    // Lấy block mới nhất
    const latestBlock = await provider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Kiểm tra 5 block gần nhất
    for (let i = 0; i < 5; i++) {
      const blockNumber = latestBlock - i;
      const block = await provider.getBlock(blockNumber, true);
      
      console.log(`\n📦 Block ${blockNumber}:`);
      console.log(`  - Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
      console.log(`  - Transactions: ${block.transactions.length}`);
      
      if (block.transactions.length > 0) {
        console.log(`  - Gas used: ${block.gasUsed.toString()}`);
        console.log(`  - Gas limit: ${block.gasLimit.toString()}`);
        
        // Kiểm tra giao dịch đến pool
        let poolTransactions = 0;
        for (const tx of block.transactions) {
          if (tx.to && tx.to.toLowerCase() === poolAddress.toLowerCase()) {
            poolTransactions++;
            console.log(`    🎯 Pool transaction: ${tx.hash}`);
          }
        }
        
        if (poolTransactions > 0) {
          console.log(`  🎯 Pool transactions: ${poolTransactions}`);
        }
      } else {
        console.log(`  📭 Empty block (no transactions)`);
      }
    }
    
    // Kiểm tra pool contract
    console.log(`\n🏦 Pool contract: ${poolAddress}`);
    const poolCode = await provider.getCode(poolAddress);
    console.log(`📄 Pool contract code length: ${poolCode.length} bytes`);
    
    if (poolCode === '0x') {
      console.log('⚠️ Pool contract not deployed at this address');
    } else {
      console.log('✅ Pool contract is deployed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBlockTransactions();
