const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  const LENDING_POOL = "0x4464e7E4d1dAb44D4B192e59eE44570547b0baf7";
  const DAI = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";

  const poolAbi = [
    "function userReserves(address user, address asset) view returns (uint128 principal, uint128 index, uint128 principal2, uint128 index2, bool useAsCollateral)",
    "function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
  ];

  const pool = new ethers.Contract(LENDING_POOL, poolAbi, user);

  // Check user supply position
  const userReserve = await pool.userReserves(user.address, DAI);
  console.log("User supply principal:", userReserve.principal.toString());
  console.log("User supply index:", userReserve.index.toString());
  console.log("User borrow principal:", userReserve.principal2.toString());
  console.log("User borrow index:", userReserve.index2.toString());
  console.log("Use as collateral:", userReserve.useAsCollateral);

  // Check reserve data
  const r = await pool.reserves(DAI);
  console.log("Reserve liquidity index:", r.liquidityIndex.toString());
  console.log("Reserve cash:", r.reserveCash.toString());
}

main().catch(console.error);
