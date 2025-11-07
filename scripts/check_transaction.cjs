const hre = require("hardhat");

async function main() {
  // Transaction hash từ Chainlink job (ví dụ)
  const txHash = process.argv[2];
  
  if (!txHash) {
    console.log("Usage: npx hardhat run scripts/check_transaction.cjs --network ganache <TX_HASH>");
    console.log("\nExample:");
    console.log('npx hardhat run scripts/check_transaction.cjs --network ganache "0xbcf7562c56ebe721de9ed00456479476d49e9567903155755beb95541ece3211"');
    return;
  }
  
  console.log("=== Checking Transaction ===\n");
  console.log("Transaction Hash:", txHash);
  console.log("");
  
  const provider = hre.ethers.provider;
  
  try {
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log("❌ Transaction not found");
      return;
    }
    
    console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("Block Number:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("From:", receipt.from);
    console.log("To:", receipt.to);
    console.log("");
    
    if (receipt.status === 0) {
      console.log("⚠️  Transaction failed (reverted)");
      console.log("\nPossible reasons:");
      console.log("1. Writer not authorized (msg.sender != writer)");
      console.log("2. Insufficient gas");
      console.log("3. Contract error");
      
      // Try to decode revert reason
      try {
        const tx = await provider.getTransaction(txHash);
        console.log("\nTransaction data:", tx.data.slice(0, 100) + "...");
      } catch (e) {
        console.log("Could not decode transaction");
      }
    } else {
      console.log("✅ Transaction succeeded");
      console.log("\nChecking if price was updated...");
      
      // Read MultiPriceAggregator to see if price was updated
      const multiPriceData = require("./deployments/multi-price.json");
      const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", multiPriceData.aggregator);
      
      // Check LINK price (from the image, it's LINK job)
      const [price, roundId, updatedAt] = await aggregator.getPrice("LINK");
      console.log("\nLINK Price in MultiPriceAggregator:");
      console.log("  Price:", price.toString());
      console.log("  Round ID:", roundId.toString());
      console.log("  Updated At:", new Date(Number(updatedAt) * 1000).toLocaleString());
      
      if (roundId > 0) {
        const priceUSD = Number(price) / 1e8;
        console.log("  Price USD: $", priceUSD.toFixed(2));
      } else {
        console.log("  ⚠️  Price not updated (roundId = 0)");
      }
    }
    
    // Check logs
    console.log("\n=== Transaction Logs ===");
    if (receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", log.address);
          const decoded = aggregator.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (decoded) {
            console.log("Event:", decoded.name);
            console.log("  Args:", decoded.args);
          }
        } catch (e) {
          // Not a MultiPriceAggregator log
        }
      }
    } else {
      console.log("No logs emitted");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);

