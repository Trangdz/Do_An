const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", data.aggregator);
  
  const node = process.env.NODE_ADDRESS || "0x805436EB3fd7BeF4F4c67D4bfAdD2e62A8f9903b";
  const tx = await aggregator.connect(deployer).setWriter(node, true);
  await tx.wait();
  
  console.log("✅ Authorized writer:", node);
  console.log("Contract:", data.aggregator);
}

main().catch(console.error);

