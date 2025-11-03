const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", data.aggregator);
  
  const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK"];
  
  console.log("=== Multi-Price Aggregator ===");
  console.log("Contract:", data.aggregator);
  console.log("");
  
  for (const symbol of symbols) {
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
      const priceNum = Number(price);
      
      if (roundId > 0) {
        const priceUSD = priceNum / 1e8;
        const date = new Date(Number(updatedAt) * 1000);
        console.log(`${symbol.padEnd(6)}: $${priceUSD.toFixed(2)} (Round ${roundId}, Updated: ${date.toLocaleTimeString()})`);
      } else {
        console.log(`${symbol.padEnd(6)}: No data yet`);
      }
    } catch (error) {
      console.log(`${symbol.padEnd(6)}: Error - ${error.message}`);
    }
  }
  
  console.log("");
  const symbolCount = await aggregator.getSymbolCount();
  console.log(`Total symbols tracked: ${symbolCount}`);
}

main().catch(console.error);

