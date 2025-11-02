const { ethers } = require("ethers");

async function main() {
  console.log("\n🔍 Testing Ganache CLI WebSocket Support...\n");
  
  try {
    // Test HTTP connection
    const httpProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const blockNumber = await httpProvider.getBlockNumber();
    console.log(`✅ HTTP connection works: Block ${blockNumber}`);
    
    // Test WebSocket connection (if available)
    try {
      const wsProvider = new ethers.WebSocketProvider('ws://127.0.0.1:8545');
      console.log("✅ WebSocket provider created");
      
      // Try to subscribe to new blocks
      wsProvider.on('block', (blockNumber) => {
        console.log(`📦 New block: ${blockNumber}`);
      });
      
      console.log("✅ WebSocket subscription active");
      console.log("   Waiting for new blocks... (press Ctrl+C to exit)\n");
      
      // Keep alive for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      wsProvider.destroy();
      console.log("\n✅ WebSocket test completed");
    } catch (wsError) {
      console.error("❌ WebSocket not supported:", wsError.message);
      console.log("   Ganache CLI may need WebSocket support enabled");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log("\n⚠️  Ganache is not running. Please start it first:");
      console.log("   - Run START_GANACHE_CLI.bat");
      console.log("   - Or: ganache --host 0.0.0.0 --port 8545 --networkId 5777");
    }
  }
}

main().catch(console.error);


