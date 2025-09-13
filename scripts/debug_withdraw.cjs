const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  const LENDING_POOL = "0x4464e7E4d1dAb44D4B192e59eE44570547b0baf7";
  const DAI = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";

  const poolAbi = [
    "function withdraw(address asset, uint256 requested) external returns (uint256)",
    "function accruePublic(address asset) external",
    "function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
  ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
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
  
  // Try small withdraw first
  const smallWithdraw = ethers.parseUnits("1000", daiDec);
  console.log("Trying to withdraw 1000 DAI...");
  
  try {
    const tx = await pool.withdraw(DAI, smallWithdraw, { gasLimit: 1000000 });
    await tx.wait();
    console.log("✅ Small withdraw successful!");
  } catch (error) {
    console.log("❌ Small withdraw failed:", error.message);
  }
}

main().catch(console.error);
