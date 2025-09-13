const { ethers } = require("hardhat");

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const fmt18 = (x) => Number(ethers.formatUnits(x, 18)).toFixed(4);

async function main() {
  const [deployer, user, liquidator] = await ethers.getSigners();
  console.log("Actors:", { 
    deployer: deployer.address, 
    user: user.address, 
    liquidator: liquidator.address 
  });

  // ==== Contract Addresses ====
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const PRICE_ORACLE = "0x2B543925E0CE349e73a240EB6F2db87d0527F519";
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";  // Use hardcoded address
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";  // Use hardcoded address
  const ETH_USD_FEED = "0x6E2483c5FfcF8D17013559D4E3A3856D7CF2e4D4";

  // ABIs
  const poolAbi = [
    "function lend(address,uint256) external",
    "function withdraw(address,uint256) external returns (uint256)",
    "function borrow(address,uint256) external",
    "function repay(address,uint256,address) external returns (uint256)",
    "function liquidationCall(address,address,address,uint256) external",
    "function accruePublic(address) external",
    "function getAccountData(address) view returns (uint256 collateralValue1e18,uint256 debtValue1e18,uint256 healthFactor1e18)",
    "event ReserveDataUpdated(address indexed asset,uint256 utilizationWad,uint256 liquidityRateRayPerSec,uint256 variableBorrowRateRayPerSec,uint256 liquidityIndexRay,uint256 variableBorrowIndexRay)"
  ];
  const erc20Abi = [
    "function mint(address,uint256) external",
    "function approve(address,uint256) external returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const feedAbi = ["function updateAnswer(int256) external"];

  const pool = new ethers.Contract(ethers.getAddress(LENDING_POOL), poolAbi, deployer);
  const poolUser = pool.connect(user);
  const poolLiq = pool.connect(liquidator);

  const weth = new ethers.Contract(ethers.getAddress(WETH), erc20Abi, deployer);
  const dai = new ethers.Contract(ethers.getAddress(DAI), erc20Abi, deployer);
  const feed = new ethers.Contract(ethers.getAddress(ETH_USD_FEED), feedAbi, deployer);

  const wethDec = await weth.decimals();
  const daiDec = await dai.decimals();

  // Helper log
  async function printUserState(tag) {
    const [col, debt, hf] = await pool.getAccountData(user.address);
    console.log(`\n[${tag}]`);
    console.log(`  Collateral(USD): ${fmt18(col)} | Debt(USD): ${fmt18(debt)} | HF: ${fmt18(hf)}`);
  }

  // Event listener for dynamic rates
  pool.on("ReserveDataUpdated", (asset, Uwad, liqRate, borRate) => {
    const U = Number(Uwad) / 1e16; // % ~ (wad/1e18*100)
    const borrowAPR = (Number(borRate) * SECONDS_PER_YEAR) / 1e27 * 100;
    const supplyAPR = (Number(liqRate) * SECONDS_PER_YEAR) / 1e27 * 100;
    if (asset.toLowerCase() === DAI.toLowerCase() || asset.toLowerCase() === WETH.toLowerCase()) {
      console.log(`[Rates] asset=${asset} | U=${U.toFixed(2)}% | Borrow APR=${borrowAPR.toFixed(2)}% | Supply APR=${supplyAPR.toFixed(2)}%`);
    }
  });

  console.log("🎬 Starting E2E Scenario...");
  console.log("=" .repeat(60));

  // ========== 1) Seed tokens ==========
  console.log("\n💰 Step 1: Seeding tokens...");
  await (await weth.mint(user.address, ethers.parseUnits("100", wethDec))).wait();
  await (await dai.mint(liquidator.address, ethers.parseUnits("200000", daiDec))).wait();
  await (await dai.mint(deployer.address, ethers.parseUnits("100000", daiDec))).wait();
  console.log("✅ User has 100 WETH, Liquidator has 200k DAI, Deployer has 100k DAI");
  
  // Add DAI to pool for borrowing
  console.log("\n🏦 Step 1.5: Adding DAI to pool for borrowing...");
  await (await dai.approve(LENDING_POOL, ethers.parseUnits("50000", daiDec))).wait();
  await (await pool.lend(DAI, ethers.parseUnits("50000", daiDec), { gasLimit: 1000000 })).wait();
  console.log("✅ Added 50k DAI to pool");

  // ========== 2) User deposit WETH ==========
  console.log("\n🏦 Step 2: User deposits 50 WETH as collateral...");
  await (await weth.connect(user).approve(LENDING_POOL, ethers.parseUnits("50", wethDec))).wait();
  await (await poolUser.lend(WETH, ethers.parseUnits("50", wethDec), { gasLimit: 1000000 })).wait();
  await (await pool.accruePublic(WETH, { gasLimit: 1000000 })).wait();
  await printUserState("After supply 50 WETH");

  // ========== 3) User borrow DAI ==========
  console.log("\n💸 Step 3: User borrows 30k DAI...");
  await (await poolUser.borrow(DAI, ethers.parseUnits("30000", daiDec), { gasLimit: 1000000 })).wait();
  await (await pool.accruePublic(DAI, { gasLimit: 1000000 })).wait();
  await printUserState("After borrow 30k DAI");

  // ========== 4) ETH price drop ==========
  console.log("\n📉 Step 4: ETH price drops from $1600 to $600...");
  // Update price in PriceOracle directly (not in feed)
  const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
  await (await oracle.setAssetPrice(WETH, ethers.parseUnits("600", 18))).wait();
  await (await pool.accruePublic(WETH, { gasLimit: 1000000 })).wait();
  await printUserState("After ETH price drop to $600 (expect HF < 1)");

  // ========== 5) Liquidation ==========
  console.log("\n⚡ Step 5: Liquidation - Liquidator repays 10k DAI...");
  await (await dai.connect(liquidator).approve(LENDING_POOL, ethers.parseUnits("10000", daiDec))).wait();
  await (await poolLiq.liquidationCall(DAI, WETH, user.address, ethers.parseUnits("10000", daiDec), { gasLimit: 2000000 })).wait();
  await (await pool.accruePublic(WETH, { gasLimit: 1000000 })).wait();
  await (await pool.accruePublic(DAI, { gasLimit: 1000000 })).wait();
  await printUserState("After liquidation repay 10k DAI");

  // ========== 6) Repay remaining debt ==========
  console.log("\n💳 Step 6: User repays remaining debt...");
  const userDaiBal = await dai.balanceOf(user.address);
  if (userDaiBal < ethers.parseUnits("22000", daiDec)) {
    console.log("Minting additional DAI for user to repay...");
    await (await dai.mint(user.address, ethers.parseUnits("50000", daiDec))).wait();
  }
  await (await dai.connect(user).approve(LENDING_POOL, ethers.MaxUint256)).wait();
  await (await poolUser.repay(DAI, ethers.MaxUint256, user.address, { gasLimit: 1000000 })).wait();
  await printUserState("After full repay");

  // ========== 7) Withdraw remaining collateral ==========
  console.log("\n🏧 Step 7: User withdraws remaining WETH...");
  await (await poolUser.withdraw(WETH, ethers.parseUnits("50", wethDec), { gasLimit: 1000000 })).wait();
  await printUserState("After withdraw rest of WETH");

  // ========== Final Summary ==========
  console.log("\n🎉 E2E Scenario Complete!");
  console.log("=" .repeat(60));
  console.log("✅ All steps executed successfully:");
  console.log("  - User supplied WETH as collateral");
  console.log("  - User borrowed DAI against WETH");
  console.log("  - ETH price dropped, triggering liquidation risk");
  console.log("  - Liquidator liquidated user's position");
  console.log("  - User repaid remaining debt");
  console.log("  - User withdrew remaining collateral");
  
  console.log("\n📊 Final Balances:");
  const finalWethBal = await weth.balanceOf(user.address);
  const finalDaiBal = await dai.balanceOf(user.address);
  console.log(`User WETH: ${ethers.formatUnits(finalWethBal, wethDec)}`);
  console.log(`User DAI: ${ethers.formatUnits(finalDaiBal, daiDec)}`);
  
  console.log("\n🚀 LendHub v2 E2E test completed successfully!");
  process.exit(0);
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});
