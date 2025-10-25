const { ethers } = require('hardhat');
require('dotenv').config({ path: './config.env' });

async function debugBlockchain() {
  try {
    console.log('🔍 Debugging blockchain connection...');
    
    // Connect to provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    console.log(`📡 RPC URL: ${process.env.RPC_URL}`);
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Get pool contract
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    console.log(`🏦 Pool Address: ${poolAddress}`);
    
    const poolABI = [
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)'
    ];
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Check if pool contract exists
    try {
      const code = await provider.getCode(poolAddress);
      if (code === '0x') {
        console.log('❌ Pool contract does not exist at this address');
        return;
      }
      console.log('✅ Pool contract exists');
    } catch (error) {
      console.log('❌ Error checking pool contract:', error.message);
      return;
    }
    
    // Get recent events from last 10 blocks
    const fromBlock = Math.max(0, latestBlock - 10);
    console.log(`🔍 Checking events from block ${fromBlock} to ${latestBlock}`);
    
    const [suppliedEvents, withdrawnEvents, borrowedEvents, repaidEvents] = await Promise.all([
      pool.queryFilter('Supplied', fromBlock, latestBlock),
      pool.queryFilter('Withdrawn', fromBlock, latestBlock),
      pool.queryFilter('Borrowed', fromBlock, latestBlock),
      pool.queryFilter('Repaid', fromBlock, latestBlock)
    ]);
    
    console.log(`📊 Found events:`);
    console.log(`   Supplied: ${suppliedEvents.length}`);
    console.log(`   Withdrawn: ${withdrawnEvents.length}`);
    console.log(`   Borrowed: ${borrowedEvents.length}`);
    console.log(`   Repaid: ${repaidEvents.length}`);
    
    const totalEvents = suppliedEvents.length + withdrawnEvents.length + borrowedEvents.length + repaidEvents.length;
    console.log(`📈 Total events: ${totalEvents}`);
    
    if (totalEvents > 0) {
      console.log('\n🔍 Recent events:');
      
      // Show recent supplied events
      suppliedEvents.slice(-3).forEach((event, i) => {
        console.log(`   ${i+1}. Supplied: ${event.args.user} -> ${event.args.asset} (${event.args.amount})`);
      });
      
      // Show recent withdrawn events
      withdrawnEvents.slice(-3).forEach((event, i) => {
        console.log(`   ${i+1}. Withdrawn: ${event.args.user} -> ${event.args.asset} (${event.args.amount})`);
      });
    } else {
      console.log('⚠️ No events found in recent blocks');
      console.log('💡 Try making a transaction on the frontend to generate events');
    }
    
  } catch (error) {
    console.error('❌ Error debugging blockchain:', error);
  }
}

debugBlockchain();
