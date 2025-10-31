/*
  Deploy local LinkToken (ERC677) and Operator (@chainlink/contracts) to local chain.
  Usage:
    npx hardhat run scripts/deploy_ganache_simple.cjs --network localhost
  Optional: authorize node address (from Chainlink UI → Keys → Regular)
    NODE_ADDRESS=0xYourNodeAddress npx hardhat run scripts/deploy_ganache_simple.cjs --network localhost
*/

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // 1) Deploy local LinkToken (contracts/LinkToken.sol)
  const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
  const linkToken = await LinkTokenFactory.deploy();
  await linkToken.waitForDeployment();
  const linkAddress = await linkToken.getAddress();
  console.log("LINK token deployed:", linkAddress);

  // 2) Deploy PriceAggregator (tuân chuẩn AggregatorV3Interface)
  const AggregatorFactory = await ethers.getContractFactory("PriceAggregator");
  const aggregator = await AggregatorFactory.deploy(8, "ETH / USD");
  await aggregator.waitForDeployment();
  const aggregatorAddress = await aggregator.getAddress();
  console.log("PriceAggregator deployed:", aggregatorAddress);

  // 3) Persist addresses
  const net = await ethers.provider.getNetwork();
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "local-chainlink.json");
  const data = {
    network: net.chainId.toString(),
    deployer: deployer.address,
    linkToken: linkAddress,
    priceAggregator: aggregatorAddress,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log("Saved:", outPath);
  console.log("\nNext steps:");
  console.log("1. Get node address from UI → Keys → EVM Chain Accounts (Regular)");
  console.log("2. Fund node: NODE_ADDRESS=0xNODE npx hardhat run scripts/fund_node.cjs --network ganache");
  console.log("3. Create cron job in UI with to=\"" + aggregatorAddress + "\"");
  console.log("4. Wait 1 min, then read: npx hardhat run scripts/read_aggregator.cjs --network ganache");

  const balance = await linkToken.balanceOf(deployer.address);
  console.log("Deployer LINK balance:", balance.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

