const hre = require("hardhat");
const axios = require("axios");
const fs = require("fs");

/**
 * Script to fetch real prices from Binance API and update MultiPriceAggregator
 * This simulates what Chainlink jobs do, but can be run manually
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
      process.exit(1);
    }
  }

  console.log("=== Update Prices from Binance API ===\n");
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

  // Price symbols and their Binance API symbols
  // NOTE: LINK is excluded - it should only be updated manually via update_link_price.cjs
  const priceFeeds = [
    { symbol: "ETH", binanceSymbol: "ETHUSDT" },
    { symbol: "WETH", binanceSymbol: "ETHUSDT" }, // WETH uses ETH price
    { symbol: "USDC", binanceSymbol: "USDCUSDT" },
    { symbol: "DAI", binanceSymbol: "USDCUSDT" }, // DAI is pegged to USD, use USDC price as proxy
    // LINK is excluded - use update_link_price.cjs to update manually
  ];

  console.log("\n📊 Fetching prices from Binance API...");
  console.log("─".repeat(50));

  for (const feed of priceFeeds) {
    try {
      // Fetch price from Binance
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${feed.binanceSymbol}`
      );
      const priceUSD = parseFloat(response.data.price);
      
      // Convert to 8 decimals (Chainlink format)
      const price8dec = Math.round(priceUSD * 1e8);
      
      console.log(`\n${feed.symbol}: $${priceUSD.toFixed(2)} (from Binance)`);
      console.log(`  Updating contract...`);
      
      const tx = await aggregator.updatePrice(feed.symbol, price8dec);
      console.log(`  Transaction: ${tx.hash}`);
      await tx.wait();
      
      // Verify the update
      const [updatedPrice, roundId, updatedAt] = await aggregator.getPrice(feed.symbol);
      const verifiedPrice = Number(updatedPrice) / 1e8;
      const age = Math.floor((Date.now() - Number(updatedAt) * 1000) / 1000);
      console.log(`  ✅ Updated: $${verifiedPrice.toFixed(2)} (Round ${roundId}, ${age}s ago)`);
    } catch (error) {
      if (error.response) {
        console.error(`  ❌ Error fetching ${feed.symbol} from Binance: ${error.response.status} ${error.response.statusText}`);
      } else if (error.message.includes("Not authorized")) {
        console.error(`  ❌ Error updating ${feed.symbol}: Not authorized (writer mismatch)`);
      } else {
        console.error(`  ❌ Error updating ${feed.symbol}:`, error.message);
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
  console.log("\n💡 Prices are now fetched from Binance API and stored in contract.");
  console.log("   Frontend will display these real-time prices.");
  console.log("\n⚠️  NOTE: LINK price is NOT updated by this script.");
  console.log("   To update LINK price, use: npx hardhat run scripts/update_link_price.cjs --network ganache --price <amount>");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

