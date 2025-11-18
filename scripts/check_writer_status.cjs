const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  
  const addresses = [
    "0x1343f74C056956115dDd2ACa510Dec451d2864Fc",
    "0x3e058341c9f39Ee3fc80B9ED2BA12e0fca04f8C5"
  ];
  
  console.log("Checking writer status for contract:", aggregatorAddress);
  console.log("=".repeat(60));
  
  for (const addr of addresses) {
    try {
      const isWriter = await aggregator.writers(addr);
      console.log(`${addr}: ${isWriter ? "✅ Authorized" : "❌ NOT Authorized"}`);
    } catch (err) {
      console.log(`${addr}: Error checking - ${err.message}`);
    }
  }
  
  // Check current writer
  try {
    const currentWriter = await aggregator.writer();
    console.log("\nCurrent writer:", currentWriter);
  } catch (err) {
    console.log("\nError getting current writer:", err.message);
  }
}

main().catch(console.error);

