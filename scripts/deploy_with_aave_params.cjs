const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOY WITH AAVE-STYLE PARAMETERS");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  
  // Deploy contracts
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const irm = await InterestRateModel.deploy();
  await irm.waitForDeployment();

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(
    await irm.getAddress(),
    await oracle.getAddress(),
    await weth.getAddress(),
    await dai.getAddress()
  );
  await pool.waitForDeployment();

  console.log("✅ Contracts deployed");

  // ⭐ AAVE-STYLE PARAMETERS ⭐
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

  // Aave-like parameters (higher slopes)
  const base = toRayPerSec(0);        // 0% base (like Aave)
  const s1 = toRayPerSec(0.04);       // 4% APR Slope 1 (like Aave)
  const s2 = toRayPerSec(0.75);       // 75% APR Slope 2 (like Aave)
  const optimalU = 9000;              // 90% optimal (like Aave)

  console.log("\n📊 Using AAVE-STYLE Parameters:");
  console.log("   Base Rate: 0% APR");
  console.log("   Slope 1:   4% APR");
  console.log("   Slope 2:   75% APR");
  console.log("   Optimal U: 90%");
  console.log("   Rmax:      79% APR");

  // Initialize reserves
  await pool.initReserve(
    usdcAddress,
    6,              // decimals
    1000,           // reserve factor (10%)
    7500,           // LTV (75%)
    8000,           // liquidation threshold (80%)
    500,            // liquidation bonus (5%)
    5000,           // close factor (50%)
    true,           // borrowable
    optimalU,       // 90%
    base,           // 0%
    s1,             // 4%
    s2              // 75%
  );

  console.log("\n✅ Reserve initialized with Aave-style parameters!");
  console.log("\n🎯 Expected Results:");
  console.log("   At 0% utilization:   0% APR");
  console.log("   At 50% utilization:  ~2.2% APR");
  console.log("   At 90% utilization:  4% APR");
  console.log("   At 95% utilization:  ~42% APR ⚡");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });

