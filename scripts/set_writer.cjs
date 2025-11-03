const hre = require("hardhat");
const data = require("../deployments/local-chainlink.json");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const aggregator = await hre.ethers.getContractAt("PriceAggregator", data.aggregator);
  const node = process.env.NODE_ADDRESS;
  const tx = await aggregator.connect(deployer).setWriter(node, true);
  await tx.wait();
  console.log("Authorized writer:", node);
}

main().catch(console.error);
