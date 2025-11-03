const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const PriceConsumer = await hre.ethers.getContractFactory("PriceConsumer");
  const consumer = await PriceConsumer.deploy();
  await consumer.waitForDeployment();
  
  console.log("Deployer:", deployer.address);
  console.log("PriceConsumer deployed:", consumer.target);
  
  // Save to deployments
  const outDir = "deployments";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync("deployments/price-consumer.json",
    JSON.stringify({ priceConsumer: consumer.target }, null, 2));
}

main().catch(console.error);


