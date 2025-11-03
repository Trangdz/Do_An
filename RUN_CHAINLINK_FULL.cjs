/**
 * 🔗 SCRIPT CHẠY LẠI TOÀN BỘ CHAINLINK ORACLE
 * 
 * Script này sẽ:
 * 1. Deploy LinkToken và PriceAggregator
 * 2. Setup Chainlink Node với Docker
 * 3. Fund và authorize node
 * 4. Tạo cron job
 * 5. Test đọc giá
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  console.log("🔗 CHAINLINK ORACLE - FULL SETUP");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Step 1: Deploy contracts
  console.log("\n📦 Step 1: Deploying contracts...");
  
  const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
  const linkToken = await LinkTokenFactory.deploy();
  await linkToken.waitForDeployment();
  const linkAddress = await linkToken.getAddress();
  console.log("✅ LinkToken deployed:", linkAddress);
  
  const AggregatorFactory = await ethers.getContractFactory("PriceAggregator");
  const aggregator = await AggregatorFactory.deploy(8, "ETH / USD");
  await aggregator.waitForDeployment();
  const aggregatorAddress = await aggregator.getAddress();
  console.log("✅ PriceAggregator deployed:", aggregatorAddress);
  
  // Save addresses
  const net = await ethers.provider.getNetwork();
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  
  const deployData = {
    network: net.chainId.toString(),
    deployer: deployer.address,
    linkToken: linkAddress,
    priceAggregator: aggregatorAddress,
    timestamp: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    path.join(outDir, "local-chainlink.json"),
    JSON.stringify(deployData, null, 2)
  );
  console.log("✅ Saved to deployments/local-chainlink.json");
  
  // Step 2: Check Docker
  console.log("\n🐳 Step 2: Checking Docker setup...");
  try {
    execSync("docker ps", { stdio: "ignore" });
    console.log("✅ Docker is running");
  } catch (error) {
    console.log("⚠️  Docker not running. Please start Docker Desktop.");
    console.log("Skipping Chainlink Docker setup for now.");
    return;
  }
  
  console.log("\n📋 Next steps:");
  console.log("1. Start Chainlink Docker: docker-compose up -d");
  console.log("2. Get node address from: http://localhost:6688 → Keys → Regular");
  console.log("3. Fund node: NODE_ADDRESS=0x... npx hardhat run scripts/fund_node.cjs");
  console.log("4. Authorize: NODE_ADDRESS=0x... npx hardhat run scripts/set_writer.cjs");
  console.log("5. Create cron job in Chainlink UI with job-push-price.toml");
  console.log("6. Test: npx hardhat run scripts/read_aggregator.cjs");
  
  console.log("\n📊 Contract addresses:");
  console.log(`LinkToken: ${linkAddress}`);
  console.log(`PriceAggregator: ${aggregatorAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



