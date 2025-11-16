const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Read addresses
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  if (!aggregatorAddress) {
    throw new Error("multiPriceAggregator address not found in deployments/local-chainlink.json");
  }
  
  console.log("=== Verifying Writer and Price Update ===\n");
  console.log("MultiPriceAggregator:", aggregatorAddress);
  console.log("");
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const provider = hre.ethers.provider;
  
  // Check writer
  const writer = await aggregator.writer();
  console.log("Writer (authorized address):", writer);
  console.log("");
  
  // Get recent transactions to MultiPriceAggregator
  console.log("=== Recent Transactions to MultiPriceAggregator ===");
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 50 blocks for transactions...\n");
  
  let foundTxs = [];
  for (let i = currentBlock; i > Math.max(0, currentBlock - 50); i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
            const receipt = await provider.getTransactionReceipt(txHash);
            foundTxs.push({
              hash: txHash,
              block: i,
              from: tx.from,
              status: receipt.status,
              gasUsed: receipt.gasUsed.toString()
            });
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  if (foundTxs.length > 0) {
    console.log(`Found ${foundTxs.length} transaction(s):\n`);
    for (const tx of foundTxs.slice(0, 10)) { // Show last 10
      console.log(`Hash: ${tx.hash}`);
      console.log(`  Block: ${tx.block}`);
      console.log(`  From: ${tx.from}`);
      console.log(`  Status: ${tx.status === 1 ? "✅ Success" : "❌ Failed"}`);
      console.log(`  Gas Used: ${tx.gasUsed}`);
      
      // Check if from address matches writer
      if (tx.from.toLowerCase() === writer.toLowerCase()) {
        console.log(`  ✅ From address matches writer`);
      } else {
        console.log(`  ❌ From address does NOT match writer!`);
        console.log(`     Expected: ${writer}`);
        console.log(`     Got:      ${tx.from}`);
      }
      console.log("");
    }
  } else {
    console.log("❌ No transactions found to MultiPriceAggregator in last 50 blocks");
  }
  
  // Check prices
  console.log("=== Current Prices ===");
  const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK"];
  for (const symbol of symbols) {
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
      if (roundId > 0) {
        const priceUSD = Number(price) / 1e8;
        const date = new Date(Number(updatedAt) * 1000);
        console.log(`${symbol.padEnd(6)}: $${priceUSD.toFixed(2)} (Round ${roundId}, Updated: ${date.toLocaleTimeString()})`);
      } else {
        console.log(`${symbol.padEnd(6)}: ❌ No data (roundId: ${roundId})`);
      }
    } catch (e) {
      console.log(`${symbol.padEnd(6)}: ❌ Error - ${e.message}`);
    }
  }
  
  // Recommendations
  console.log("\n=== Analysis ===");
  if (foundTxs.length > 0) {
    const failedTxs = foundTxs.filter(tx => tx.status === 0);
    if (failedTxs.length > 0) {
      console.log(`⚠️  Found ${failedTxs.length} failed transaction(s)`);
      console.log("   Possible reasons:");
      console.log("   1. Writer not authorized (msg.sender != writer)");
      console.log("   2. Check transaction hash in Chainlink UI for revert reason");
    }
    
    const wrongWriterTxs = foundTxs.filter(tx => tx.from.toLowerCase() !== writer.toLowerCase());
    if (wrongWriterTxs.length > 0) {
      console.log(`\n⚠️  Found ${wrongWriterTxs.length} transaction(s) from wrong address`);
      console.log("   Chainlink node address does not match writer!");
      console.log("   Solution: Update writer to match Chainlink node address");
    }
  } else {
    console.log("⚠️  No transactions found");
    console.log("   Possible reasons:");
    console.log("   1. Chainlink jobs not running");
    console.log("   2. Jobs not created in Chainlink node");
    console.log("   3. Node address in jobs does not match actual node address");
  }
}

main().catch(console.error);








































