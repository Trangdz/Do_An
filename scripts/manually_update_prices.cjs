const hre = require("hardhat");
const fs = require("fs");

/**
 * Script to manually update prices in MultiPriceAggregator for testing
 * This simulates what Chainlink jobs would do
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
      console.error("❌ Could not find MultiPriceAggregator address in deployments");
      console.error("   Make sure you've deployed the contract first");
      process.exit(1);
    }
  }

  console.log("=== Manually Update Prices in MultiPriceAggregator ===\n");
  console.log("Contract Address:", aggregatorAddress);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("");

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);

  // Check current writer
  const writer = await aggregator.writer();
  console.log("Current writer:", writer);
  console.log("Deployer address:", deployer.address);
  console.log("");

  // If deployer is not the writer, we need to set it temporarily
  let needsWriterChange = false;
  if (writer.toLowerCase() !== deployer.address.toLowerCase() && writer !== "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Deployer is not the writer. Setting deployer as writer temporarily...");
    const tx = await aggregator.setWriter(deployer.address, true);
    await tx.wait();
    console.log("✅ Writer set to deployer");
    needsWriterChange = true;
  } else if (writer === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  No writer set. Setting deployer as writer...");
    const tx = await aggregator.setWriter(deployer.address, true);
    await tx.wait();
    console.log("✅ Writer set to deployer");
  }

  // Sample prices (in 8 decimals, e.g., 300000000000 = $3000.00)
  // These are approximate current prices - you can update them
  const prices = {
    ETH: 300000000000,   // $3000.00 (3000 * 1e8)
    WETH: 300000000000,  // $3000.00
    USDC: 100000000,     // $1.00
    DAI: 100000000,      // $1.00
    LINK: 1500000000,    // $15.00
  };

  console.log("\n📊 Updating prices:");
  console.log("─".repeat(50));

  for (const [symbol, price8dec] of Object.entries(prices)) {
    try {
      const priceUSD = price8dec / 1e8;
      console.log(`\nUpdating ${symbol} to $${priceUSD.toFixed(2)}...`);
      
      const tx = await aggregator.updatePrice(symbol, price8dec);
      console.log(`  Transaction: ${tx.hash}`);
      await tx.wait();
      
      // Verify the update
      const [updatedPrice, roundId, updatedAt] = await aggregator.getPrice(symbol);
      const verifiedPrice = Number(updatedPrice) / 1e8;
      console.log(`  ✅ ${symbol}: $${verifiedPrice.toFixed(2)} (Round ${roundId})`);
    } catch (error) {
      console.error(`  ❌ Error updating ${symbol}:`, error.message);
      if (error.message.includes("Not authorized")) {
        console.error("     Make sure deployer is set as writer");
      }
    }
  }

  // Restore original writer if we changed it
  if (needsWriterChange && writer !== "0x0000000000000000000000000000000000000000") {
    console.log("\n⚠️  Restoring original writer...");
    const restoreTx = await aggregator.setWriter(writer, true);
    await restoreTx.wait();
    console.log("✅ Original writer restored:", writer);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Price update complete!");
  console.log("\n💡 Note: These are test prices. For production, use Chainlink jobs.");
  console.log("   To check prices, run: npx hardhat run scripts/check_multi_price_aggregator.cjs --network ganache");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

