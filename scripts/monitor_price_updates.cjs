const hre = require("hardhat");
const fs = require("fs");

/**
 * Monitor price updates from Chainlink jobs
 * Check if prices are being updated by Chainlink node
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
  const writer = await aggregator.writer();

  console.log("=== Monitoring Price Updates from Chainlink ===\n");
  console.log("Contract:", aggregatorAddress);
  console.log("Writer (Chainlink node):", writer);
  console.log("\nMonitoring for 2 minutes... (Press Ctrl+C to stop)\n");

  const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK", "PEPE"];
  const initialPrices = {};

  // Get initial prices
  for (const symbol of symbols) {
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
      initialPrices[symbol] = {
        price: Number(price) / 1e8,
        roundId: Number(roundId),
        updatedAt: Number(updatedAt),
      };
    } catch (e) {
      initialPrices[symbol] = null;
    }
  }

  console.log("Initial prices:");
  for (const symbol of symbols) {
    if (initialPrices[symbol]) {
      const age = Math.floor((Date.now() - initialPrices[symbol].updatedAt * 1000) / 1000);
      console.log(`  ${symbol.padEnd(6)}: $${initialPrices[symbol].price.toFixed(2)} (Round ${initialPrices[symbol].roundId}, ${age}s ago)`);
    } else {
      console.log(`  ${symbol.padEnd(6)}: No data`);
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log("Waiting for updates from Chainlink jobs...\n");

  let checkCount = 0;
  const maxChecks = 24; // 2 minutes (5s intervals)

  const interval = setInterval(async () => {
    checkCount++;
    const updates = [];

    for (const symbol of symbols) {
      try {
        const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
        const currentPrice = Number(price) / 1e8;
        const currentRoundId = Number(roundId);
        const currentUpdatedAt = Number(updatedAt);

        const initial = initialPrices[symbol];
        if (initial) {
          // Check if price was updated
          if (currentRoundId > initial.roundId || currentUpdatedAt > initial.updatedAt) {
            const age = Math.floor((Date.now() - currentUpdatedAt * 1000) / 1000);
            updates.push({
              symbol,
              oldPrice: initial.price,
              newPrice: currentPrice,
              oldRoundId: initial.roundId,
              newRoundId: currentRoundId,
              age,
            });
            // Update initial for next check
            initialPrices[symbol] = {
              price: currentPrice,
              roundId: currentRoundId,
              updatedAt: currentUpdatedAt,
            };
          }
        }
      } catch (e) {
        // Skip errors
      }
    }

    if (updates.length > 0) {
      console.log(`\n[${new Date().toLocaleTimeString()}] ✅ Price updates detected:`);
      updates.forEach(update => {
        console.log(`  ${update.symbol.padEnd(6)}: $${update.oldPrice.toFixed(2)} → $${update.newPrice.toFixed(2)} (Round ${update.oldRoundId} → ${update.newRoundId}, ${update.age}s ago)`);
        console.log(`         ✅ Updated by Chainlink job!`);
      });
      console.log("");
    } else {
      process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Checking... (${checkCount}/${maxChecks})`);
    }

    if (checkCount >= maxChecks) {
      clearInterval(interval);
      console.log("\n\n=== Final Status ===");
      for (const symbol of symbols) {
        if (initialPrices[symbol]) {
          const age = Math.floor((Date.now() - initialPrices[symbol].updatedAt * 1000) / 1000);
          console.log(`  ${symbol.padEnd(6)}: $${initialPrices[symbol].price.toFixed(2)} (Round ${initialPrices[symbol].roundId}, ${age}s ago)`);
        }
      }
      console.log("\n✅ Monitoring complete");
      process.exit(0);
    }
  }, 5000); // Check every 5 seconds
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});





