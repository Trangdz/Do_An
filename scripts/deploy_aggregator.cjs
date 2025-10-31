const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy PriceAggregator với 8 decimals (chuẩn USD) và mô tả ETH/USD
  const Factory = await ethers.getContractFactory("PriceAggregator");
  const aggregator = await Factory.deploy(8, "ETH / USD");
  await aggregator.waitForDeployment();
  const addr = await aggregator.getAddress();
  console.log("PriceAggregator:", addr);

  const net = await ethers.provider.getNetwork();
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "price-aggregator.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: net.chainId.toString(),
        deployer: deployer.address,
        aggregator: addr,
        decimals: 8,
        description: "ETH / USD",
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

