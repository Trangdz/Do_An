const { ethers } = require("hardhat");

async function main() {
  console.log("🎬 Simple E2E Scenario - Fresh Start");
  console.log("============================================================");

  const [deployer, user, liquidator] = await ethers.getSigners();
  
  // Use fresh addresses - deploy new contracts
  console.log("📦 Deploying fresh contracts...");
  
  // Deploy fresh tokens
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const freshWETH = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
  const freshDAI = await ERC20Mock.deploy("Dai Stablecoin", "DAI", 18);
  await freshWETH.waitForDeployment();
  await freshDAI.waitForDeployment();
  
  console.log("✅ Fresh WETH:", await freshWETH.getAddress());
  console.log("✅ Fresh DAI:", await freshDAI.getAddress());
  
  // Deploy fresh LendingPool with fresh addresses
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  
  const irm = await InterestRateModel.deploy();
  const oracle = await PriceOracle.deploy();
  const pool = await LendingPool.deploy(
    await irm.getAddress(), 
    await oracle.getAddress(),
    await freshWETH.getAddress(),
    await freshDAI.getAddress()
  );
  
  await irm.waitForDeployment();
  await oracle.waitForDeployment();
  await pool.waitForDeployment();
  
  console.log("✅ Fresh LendingPool:", await pool.getAddress());
  console.log("✅ Fresh PriceOracle:", await oracle.getAddress());
  
  // Set prices
  await (await oracle.setAssetPrice(await freshWETH.getAddress(), ethers.parseUnits("1600", 18))).wait();
  await (await oracle.setAssetPrice(await freshDAI.getAddress(), ethers.parseUnits("1", 18))).wait();
  console.log("✅ Prices set");
  
  // Initialize reserves
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
  
  const base = toRayPerSec(0.001);
  const s1 = toRayPerSec(0.002);
  const s2 = toRayPerSec(0.01);
  
  // Init WETH (collateral only)
  await (await pool.initReserve(
    await freshWETH.getAddress(), 18,
    1000, 7500, 8000, 500, 5000, // risk params
    false, // isBorrowable = false
    8000, base, s1, s2
  )).wait();
  
  // Init DAI (borrowable)
  await (await pool.initReserve(
    await freshDAI.getAddress(), 18,
    1000, 7500, 8000, 500, 5000, // risk params
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  
  console.log("✅ Reserves initialized");
  
  // Mint tokens
  await (await freshWETH.mint(user.address, ethers.parseUnits("100", 18))).wait();
  await (await freshDAI.mint(liquidator.address, ethers.parseUnits("200000", 18))).wait();
  await (await freshDAI.mint(deployer.address, ethers.parseUnits("100000", 18))).wait();
  console.log("✅ Tokens minted");
  
  // Add DAI to pool
  await (await freshDAI.approve(await pool.getAddress(), ethers.parseUnits("50000", 18))).wait();
  await (await pool.lend(await freshDAI.getAddress(), ethers.parseUnits("50000", 18), { gasLimit: 1000000 })).wait();
  console.log("✅ Added 50k DAI to pool");
  
  // Helper function
  const fmt18 = (x) => Number(ethers.formatUnits(x, 18)).toFixed(4);
  
  async function printUserState(tag) {
    const [col, debt, hf] = await pool.getAccountData(user.address);
    console.log(`\n[${tag}]`);
    console.log(`  Collateral(USD): ${fmt18(col)} | Debt(USD): ${fmt18(debt)} | HF: ${fmt18(hf)}`);
  }
  
  try {
    // ========== 1) User deposit 50 WETH ==========
    console.log("\n🏦 Step 1: User deposits 50 WETH as collateral...");
    await (await freshWETH.connect(user).approve(await pool.getAddress(), ethers.parseUnits("50", 18))).wait();
    await (await pool.connect(user).lend(await freshWETH.getAddress(), ethers.parseUnits("50", 18), { gasLimit: 1000000 })).wait();
    await printUserState("After supply 50 WETH");
    
    // ========== 2) User borrow 10k DAI ==========
    console.log("\n💸 Step 2: User borrows 10k DAI...");
    await (await pool.connect(user).borrow(await freshDAI.getAddress(), ethers.parseUnits("10000", 18), { gasLimit: 1000000 })).wait();
    await printUserState("After borrow 10k DAI");
    
    // ========== 3) ETH price drop ==========
    console.log("\n📉 Step 3: ETH price drops from $1600 to $150...");
    await (await oracle.setAssetPrice(await freshWETH.getAddress(), ethers.parseUnits("150", 18))).wait();
    await printUserState("After ETH price drop to $150 (expect HF < 1)");
    
    // ========== 4) Liquidation ==========
    console.log("\n⚡ Step 4: Liquidation - Liquidator repays 5k DAI...");
    await (await freshDAI.connect(liquidator).approve(await pool.getAddress(), ethers.parseUnits("5000", 18))).wait();
    await (await pool.connect(liquidator).liquidationCall(
      await freshDAI.getAddress(), 
      await freshWETH.getAddress(), 
      user.address, 
      ethers.parseUnits("5000", 18),
      { gasLimit: 2000000 }
    )).wait();
    await printUserState("After liquidation repay 5k DAI");
    
    // ========== 5) Repay remaining ==========
    console.log("\n💰 Step 5: User repays remaining debt...");
    await (await freshDAI.mint(user.address, ethers.parseUnits("50000", 18))).wait();
    await (await freshDAI.connect(user).approve(await pool.getAddress(), ethers.MaxUint256)).wait();
    await (await pool.connect(user).repay(await freshDAI.getAddress(), ethers.MaxUint256, user.address, { gasLimit: 1000000 })).wait();
    await printUserState("After full repay");
    
    // ========== 6) Withdraw collateral ==========
    console.log("\n🏦 Step 6: User withdraws remaining WETH...");
    await (await pool.connect(user).withdraw(await freshWETH.getAddress(), ethers.parseUnits("50", 18), { gasLimit: 1000000 })).wait();
    await printUserState("After withdraw rest of WETH");
    
    console.log("\n🎉 E2E scenario complete ✅");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
