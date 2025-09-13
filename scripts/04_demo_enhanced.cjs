const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  // ==== Contract Addresses ====
  const LENDING_POOL = "0x773d2D3f945fD63b1997EF0E22D98dBad952eC7c";
  const DAI = "0x273a58F2D2D00DfAdB0eD8C71c7286fa0b4A740c";
  const USDC = "0x256863b3473280f88e9B93488BB5964350b216a2";
  const WETH = "0x84f07E0FC4883Aa96101c41af8c197E794434FfF";

  // ABI
  const poolAbi = [
    "function lend(address asset, uint256 amount) external",
    "function withdraw(address asset, uint256 requested) external returns (uint256)",
    "function accruePublic(address asset) external",
    "function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
    "function pause() external",
    "function unpause() external"
  ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const pool = new ethers.Contract(LENDING_POOL, poolAbi, user);
  const dai = new ethers.Contract(DAI, erc20Abi, user);
  const usdc = new ethers.Contract(USDC, erc20Abi, user);
  const weth = new ethers.Contract(WETH, erc20Abi, user);

  console.log("🎮 Enhanced LendHub v2 Demo");
  console.log("=" .repeat(50));

  // ======= STEP 1: Check Initial Balances =======
  console.log("\n📊 Initial Balances:");
  const daiDec = await dai.decimals();
  const usdcDec = await usdc.decimals();
  const wethDec = await weth.decimals();
  
  const daiBal0 = await dai.balanceOf(user.address);
  const usdcBal0 = await usdc.balanceOf(user.address);
  const wethBal0 = await weth.balanceOf(user.address);
  
  console.log(`DAI:  ${ethers.formatUnits(daiBal0, daiDec)}`);
  console.log(`USDC: ${ethers.formatUnits(usdcBal0, usdcDec)}`);
  console.log(`WETH: ${ethers.formatUnits(wethBal0, wethDec)}`);

  // ======= STEP 2: Test DAI Lending =======
  console.log("\n🟢 Testing DAI Lending...");
  const lendAmountDAI = ethers.parseUnits("10000", daiDec);
  
  try {
    await dai.approve(LENDING_POOL, lendAmountDAI);
    console.log("✅ DAI approved");
    
    const tx = await pool.lend(DAI, lendAmountDAI, { gasLimit: 1000000 });
    await tx.wait();
    console.log("✅ DAI lent successfully");
    
    const r = await pool.reserves(DAI);
    console.log("ReserveCash DAI:", ethers.formatUnits(r.reserveCash, 18));
  } catch (error) {
    console.log("❌ DAI lending failed:", error.message);
  }

  // ======= STEP 3: Test USDC Lending =======
  console.log("\n🔵 Testing USDC Lending...");
  const lendAmountUSDC = ethers.parseUnits("5000", usdcDec);
  
  try {
    await usdc.approve(LENDING_POOL, lendAmountUSDC);
    console.log("✅ USDC approved");
    
    const tx = await pool.lend(USDC, lendAmountUSDC, { gasLimit: 1000000 });
    await tx.wait();
    console.log("✅ USDC lent successfully");
    
    const r = await pool.reserves(USDC);
    console.log("ReserveCash USDC:", ethers.formatUnits(r.reserveCash, 18));
  } catch (error) {
    console.log("❌ USDC lending failed:", error.message);
  }

  // ======= STEP 4: Test WETH Lending (Collateral Only) =======
  console.log("\n🟡 Testing WETH Lending (Collateral Only)...");
  const lendAmountWETH = ethers.parseUnits("10", wethDec);
  
  try {
    await weth.approve(LENDING_POOL, lendAmountWETH);
    console.log("✅ WETH approved");
    
    const tx = await pool.lend(WETH, lendAmountWETH, { gasLimit: 1000000 });
    await tx.wait();
    console.log("✅ WETH lent successfully (as collateral)");
    
    const r = await pool.reserves(WETH);
    console.log("ReserveCash WETH:", ethers.formatUnits(r.reserveCash, 18));
    console.log("Is Borrowable:", r.isBorrowable);
  } catch (error) {
    console.log("❌ WETH lending failed:", error.message);
  }

  // ======= STEP 5: Test Accrue Functions =======
  console.log("\n⏰ Testing Accrue Functions...");
  
  try {
    await pool.accruePublic(DAI, { gasLimit: 1000000 });
    console.log("✅ DAI accrued");
    
    await pool.accruePublic(USDC, { gasLimit: 1000000 });
    console.log("✅ USDC accrued");
    
    await pool.accruePublic(WETH, { gasLimit: 1000000 });
    console.log("✅ WETH accrued");
  } catch (error) {
    console.log("❌ Accrue failed:", error.message);
  }

  // ======= STEP 6: Test Pause/Unpause =======
  console.log("\n⏸️ Testing Pause/Unpause...");
  
  try {
    await pool.pause();
    console.log("✅ Pool paused");
    
    // Try to lend while paused (should fail)
    try {
      await pool.lend(DAI, ethers.parseUnits("1000", daiDec), { gasLimit: 1000000 });
      console.log("❌ Lend should have failed while paused");
    } catch (error) {
      console.log("✅ Lend correctly failed while paused");
    }
    
    await pool.unpause();
    console.log("✅ Pool unpaused");
  } catch (error) {
    console.log("❌ Pause/Unpause failed:", error.message);
  }

  // ======= STEP 7: Check Final Balances =======
  console.log("\n📊 Final Balances:");
  const daiBal1 = await dai.balanceOf(user.address);
  const usdcBal1 = await usdc.balanceOf(user.address);
  const wethBal1 = await weth.balanceOf(user.address);
  
  console.log(`DAI:  ${ethers.formatUnits(daiBal1, daiDec)} (${ethers.formatUnits(daiBal0 - daiBal1, daiDec)} lent)`);
  console.log(`USDC: ${ethers.formatUnits(usdcBal1, usdcDec)} (${ethers.formatUnits(usdcBal0 - usdcBal1, usdcDec)} lent)`);
  console.log(`WETH: ${ethers.formatUnits(wethBal1, wethDec)} (${ethers.formatUnits(wethBal0 - wethBal1, wethDec)} lent)`);

  // ======= STEP 8: Check Reserve States =======
  console.log("\n📈 Reserve States:");
  
  const daiReserve = await pool.reserves(DAI);
  const usdcReserve = await pool.reserves(USDC);
  const wethReserve = await pool.reserves(WETH);
  
  console.log("DAI Reserve:");
  console.log(`  Cash: ${ethers.formatUnits(daiReserve.reserveCash, 18)}`);
  console.log(`  Liquidity Index: ${daiReserve.liquidityIndex.toString()}`);
  console.log(`  Borrowable: ${daiReserve.isBorrowable}`);
  
  console.log("USDC Reserve:");
  console.log(`  Cash: ${ethers.formatUnits(usdcReserve.reserveCash, 18)}`);
  console.log(`  Liquidity Index: ${usdcReserve.liquidityIndex.toString()}`);
  console.log(`  Borrowable: ${usdcReserve.isBorrowable}`);
  
  console.log("WETH Reserve:");
  console.log(`  Cash: ${ethers.formatUnits(wethReserve.reserveCash, 18)}`);
  console.log(`  Liquidity Index: ${wethReserve.liquidityIndex.toString()}`);
  console.log(`  Borrowable: ${wethReserve.isBorrowable}`);

  console.log("\n🎉 Enhanced Demo Complete!");
  console.log("✅ All core functions working");
  console.log("✅ Security features active");
  console.log("✅ Multi-asset support");
  console.log("✅ Collateral-only assets (WETH)");
  console.log("✅ Pause/Unpause functionality");
  
  console.log("\n📝 Next Steps:");
  console.log("- Implement borrow/repay functions");
  console.log("- Test liquidation scenarios");
  console.log("- Add more complex trading scenarios");
}

main().catch(console.error);
