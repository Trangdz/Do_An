const hre = require("hardhat");
const fs = require("fs");

/**
 * Check recent transactions from Chainlink node in detail
 */
async function main() {
  // Read deployment address
  let aggregatorAddress;
  try {
    const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
    aggregatorAddress = data.contracts.multiPriceAggregator;
  } catch (e) {
    try {
      const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
      aggregatorAddress = data.aggregator;
    } catch (e2) {
      console.error("❌ Could not find MultiPriceAggregator address");
      process.exit(1);
    }
  }

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const provider = hre.ethers.provider;

  // Get writer (Chainlink node address)
  const writer = await aggregator.writer();
  console.log("=== Checking Recent Chainlink Transactions ===\n");
  console.log("Contract:", aggregatorAddress);
  console.log("Writer (Chainlink node):", writer);
  console.log("");

  // Check a wider range of blocks
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking blocks", currentBlock - 200, "to", currentBlock, "...\n");

  let chainlinkTxs = [];

  for (let i = currentBlock; i > Math.max(0, currentBlock - 200); i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
            if (tx.from.toLowerCase() === writer.toLowerCase()) {
              const receipt = await provider.getTransactionReceipt(txHash);
              chainlinkTxs.push({
                hash: txHash,
                block: i,
                from: tx.from,
                status: receipt.status,
                gasUsed: receipt.gasUsed.toString(),
                blockTimestamp: block.timestamp,
              });
            }
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  if (chainlinkTxs.length > 0) {
    console.log(`✅ Found ${chainlinkTxs.length} transaction(s) from Chainlink node:\n`);
    
    // Sort by block number (newest first)
    chainlinkTxs.sort((a, b) => b.block - a.block);
    
    for (const tx of chainlinkTxs.slice(0, 10)) {
      const blockTime = new Date(Number(tx.blockTimestamp) * 1000);
      const age = Math.floor((Date.now() - Number(tx.blockTimestamp) * 1000) / 1000);
      console.log(`Block ${tx.block} (${age}s ago, ${blockTime.toLocaleTimeString()}):`);
      console.log(`  Hash: ${tx.hash}`);
      console.log(`  Status: ${tx.status === 1 ? "✅ Success" : "❌ Failed"}`);
      console.log(`  Gas Used: ${tx.gasUsed}`);
      
      // Try to decode the transaction to see what symbol was updated
      try {
        const iface = new hre.ethers.Interface([
          'function updatePrice(string symbol, int256 price)'
        ]);
        const decoded = iface.parseTransaction({ data: tx.hash });
        if (decoded) {
          console.log(`  Function: updatePrice`);
        }
      } catch (e) {
        // Could not decode
      }
      console.log("");
    }

    // Check current prices
    console.log("\n=== Current Prices in Contract ===");
    const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK", "PEPE"];
    for (const symbol of symbols) {
      try {
        const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
        if (roundId > 0) {
          const priceUSD = Number(price) / 1e8;
          const age = Math.floor((Date.now() - Number(updatedAt) * 1000) / 1000);
          const blockTime = new Date(Number(updatedAt) * 1000);
          
          // Check if this price was updated by a recent Chainlink transaction
          const recentTx = chainlinkTxs.find(tx => {
            const txTime = Number(tx.blockTimestamp);
            return Math.abs(txTime - Number(updatedAt)) < 10; // Within 10 seconds
          });
          
          const source = recentTx ? "✅ Chainlink" : "⚠️  Manual/Old";
          console.log(`${symbol.padEnd(6)}: $${priceUSD.toFixed(2)} (Round ${roundId}, ${age}s ago, ${blockTime.toLocaleTimeString()}) ${source}`);
        } else {
          console.log(`${symbol.padEnd(6)}: ❌ No data`);
        }
      } catch (e) {
        console.log(`${symbol.padEnd(6)}: ❌ Error - ${e.message}`);
      }
    }
  } else {
    console.log("❌ No transactions found from Chainlink node in last 200 blocks!");
    console.log("\n⚠️  Chainlink jobs may be running but not successfully sending transactions.");
    console.log("   Check Chainlink UI at http://localhost:6688 to see job status and errors.");
  }
}

main().catch(console.error);





