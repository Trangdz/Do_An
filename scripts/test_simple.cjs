const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  const LENDING_POOL = "0x4464e7E4d1dAb44D4B192e59eE44570547b0baf7";
  const DAI = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";

  const poolAbi = [
    "function lend(address asset, uint256 amount) external",
    "function withdraw(address asset, uint256 requested) external returns (uint256)",
    "function accruePublic(address asset) external",
    "function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
  ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const pool = new ethers.Contract(LENDING_POOL, poolAbi, user);
  const dai = new ethers.Contract(DAI, erc20Abi, user);

  // Check current state
  const daiDec = await dai.decimals();
  const daiBal = await dai.balanceOf(user.address);
  const poolBal = await dai.balanceOf(LENDING_POOL);
  
  console.log("User DAI balance:", ethers.formatUnits(daiBal, daiDec));
  console.log("Pool DAI balance:", ethers.formatUnits(poolBal, daiDec));
  
  const r = await pool.reserves(DAI);
  console.log("ReserveCash (1e18):", r.reserveCash.toString());
  console.log("LiquidityIndex:", r.liquidityIndex.toString());
  
  // Try to lend first
  const lendAmount = ethers.parseUnits("1000", daiDec);
  console.log("Trying to lend 1000 DAI...");
  
  try {
    // Approve first
    await dai.approve(LENDING_POOL, lendAmount);
    console.log("✅ Approved");
    
    // Then lend
    const tx = await pool.lend(DAI, lendAmount, { gasLimit: 1000000 });
    await tx.wait();
    console.log("✅ Lend successful!");
    
    // Check state after lend
    const r2 = await pool.reserves(DAI);
    console.log("ReserveCash after lend (1e18):", r2.reserveCash.toString());
    
    // Now try withdraw
    const withdrawAmount = ethers.parseUnits("500", daiDec);
    console.log("Trying to withdraw 500 DAI...");
    
    const tx2 = await pool.withdraw(DAI, withdrawAmount, { gasLimit: 1000000 });
    await tx2.wait();
    console.log("✅ Withdraw successful!");
    
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

main().catch(console.error);
