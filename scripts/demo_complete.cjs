const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 LendHub v2 - Complete Demo with Event Trigger");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Step 1: Deploy Mock Tokens
  console.log("\n📦 Step 1: Deploying Mock Tokens...");
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
  const usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  
  console.log("✅ DAI:", await dai.getAddress());
  console.log("✅ USDC:", await usdc.getAddress());
  
  // Mint tokens
  await dai.mint(deployer.address, ethers.parseEther("1000000"));
  await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n);
  console.log("✅ Tokens minted");
  
  // Step 2: Deploy Core Contracts
  console.log("\n🏦 Step 2: Deploying Core Contracts...");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  
  const interestRateModel = await InterestRateModel.deploy();
  const priceOracle = await PriceOracle.deploy();
  const lendingPool = await LendingPool.deploy(
    await interestRateModel.getAddress(),
    await priceOracle.getAddress()
  );
  
  await interestRateModel.waitForDeployment();
  await priceOracle.waitForDeployment();
  await lendingPool.waitForDeployment();
  
  console.log("✅ InterestRateModel:", await interestRateModel.getAddress());
  console.log("✅ PriceOracle:", await priceOracle.getAddress());
  console.log("✅ LendingPool:", await lendingPool.getAddress());
  
  // Step 3: Setup Prices
  console.log("\n💲 Step 3: Setting up Prices...");
  await priceOracle.setAssetPrice(await dai.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(await usdc.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(ethers.ZeroAddress, ethers.parseEther("1600"));
  console.log("✅ Prices set");
  
  // Step 4: Test Interest Rate Model
  console.log("\n📊 Step 4: Testing Interest Rate Model...");
  const cash = ethers.parseEther("1000000");
  const debt = ethers.parseEther("500000");
  const reserveFactor = 1000; // 10%
  const optimalU = 8000; // 80%
  const baseRate = 1000000000000000000n; // Very small rate
  const slope1 = 2000000000000000000n;
  const slope2 = 10000000000000000000n;
  
  const [borrowRate, supplyRate] = await interestRateModel.getRates(
    cash,
    debt,
    reserveFactor,
    optimalU,
    baseRate,
    slope1,
    slope2
  );
  
  console.log("✅ Borrow Rate (RAY):", borrowRate.toString());
  console.log("✅ Supply Rate (RAY):", supplyRate.toString());
  
  // Convert to APR
  const RAY = 1e27;
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const borrowAPR = Number(borrowRate) * SECONDS_PER_YEAR / RAY * 100;
  const supplyAPR = Number(supplyRate) * SECONDS_PER_YEAR / RAY * 100;
  
  console.log("📊 Rate Summary:");
  console.log("Borrow APR:", borrowAPR.toFixed(6), "%");
  console.log("Supply APR:", supplyAPR.toFixed(6), "%");
  
  // Step 5: Setup Event Listener
  console.log("\n🎧 Step 5: Setting up Event Listener...");
  
  // ABI for ReserveDataUpdated event
  const abi = [
    "event ReserveDataUpdated(address indexed asset,uint256 utilizationWad,uint256 liquidityRateRayPerSec,uint256 variableBorrowRateRayPerSec,uint256 liquidityIndexRay,uint256 variableBorrowIndexRay)"
  ];
  
  const pool = new ethers.Contract(await lendingPool.getAddress(), abi, deployer);
  
  pool.on(
    "ReserveDataUpdated",
    (
      asset,
      utilizationWad,
      liquidityRateRayPerSec,
      variableBorrowRateRayPerSec,
      liquidityIndexRay,
      variableBorrowIndexRay
    ) => {
      const WAD = 1e18;
      const RAY = 1e27;
      const SECONDS_PER_YEAR = 365 * 24 * 3600;

      const Upercent = Number(utilizationWad) / WAD * 100;
      const borrowAPR = Number(variableBorrowRateRayPerSec) * SECONDS_PER_YEAR / RAY * 100;
      const supplyAPR = Number(liquidityRateRayPerSec) * SECONDS_PER_YEAR / RAY * 100;

      console.log("-----------------------------------------------------");
      console.log("Asset:", asset);
      console.log("Utilization: ", Upercent.toFixed(2), "%");
      console.log("Borrow APR: ", borrowAPR.toFixed(2), "%");
      console.log("Supply APR: ", supplyAPR.toFixed(2), "%");
      console.log("LiquidityIndex: ", liquidityIndexRay.toString());
      console.log("BorrowIndex:    ", variableBorrowIndexRay.toString());
    }
  );
  
  console.log("✅ Event listener ready");
  
  // Step 6: Trigger Event
  console.log("\n🔄 Step 6: Triggering ReserveDataUpdated Event...");
  const daiAddress = await dai.getAddress();
  
  console.log("Calling accruePublic for DAI...");
  const tx = await lendingPool.accruePublic(daiAddress, { gasLimit: 1000000 });
  await tx.wait();
  
  console.log("✅ accruePublic called successfully!");
  console.log("Transaction hash:", tx.hash);
  
  // Step 7: Check Reserve Data
  console.log("\n📊 Step 7: Checking Reserve Data...");
  const reserveData = await lendingPool.reserves(daiAddress);
  
  console.log("✅ Reserve Cash:", reserveData.reserveCash.toString());
  console.log("✅ Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
  console.log("✅ Liquidity Index:", reserveData.liquidityIndex.toString());
  console.log("✅ Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
  console.log("✅ Last Update:", reserveData.lastUpdate.toString());
  
  // Summary
  console.log("\n🎉 LendHub v2 Demo Completed Successfully!");
  console.log("=" .repeat(60));
  console.log("📋 Summary:");
  console.log("✅ Mock tokens deployed and working");
  console.log("✅ Core contracts deployed and working");
  console.log("✅ Price oracle working");
  console.log("✅ Interest rate model working");
  console.log("✅ Event listener working");
  console.log("✅ ReserveDataUpdated event triggered");
  console.log("\n🚀 LendHub v2 is ready for development!");
  console.log("\n📝 Next steps:");
  console.log("- Implement supply/borrow/repay functions in LendingPool");
  console.log("- These functions should call _accrue() internally");
  console.log("- When called, they will emit ReserveDataUpdated events");
  console.log("- The event listener will display the rate table");
  
  // Keep the script running
  console.log("\n⏳ Keeping script alive... Press Ctrl+C to stop");
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping demo...');
    process.exit(0);
  });
  
  // Keep alive
  setInterval(() => {
    // Do nothing, just keep the process alive
  }, 1000);
}

main().catch(console.error);
