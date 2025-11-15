const hre = require("hardhat");
const fs = require("fs");

/**
 * Script to automatically find Chainlink node address from recent transactions
 * and set it as writer for MultiPriceAggregator
 */
async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  if (!aggregatorAddress) {
    throw new Error("multiPriceAggregator address not found in deployments/local-chainlink.json");
  }

  console.log("=== Finding Chainlink Node Address ===\n");
  console.log("MultiPriceAggregator:", aggregatorAddress);
  console.log("");

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const provider = hre.ethers.provider;

  // Check current writer
  const currentWriter = await aggregator.writer();
  console.log("Current Writer:", currentWriter);
  if (currentWriter !== "0x0000000000000000000000000000000000000000") {
    console.log("✅ Writer is already set!");
    console.log("   If you want to change it, use set_multi_writer.cjs with NODE_ADDRESS env var");
    return;
  }

  // Try to find node address from environment
  const nodeAddressFromEnv = process.env.NODE_ADDRESS;
  if (nodeAddressFromEnv) {
    console.log("📝 Found NODE_ADDRESS from environment:", nodeAddressFromEnv);
    console.log("\n🔐 Setting writer...");
    const [deployer] = await hre.ethers.getSigners();
    const tx = await aggregator.connect(deployer).setWriter(nodeAddressFromEnv, true);
    await tx.wait();
    console.log("✅ Writer set to:", nodeAddressFromEnv);
    return;
  }

  // Try to find from recent transactions
  console.log("🔍 Searching for Chainlink node address from recent transactions...");
  const currentBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, currentBlock - 100); // Check last 100 blocks
  
  console.log(`Checking blocks ${startBlock} to ${currentBlock}...\n`);

  // Look for transactions calling updatePrice
  const filter = aggregator.filters.PriceUpdated();
  let logs = [];
  try {
    logs = await provider.getLogs({
      address: aggregatorAddress,
      topics: filter.topics,
      fromBlock: startBlock,
      toBlock: currentBlock,
    });
  } catch (e) {
    console.log("⚠️  Could not fetch logs:", e.message);
  }

  // Also check direct transactions to the contract
  const candidateAddresses = new Map();
  
  for (let i = currentBlock; i >= startBlock; i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
            // Check if this transaction calls updatePrice
            if (tx.data && tx.data.startsWith("0x")) {
              // updatePrice(string, int256) selector: 0x7dc0d1d0
              if (tx.data.startsWith("0x7dc0d1d0")) {
                const count = candidateAddresses.get(tx.from.toLowerCase()) || 0;
                candidateAddresses.set(tx.from.toLowerCase(), count + 1);
              }
            }
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  if (candidateAddresses.size > 0) {
    console.log("Found candidate addresses:\n");
    const sorted = Array.from(candidateAddresses.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [addr, count] of sorted) {
      console.log(`  ${addr} (${count} updatePrice call(s))`);
    }

    const mostLikely = sorted[0][0];
    console.log(`\n🎯 Most likely Chainlink node address: ${mostLikely}`);
    console.log("\n🔐 Setting writer...");
    
    const [deployer] = await hre.ethers.getSigners();
    const tx = await aggregator.connect(deployer).setWriter(mostLikely, true);
    await tx.wait();
    console.log("✅ Writer set to:", mostLikely);
    console.log("\n💡 To verify, run: npx hardhat run scripts/check_multi_price_aggregator.cjs --network ganache");
  } else {
    console.log("❌ Could not find Chainlink node address from transactions");
    console.log("\n💡 Solutions:");
    console.log("   1. Set NODE_ADDRESS environment variable:");
    console.log("      $env:NODE_ADDRESS=\"0xYOUR_NODE_ADDRESS\"");
    console.log("      npx hardhat run scripts/set_multi_writer.cjs --network ganache");
    console.log("   2. Get node address from Chainlink UI:");
    console.log("      - Open http://localhost:6688");
    console.log("      - Go to Keys section");
    console.log("      - Copy the ETH address");
    console.log("   3. Wait for Chainlink jobs to run and try again");
  }
}

main().catch(console.error);










