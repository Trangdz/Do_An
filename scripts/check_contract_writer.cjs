const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  
  const writer = await aggregator.writer();
  console.log("\n📋 Current writer in contract:");
  console.log(`   ${writer}`);
  
  // Check both Chainlink addresses
  const node1 = "0x1343f74C056956115dDd2ACa510Dec451d2864Fc";
  const node2 = "0x3e058341c9f39Ee3fc80B9ED2BA12e0fca04f8C5";
  
  console.log("\n📋 Chainlink node addresses:");
  console.log(`   Node 1: ${node1}`);
  console.log(`   Node 2: ${node2}`);
  
  console.log("\n✅ Status:");
  if (writer.toLowerCase() === node1.toLowerCase()) {
    console.log(`   ✅ Node 1 is authorized`);
    console.log(`   ❌ Node 2 is NOT authorized`);
  } else if (writer.toLowerCase() === node2.toLowerCase()) {
    console.log(`   ❌ Node 1 is NOT authorized`);
    console.log(`   ✅ Node 2 is authorized`);
  } else {
    console.log(`   ❌ Neither node is authorized!`);
    console.log(`   Current writer: ${writer}`);
  }
  
  console.log("\n💡 Solution:");
  console.log("   The contract only allows ONE writer at a time.");
  console.log("   You need to set the writer to the address that is actually sending transactions.");
}

main().catch(console.error);



