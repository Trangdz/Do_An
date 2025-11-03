const hre = require("hardhat");
const data = require("../deployments/local-chainlink.json");

async function main() {
  const aggregator = await hre.ethers.getContractAt("PriceAggregator", data.aggregator);
  const nodeAddress = "0x805436EB3fd7BeF4F4c67D4bfAdD2e62A8f9903b";
  
  console.log("=== PriceAggregator Status ===");
  console.log("Contract:", data.aggregator);
  console.log("Node Address:", nodeAddress);
  
  // Check current writer
  const writer = await aggregator.writer();
  console.log("\nCurrent Writer:", writer);
  console.log("Node is authorized:", writer.toLowerCase() === nodeAddress.toLowerCase());
  
  // Check latest round data
  try {
    const [roundId, answer, updatedAt] = await aggregator.latestRoundData();
    const answerNum = Number(answer);
    console.log("\n=== Latest Price Data ===");
    console.log("Round ID:", roundId.toString());
    console.log("Answer:", answerNum / 1e8, "USD");
    console.log("Updated At:", new Date(Number(updatedAt) * 1000).toISOString());
    
    if (answerNum === 0n) {
      console.log("\n⚠️  Price is still 0 - job may not have run yet or failed");
    }
  } catch (error) {
    console.log("\n❌ Error reading round data:", error.message);
  }
  
  // Check node balance
  const balance = await hre.ethers.provider.getBalance(nodeAddress);
  console.log("\n=== Node Balance ===");
  console.log("ETH Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("⚠️  Node has no ETH - needs funding!");
  }
}

main().catch(console.error);


