const hre = require("hardhat");

async function main() {
  console.log("=== Getting Chainlink Node Address ===\n");
  
  // Method 1: Check from recent transactions to MultiPriceAggregator
  const multiPriceData = require("./deployments/multi-price.json");
  const aggregatorAddress = multiPriceData.aggregator;
  const provider = hre.ethers.provider;
  
  console.log("Checking recent transactions to MultiPriceAggregator...");
  console.log("Contract:", aggregatorAddress);
  console.log("");
  
  const currentBlock = await provider.getBlockNumber();
  let nodeAddresses = new Set();
  
  for (let i = currentBlock; i > Math.max(0, currentBlock - 100); i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
            nodeAddresses.add(tx.from);
          }
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (nodeAddresses.size > 0) {
    console.log("Found Chainlink node address(es) from transactions:");
    for (const addr of nodeAddresses) {
      console.log("  ", addr);
    }
    console.log("");
    console.log("💡 Use this address to set writer:");
    console.log(`   $env:NODE_ADDRESS="${Array.from(nodeAddresses)[0]}"`);
    console.log("   npx hardhat run scripts/set_multi_writer.cjs --network ganache");
  } else {
    console.log("❌ No transactions found");
    console.log("\n💡 To find Chainlink node address:");
    console.log("   1. Open Chainlink UI: http://localhost:6688");
    console.log("   2. Go to Keys section");
    console.log("   3. Copy the sending address");
  }
}

main().catch(console.error);







































