const hre = require("hardhat");
const fs = require("fs");

/**
 * Check if Chainlink node is sending transactions to MultiPriceAggregator
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

  console.log("=== Checking Chainlink Node Transactions ===\n");
  console.log("Contract:", aggregatorAddress);
  console.log("");

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const provider = hre.ethers.provider;

  // Get writer (Chainlink node address)
  const writer = await aggregator.writer();
  console.log("Writer (Chainlink node):", writer);
  console.log("");

  // Check balance
  const balance = await provider.getBalance(writer);
  console.log("Node balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  // Get recent transactions from Chainlink node
  console.log("=== Recent Transactions from Chainlink Node ===");
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 100 blocks...\n");

  let chainlinkTxs = [];
  let otherTxs = [];

  for (let i = currentBlock; i > Math.max(0, currentBlock - 100); i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
            const receipt = await provider.getTransactionReceipt(txHash);
            const txData = {
              hash: txHash,
              block: i,
              from: tx.from,
              status: receipt.status,
              gasUsed: receipt.gasUsed.toString(),
            };

            if (tx.from.toLowerCase() === writer.toLowerCase()) {
              chainlinkTxs.push(txData);
            } else {
              otherTxs.push(txData);
            }
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`Found ${chainlinkTxs.length} transaction(s) from Chainlink node:`);
  if (chainlinkTxs.length > 0) {
    console.log("");
    for (const tx of chainlinkTxs.slice(0, 10)) {
      console.log(`✅ Block ${tx.block}: ${tx.hash}`);
      console.log(`   Status: ${tx.status === 1 ? "Success" : "Failed"}`);
      console.log(`   Gas Used: ${tx.gasUsed}`);
      console.log("");
    }
  } else {
    console.log("❌ No transactions found from Chainlink node!");
    console.log("\n⚠️  This means Chainlink jobs are not successfully sending transactions.");
    console.log("   Possible reasons:");
    console.log("   1. Jobs are failing (check Chainlink UI logs)");
    console.log("   2. Node doesn't have enough ETH (current balance shown above)");
    console.log("   3. Contract address in jobs is incorrect");
    console.log("   4. Writer permission issue");
  }

  if (otherTxs.length > 0) {
    console.log(`\nFound ${otherTxs.length} transaction(s) from other addresses:`);
    const fromAddresses = new Set(otherTxs.map(tx => tx.from));
    fromAddresses.forEach(addr => {
      const count = otherTxs.filter(tx => tx.from === addr).length;
      console.log(`   ${addr}: ${count} transaction(s)`);
    });
  }

  // Check current prices
  console.log("\n=== Current Prices in Contract ===");
  const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK"];
  for (const symbol of symbols) {
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
      if (roundId > 0) {
        const priceUSD = Number(price) / 1e8;
        const age = Math.floor((Date.now() - Number(updatedAt) * 1000) / 1000);
        const fromChainlink = chainlinkTxs.some(tx => {
          // Check if any transaction from Chainlink node happened around the update time
          return Math.abs(age - (currentBlock - tx.block) * 2) < 60; // Rough estimate
        });
        const source = fromChainlink ? "✅ Chainlink" : "⚠️  Manual";
        console.log(`${symbol.padEnd(6)}: $${priceUSD.toFixed(2)} (Round ${roundId}, ${age}s ago) ${source}`);
      } else {
        console.log(`${symbol.padEnd(6)}: ❌ No data`);
      }
    } catch (e) {
      console.log(`${symbol.padEnd(6)}: ❌ Error - ${e.message}`);
    }
  }
}

main().catch(console.error);



