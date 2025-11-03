const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const Factory = await hre.ethers.getContractFactory("MultiPriceAggregator");
  const aggregator = await Factory.deploy();
  await aggregator.waitForDeployment();
  
  const addr = await aggregator.getAddress();
  console.log("MultiPriceAggregator deployed:", addr);
  
  const outDir = "deployments";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  
  fs.writeFileSync(
    "deployments/multi-price.json",
    JSON.stringify({ aggregator: addr }, null, 2)
  );
  
  console.log("Saved to deployments/multi-price.json");
}

main().catch(console.error);

