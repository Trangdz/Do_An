const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Deploy PriceAggregator
  const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");
  const priceAggregator = await PriceAggregator.deploy();
  await priceAggregator.waitForDeployment();
  console.log("PriceAggregator deployed:", priceAggregator.target);
  
  // Deploy MultiPriceAggregator
  const MultiPriceAggregator = await hre.ethers.getContractFactory("MultiPriceAggregator");
  const multiPriceAggregator = await MultiPriceAggregator.deploy();
  await multiPriceAggregator.waitForDeployment();
  const multiAddr = await multiPriceAggregator.getAddress();
  console.log("MultiPriceAggregator deployed:", multiAddr);
  
  // Ensure deployments directory exists
  const outDir = "deployments";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  
  // Save PriceAggregator deployment
  fs.writeFileSync(
    "deployments/local-chainlink.json",
    JSON.stringify({ aggregator: priceAggregator.target }, null, 2)
  );
  
  // Save MultiPriceAggregator deployment
  fs.writeFileSync(
    "deployments/multi-price.json",
    JSON.stringify({ aggregator: multiAddr }, null, 2)
  );
  
  console.log("");
  console.log("Saved to deployments/local-chainlink.json");
  console.log("Saved to deployments/multi-price.json");
}

main().catch(console.error);
