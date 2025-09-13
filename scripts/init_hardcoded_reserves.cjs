const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Initializing hardcoded reserves...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const INTEREST_RATE_MODEL = "0xad7B1101ca1BE7c85cA2b6Bb59f9F3db96Ce102d";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const irm = await ethers.getContractAt("InterestRateModel", INTEREST_RATE_MODEL);
    
    // Get hardcoded addresses
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    
    console.log("📋 Hardcoded addresses:");
    console.log("WETH:", hardcodedWETH);
    console.log("DAI:", hardcodedDAI);
    
    // Interest rate parameters
    const SECONDS_PER_YEAR = 365 * 24 * 3600;
    const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
    
    const base = toRayPerSec(0.001);  // 0.1%
    const s1 = toRayPerSec(0.002);    // 0.2%
    const s2 = toRayPerSec(0.01);     // 1.0%
    
    // Risk parameters
    const reserveFactorBps = 1000; // 10%
    const ltvBps = 7500;           // 75%
    const liqThresholdBps = 8000;  // 80%
    const liqBonusBps = 500;       // 5%
    const closeFactorBps = 5000;   // 50%
    const optimalUBps = 8000;      // 80%
    
    // Init WETH (collateral only)
    console.log("\n🔧 Initializing WETH reserve...");
    await (await pool.initReserve(
      hardcodedWETH, 18,
      reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
      false, // isBorrowable = false (collateral only)
      optimalUBps, base, s1, s2
    )).wait();
    console.log("✅ WETH reserve initialized");
    
    // Init DAI (borrowable)
    console.log("\n🔧 Initializing DAI reserve...");
    await (await pool.initReserve(
      hardcodedDAI, 18,
      reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
      true, // isBorrowable = true
      optimalUBps, base, s1, s2
    )).wait();
    console.log("✅ DAI reserve initialized");
    
    // Verify reserves
    console.log("\n🔍 Verifying reserves...");
    const wethReserve = await pool.reserves(hardcodedWETH);
    const daiReserve = await pool.reserves(hardcodedDAI);
    
    console.log("WETH reserve:");
    console.log("  isBorrowable:", wethReserve.isBorrowable);
    console.log("  ltvBps:", wethReserve.ltvBps.toString());
    
    console.log("DAI reserve:");
    console.log("  isBorrowable:", daiReserve.isBorrowable);
    console.log("  ltvBps:", daiReserve.ltvBps.toString());
    
    console.log("\n🎉 Hardcoded reserves initialized successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
