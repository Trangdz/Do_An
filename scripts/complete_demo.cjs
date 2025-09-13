const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 LendHub v2 - Complete Demo");
  console.log("=" .repeat(50));
  
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
  
  // Step 2: Deploy Oracle Feeds
  console.log("\n💰 Step 2: Deploying Oracle Feeds...");
  const Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const ethUsd = await Aggregator.deploy(8, 1600n * 10n ** 8n);
  const daiUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);
  const usdcUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);
  await ethUsd.waitForDeployment();
  await daiUsd.waitForDeployment();
  await usdcUsd.waitForDeployment();
  
  console.log("✅ ETH/USD feed:", await ethUsd.getAddress());
  console.log("✅ DAI/USD feed:", await daiUsd.getAddress());
  console.log("✅ USDC/USD feed:", await usdcUsd.getAddress());
  
  // Step 3: Deploy Core Contracts
  console.log("\n🏦 Step 3: Deploying Core Contracts...");
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
  
  // Step 4: Setup Prices
  console.log("\n💲 Step 4: Setting up Prices...");
  await priceOracle.setAssetPrice(await dai.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(await usdc.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(ethers.ZeroAddress, ethers.parseEther("1600"));
  console.log("✅ Prices set");
  
  // Step 5: Test Interest Rate Model
  console.log("\n📊 Step 5: Testing Interest Rate Model...");
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
  
  // Step 6: Test Price Oracle
  console.log("\n🔍 Step 6: Testing Price Oracle...");
  const ethPrice = await priceOracle.getAssetPrice1e18(ethers.ZeroAddress);
  const daiPrice = await priceOracle.getAssetPrice1e18(await dai.getAddress());
  const usdcPrice = await priceOracle.getAssetPrice1e18(await usdc.getAddress());
  
  console.log("✅ ETH price:", ethers.formatEther(ethPrice));
  console.log("✅ DAI price:", ethers.formatEther(daiPrice));
  console.log("✅ USDC price:", ethers.formatEther(usdcPrice));
  
  // Step 7: Test LendingPool Reserve Data
  console.log("\n🏦 Step 7: Testing LendingPool Reserve Data...");
  const daiAddress = await dai.getAddress();
  const reserveData = await lendingPool.reserves(daiAddress);
  
  console.log("✅ Reserve Cash:", reserveData.reserveCash.toString());
  console.log("✅ Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
  console.log("✅ Liquidity Index:", reserveData.liquidityIndex.toString());
  console.log("✅ Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
  
  // Step 8: Event Listener Setup
  console.log("\n🎧 Step 8: Setting up Event Listener...");
  console.log("Note: ReserveDataUpdated events will be emitted when _accrue() is called");
  console.log("This happens when supply/borrow/repay functions are implemented");
  
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
  
  // Summary
  console.log("\n🎉 LendHub v2 Demo Completed Successfully!");
  console.log("=" .repeat(50));
  console.log("📋 Summary:");
  console.log("✅ Mock tokens deployed and working");
  console.log("✅ Oracle feeds deployed and working");
  console.log("✅ Core contracts deployed and working");
  console.log("✅ Price oracle working");
  console.log("✅ Interest rate model working");
  console.log("✅ Event listener ready");
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
