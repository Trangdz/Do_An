const { ethers } = require("hardhat");

async function main() {
  console.log("🏦 Deploying LendHub v2 Core Contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Deploy InterestRateModel
  console.log("\n📊 Deploying InterestRateModel...");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  console.log("✅ InterestRateModel deployed at:", await interestRateModel.getAddress());
  
  // Deploy PriceOracle
  console.log("\n💰 Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("✅ PriceOracle deployed at:", await priceOracle.getAddress());
  
  // Deploy LendingPool
  console.log("\n🏦 Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    await interestRateModel.getAddress(),
    await priceOracle.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("✅ LendingPool deployed at:", await lendingPool.getAddress());
  
  // Set up some initial prices
  console.log("\n💲 Setting up initial prices...");
  await priceOracle.setAssetPrice("0x0000000000000000000000000000000000000000", ethers.parseEther("1600")); // ETH
  await priceOracle.setAssetPrice("0xF277B86Af1e2A69E0bc5A061fd98Cb2093079B7C", ethers.parseEther("1")); // DAI
  await priceOracle.setAssetPrice("0xf4e91765e8a61Dd7Bc1CF1497154F62bfF707f41", ethers.parseEther("1")); // USDC
  console.log("✅ Initial prices set");
  
  console.log("\n🎉 LendHub v2 Core Contracts deployed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("InterestRateModel:", await interestRateModel.getAddress());
  console.log("PriceOracle:", await priceOracle.getAddress());
  console.log("LendingPool:", await lendingPool.getAddress());
  
  console.log("\n🚀 Ready for LendHub v2 operations!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
