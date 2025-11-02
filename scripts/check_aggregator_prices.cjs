const { ethers } = require("hardhat");
const fs = require("fs");

const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

async function main() {
  console.log("\n🔍 Checking prices in aggregators...\n");
  
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  for (const [symbol, address] of Object.entries(aggregators)) {
    try {
      const aggregator = new ethers.Contract(address, AGGREGATOR_ABI, provider);
      
      // Try to get decimals and latest round data
      try {
        const decimals = await aggregator.decimals();
        const [roundId, answer, , updatedAt] = await aggregator.latestRoundData();
        
        const price = parseFloat(ethers.formatUnits(answer, decimals));
        const updatedDate = new Date(Number(updatedAt) * 1000);
        const now = Date.now();
        const ageSeconds = Math.floor((now - updatedDate.getTime()) / 1000);
        
        console.log(`${symbol}:`);
        console.log(`  Address: ${address}`);
        console.log(`  Price: $${price.toFixed(2)}`);
        console.log(`  Round ID: ${roundId.toString()}`);
        console.log(`  Updated: ${updatedDate.toLocaleString()} (${ageSeconds}s ago)`);
        console.log("");
      } catch (error) {
        if (error.message?.includes('NoData') || error.message?.includes('execution reverted')) {
          console.log(`${symbol}:`);
          console.log(`  Address: ${address}`);
          console.log(`  Status: ⚠️  No price data yet (Chainlink hasn't updated)`);
          console.log("");
        } else {
          console.log(`${symbol}:`);
          console.log(`  Address: ${address}`);
          console.log(`  Error: ${error.message}`);
          console.log("");
        }
      }
    } catch (error) {
      console.log(`${symbol}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Error: ${error.message}`);
      console.log("");
    }
  }
  
  console.log("💡 If prices show 'No data yet', wait 1-2 minutes for Chainlink jobs to run");
  console.log("   Jobs run every 1 minute (cron schedule: @every 1m)\n");
}

main().catch(console.error);



