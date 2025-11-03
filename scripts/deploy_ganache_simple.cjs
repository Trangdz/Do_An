const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Aggregator = await hre.ethers.getContractFactory("PriceAggregator");
  const aggregator = await Aggregator.deploy();
  await aggregator.waitForDeployment();
  console.log("Deployer:", deployer.address);
  console.log("PriceAggregator deployed:", aggregator.target);
  fs.writeFileSync("deployments/local-chainlink.json",
    JSON.stringify({ aggregator: aggregator.target }, null, 2));
}

main().catch(console.error);
