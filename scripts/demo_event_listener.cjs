const { ethers } = require("hardhat");

async function main() {
  console.log("🎧 LendHub v2 - Event Listener Demo");
  console.log("=" .repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Contract addresses
  const LENDING_POOL = "0xD898096173C48c8bFef6677DBCC87343c4fEaD19";
  const DAI = "0x78608d72b50ebC71089C30bdf6bACe5265AA9aa3";
  const USDC = "0x695c9dF29c5a800a3e311A2C9f3f5818703aA899";
  
  console.log("📋 Contract Addresses:");
  console.log("LendingPool:", LENDING_POOL);
  console.log("DAI:", DAI);
  console.log("USDC:", USDC);
  
  // ABI for ReserveDataUpdated event
  const abi = [
    "event ReserveDataUpdated(address indexed asset,uint256 utilizationWad,uint256 liquidityRateRayPerSec,uint256 variableBorrowRateRayPerSec,uint256 liquidityIndexRay,uint256 variableBorrowIndexRay)"
  ];
  
  const pool = new ethers.Contract(LENDING_POOL, abi, deployer);
  
  console.log("\n🎧 Listening for ReserveDataUpdated events...");
  console.log("Note: Events will only be emitted when _accrue() is called internally");
  console.log("This happens when supply/borrow/repay functions are implemented");
  console.log("\nPress Ctrl+C to stop\n");
  
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
  
  // Keep the script running
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping event listener...');
    process.exit(0);
  });
  
  // Keep alive
  setInterval(() => {
    // Do nothing, just keep the process alive
  }, 1000);
}

main().catch(console.error);
