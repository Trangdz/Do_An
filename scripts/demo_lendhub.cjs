const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 LendHub v2 - Complete Demo");
  console.log("=" .repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // 1. Deploy Core Contracts
  console.log("\n📦 Step 1: Deploying Core Contracts...");
  
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
  
  // 2. Deploy Mock Tokens
  console.log("\n💰 Step 2: Deploying Mock Tokens...");
  
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
  const usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
  
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  
  console.log("✅ DAI:", await dai.getAddress());
  console.log("✅ USDC:", await usdc.getAddress());
  
  // 3. Setup Prices
  console.log("\n💲 Step 3: Setting up Prices...");
  
  await priceOracle.setAssetPrice(ethers.ZeroAddress, ethers.parseEther("1600")); // ETH
  await priceOracle.setAssetPrice(await dai.getAddress(), ethers.parseEther("1")); // DAI
  await priceOracle.setAssetPrice(await usdc.getAddress(), ethers.parseEther("1")); // USDC
  
  console.log("✅ ETH price: $1600");
  console.log("✅ DAI price: $1");
  console.log("✅ USDC price: $1");
  
  // 4. Mint Tokens
  console.log("\n🪙 Step 4: Minting Tokens...");
  
  await dai.mint(deployer.address, ethers.parseEther("1000000"));
  await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n);
  
  const daiBalance = await dai.balanceOf(deployer.address);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  
  console.log("✅ DAI balance:", ethers.formatEther(daiBalance));
  console.log("✅ USDC balance:", ethers.formatUnits(usdcBalance, 6));
  
  // 5. Test Interest Rate Model
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
  
  // 6. Test Price Oracle
  console.log("\n🔍 Step 6: Testing Price Oracle...");
  
  const ethPrice = await priceOracle.getAssetPrice1e18(ethers.ZeroAddress);
  const daiPrice = await priceOracle.getAssetPrice1e18(await dai.getAddress());
  const usdcPrice = await priceOracle.getAssetPrice1e18(await usdc.getAddress());
  
  console.log("✅ ETH price:", ethers.formatEther(ethPrice));
  console.log("✅ DAI price:", ethers.formatEther(daiPrice));
  console.log("✅ USDC price:", ethers.formatEther(usdcPrice));
  
  // 7. Test Token Transfers
  console.log("\n🔄 Step 7: Testing Token Transfers...");
  
  const transferAmount = ethers.parseEther("1000");
  await dai.transfer("0x0000000000000000000000000000000000000001", transferAmount);
  
  const newDaiBalance = await dai.balanceOf(deployer.address);
  console.log("✅ DAI balance after transfer:", ethers.formatEther(newDaiBalance));
  
  // 8. Test LendingPool Reserve Data
  console.log("\n🏦 Step 8: Testing LendingPool Reserve Data...");
  
  const daiAddress = await dai.getAddress();
  const reserveData = await lendingPool.reserves(daiAddress);
  
  console.log("✅ Reserve Cash:", reserveData.reserveCash.toString());
  console.log("✅ Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
  console.log("✅ Liquidity Index:", reserveData.liquidityIndex.toString());
  console.log("✅ Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
  
  // 9. Summary
  console.log("\n🎉 LendHub v2 Demo Completed Successfully!");
  console.log("=" .repeat(50));
  console.log("📋 Summary:");
  console.log("✅ Core contracts deployed and working");
  console.log("✅ Mock tokens deployed and working");
  console.log("✅ Price oracle working");
  console.log("✅ Interest rate model working");
  console.log("✅ Token transfers working");
  console.log("✅ LendingPool reserve data accessible");
  console.log("\n🚀 LendHub v2 is ready for development!");
  console.log("\n📝 Next steps:");
  console.log("- Implement supply/borrow functions");
  console.log("- Add liquidation logic");
  console.log("- Add user position tracking");
  console.log("- Add events and error handling");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
