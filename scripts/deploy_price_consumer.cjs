const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("PriceConsumer");
  const consumer = await Factory.deploy();
  await consumer.waitForDeployment();
  const addr = await consumer.getAddress();
  console.log("PriceConsumer:", addr);

  const net = await ethers.provider.getNetwork();
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "price-consumer.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: net.chainId.toString(),
        deployer: deployer.address,
        consumer: addr,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log("Saved:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
