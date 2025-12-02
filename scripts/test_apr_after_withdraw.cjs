// Script để test APR có thay đổi sau khi withdraw không
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { CONFIG } = require("../lendhub-frontend-nextjs/src/config/contracts");

async function main() {
  const [deployer, user] = await ethers.getSigners();
  
  console.log("Testing APR update after withdraw...\n");
  
  const pool = await ethers.getContractAt("LendingPool", CONFIG.LENDING_POOL);
  const dai = await ethers.getContractAt("TokenWithWithdraw", CONFIG.DAI_ADDRESS);
  
  const assetAddress = CONFIG.DAI_ADDRESS;
  
  // Helper function to get APR data
  const getAPRData = async () => {
    const reserve = await pool.reserves(assetAddress);
    const reserveCash = Number(ethers.formatUnits(reserve.reserveCash, 18));
    const totalDebt = Number(ethers.formatUnits(reserve.totalDebtPrincipal, 18));
    const utilization = (totalDebt / (reserveCash + totalDebt)) * 100;
    
    const RAY = 1e27;
    const SECONDS_PER_YEAR = 31536000;
    const supplyAPR = (Number(reserve.liquidityRateRayPerSec) / RAY) * SECONDS_PER_YEAR * 100;
    const borrowAPR = (Number(reserve.variableBorrowRateRayPerSec) / RAY) * SECONDS_PER_YEAR * 100;
    
    return {
      reserveCash,
      totalDebt,
      utilization,
      supplyAPR,
      borrowAPR,
      liquidityRate: reserve.liquidityRateRayPerSec.toString(),
      borrowRate: reserve.variableBorrowRateRayPerSec.toString()
    };
  };
  
  console.log("📊 BEFORE WITHDRAW:");
  const before = await getAPRData();
  console.log("  Reserve Cash:", before.reserveCash.toFixed(2), "DAI");
  console.log("  Total Debt:", before.totalDebt.toFixed(2), "DAI");
  console.log("  Utilization:", before.utilization.toFixed(2) + "%");
  console.log("  Supply APR:", before.supplyAPR.toFixed(4) + "%");
  console.log("  Borrow APR:", before.borrowAPR.toFixed(4) + "%");
  console.log("  Liquidity Rate (RAY/s):", before.liquidityRate);
  console.log("");
  
  // Withdraw một lượng (giả sử user đã có supply)
  const withdrawAmount = ethers.parseUnits("1000", 18); // 1000 DAI
  
  console.log("💰 Withdrawing 1000 DAI...");
  try {
    const tx = await pool.connect(user).withdraw(assetAddress, withdrawAmount);
    await tx.wait();
    console.log("✅ Withdraw successful!\n");
  } catch (e) {
    console.log("⚠️ Withdraw failed (user may not have enough supply):", e.message);
    console.log("   This is OK - we'll just check the rates calculation\n");
  }
  
  // Đợi một chút để contract cập nhật
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("📊 AFTER WITHDRAW:");
  const after = await getAPRData();
  console.log("  Reserve Cash:", after.reserveCash.toFixed(2), "DAI");
  console.log("  Total Debt:", after.totalDebt.toFixed(2), "DAI");
  console.log("  Utilization:", after.utilization.toFixed(2) + "%");
  console.log("  Supply APR:", after.supplyAPR.toFixed(4) + "%");
  console.log("  Borrow APR:", after.borrowAPR.toFixed(4) + "%");
  console.log("  Liquidity Rate (RAY/s):", after.liquidityRate);
  console.log("");
  
  // So sánh
  console.log("📈 CHANGES:");
  const cashChange = after.reserveCash - before.reserveCash;
  const utilChange = after.utilization - before.utilization;
  const aprChange = after.supplyAPR - before.supplyAPR;
  
  console.log("  Reserve Cash:", cashChange > 0 ? `+${cashChange.toFixed(2)}` : cashChange.toFixed(2), "DAI");
  console.log("  Utilization:", utilChange > 0 ? `+${utilChange.toFixed(2)}` : utilChange.toFixed(2) + "%");
  console.log("  Supply APR:", aprChange > 0 ? `+${aprChange.toFixed(4)}` : aprChange.toFixed(4) + "%");
  console.log("");
  
  if (Math.abs(utilChange) > 0.01) {
    if (utilChange > 0 && aprChange > 0) {
      console.log("✅ CORRECT: Utilization increased → APR increased");
    } else if (utilChange < 0 && aprChange < 0) {
      console.log("✅ CORRECT: Utilization decreased → APR decreased");
    } else {
      console.log("❌ ERROR: Utilization and APR changed in opposite directions!");
    }
  } else {
    console.log("⚠️ Utilization did not change significantly - APR may not change");
  }
  
  // Test manual accrue
  console.log("\n🔧 Testing manual accrue...");
  try {
    const tx = await pool.accruePublic(assetAddress);
    await tx.wait();
    console.log("✅ Manual accrue successful");
    
    const afterAccrue = await getAPRData();
    console.log("  Utilization after accrue:", afterAccrue.utilization.toFixed(2) + "%");
    console.log("  Supply APR after accrue:", afterAccrue.supplyAPR.toFixed(4) + "%");
  } catch (e) {
    console.log("⚠️ Manual accrue failed:", e.message);
  }
}

main().catch(console.error);









