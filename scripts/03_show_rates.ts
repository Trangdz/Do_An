import { ethers } from "hardhat";

async function main() {
  // Lấy provider và signer (ganache)
  const [deployer] = await ethers.getSigners();

  // Địa chỉ LendingPool bạn đã deploy ở Day 3
  const LENDING_POOL = "<PASTE_LENDINGPOOL_ADDRESS>";

  // ABI tối thiểu chỉ cần event
  const abi = [
    "event ReserveDataUpdated(address indexed asset,uint256 utilizationWad,uint256 liquidityRateRayPerSec,uint256 variableBorrowRateRayPerSec,uint256 liquidityIndexRay,uint256 variableBorrowIndexRay)"
  ];

  const pool = new ethers.Contract(LENDING_POOL, abi, deployer);

  console.log("Listening ReserveDataUpdated events...");

  pool.on(
    "ReserveDataUpdated",
    (
      asset: string,
      utilizationWad: bigint,
      liquidityRateRayPerSec: bigint,
      variableBorrowRateRayPerSec: bigint,
      liquidityIndexRay: bigint,
      variableBorrowIndexRay: bigint
    ) => {
      const WAD = 1e18;
      const RAY = 1e27;
      const SECONDS_PER_YEAR = 365 * 24 * 3600;

      // Convert U
      const Upercent = Number(utilizationWad) / WAD * 100;

      // Convert rates to APR%
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
}

main().catch(console.error);
