const hre = require("hardhat");
const axios = require("axios");
const fs = require("fs");

/**
 * Script to automatically update prices from Binance API
 * Can be run as a cron job or scheduled task
 * 
 * Usage:
 *   node scripts/auto_update_prices.cjs
 *   Or set up cron: */5 * * * * cd /path/to/project && node scripts/auto_update_prices.cjs
 */
async function updatePrices() {
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
      return false;
    }
  }

  const [deployer] = await hre.ethers.getSigners();
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);

  // Check current writer
  const writer = await aggregator.writer();
  
  // If deployer is not the writer, temporarily set it
  let needsWriterChange = false;
  if (writer.toLowerCase() !== deployer.address.toLowerCase() && writer !== "0x0000000000000000000000000000000000000000") {
    const tx = await aggregator.setWriter(deployer.address, true);
    await tx.wait();
    needsWriterChange = true;
  }

  // Price symbols and their Binance API symbols
  const priceFeeds = [
    { symbol: "ETH", binanceSymbol: "ETHUSDT" },
    { symbol: "WETH", binanceSymbol: "ETHUSDT" },
    { symbol: "USDC", binanceSymbol: "USDCUSDT" },
    { symbol: "DAI", binanceSymbol: "USDCUSDT" }, // DAI uses USDC price as proxy
    { symbol: "LINK", binanceSymbol: "LINKUSDT" },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const feed of priceFeeds) {
    try {
      // Fetch price from Binance
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${feed.binanceSymbol}`,
        { timeout: 5000 }
      );
      const priceUSD = parseFloat(response.data.price);
      
      // Convert to 8 decimals (Chainlink format)
      const price8dec = Math.round(priceUSD * 1e8);
      
      // Update contract
      const tx = await aggregator.updatePrice(feed.symbol, price8dec);
      await tx.wait();
      
      successCount++;
      console.log(`✅ ${feed.symbol}: $${priceUSD.toFixed(2)}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ ${feed.symbol}: ${error.message}`);
    }
  }

  // Restore original writer if we changed it
  if (needsWriterChange && writer !== "0x0000000000000000000000000000000000000000") {
    const restoreTx = await aggregator.setWriter(writer, true);
    await restoreTx.wait();
  }

  return successCount > 0;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting price update...`);
  
  try {
    const success = await updatePrices();
    if (success) {
      console.log(`[${new Date().toISOString()}] ✅ Price update completed`);
    } else {
      console.log(`[${new Date().toISOString()}] ❌ Price update failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updatePrices };




