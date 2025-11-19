const hre = require("hardhat");
const fs = require("fs");

/**
 * Check block 1181 specifically for Chainlink transaction
 */
async function main() {
  // Read deployment address
  let aggregatorAddress;
  try {
    const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
    aggregatorAddress = data.aggregator;
  } catch (e2) {
    console.error("❌ Could not find MultiPriceAggregator address");
    process.exit(1);
  }

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const provider = hre.ethers.provider;

  const writer = await aggregator.writer();
  console.log("=== Checking Block 1181 (0x49d) ===\n");
  console.log("Contract:", aggregatorAddress);
  console.log("Writer:", writer);
  console.log("");

  const blockNumber = 1181; // 0x49d from the image
  try {
    const block = await provider.getBlock(blockNumber, true);
    console.log(`Block ${blockNumber}:`);
    console.log(`  Timestamp: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}`);
    console.log(`  Transactions: ${block.transactions.length}`);
    console.log("");

    let foundTxs = [];

    for (const txHash of block.transactions) {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
        const receipt = await provider.getTransactionReceipt(txHash);
        foundTxs.push({
          hash: txHash,
          from: tx.from,
          status: receipt.status,
          gasUsed: receipt.gasUsed.toString(),
        });
      }
    }

    if (foundTxs.length > 0) {
      console.log(`Found ${foundTxs.length} transaction(s) to MultiPriceAggregator:\n`);
      for (const tx of foundTxs) {
        console.log(`Hash: ${tx.hash}`);
        console.log(`From: ${tx.from}`);
        console.log(`Status: ${tx.status === 1 ? "✅ Success" : "❌ Failed"}`);
        console.log(`Gas Used: ${tx.gasUsed}`);
        
        if (tx.from.toLowerCase() === writer.toLowerCase()) {
          console.log(`✅ This is from Chainlink node!`);
        } else {
          console.log(`⚠️  This is NOT from Chainlink node (writer: ${writer})`);
        }
        
        // Try to decode
        try {
          const txData = await provider.getTransaction(tx.hash);
          const iface = new hre.ethers.Interface([
            'function updatePrice(string symbol, int256 price)'
          ]);
          const decoded = iface.parseTransaction({ data: txData.data });
          if (decoded) {
            console.log(`Function: updatePrice`);
            console.log(`Symbol: ${decoded.args[0]}`);
            const price = Number(decoded.args[1]) / 1e8;
            console.log(`Price: $${price.toFixed(2)}`);
          }
        } catch (e) {
          // Could not decode
        }
        console.log("");
      }
    } else {
      console.log("❌ No transactions to MultiPriceAggregator in this block");
    }

  } catch (error) {
    console.error(`❌ Error checking block ${blockNumber}:`, error.message);
  }
}

main().catch(console.error);




