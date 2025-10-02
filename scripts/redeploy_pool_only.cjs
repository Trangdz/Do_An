const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔄 REDEPLOYING LendingPool with DUST FIX\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Existing contract addresses (from your error)
  const usdcAddress = "0x93af6980c2A5330FfCF48D5c66D2C6E0a05b6101";
  const wethAddress = "0x0000000000000000000000000000000000000000"; // Update if needed
  
  console.log("\n📦 Existing contracts:");
  console.log("USDC:", usdcAddress);

  // Deploy new LendingPool
  console.log("\n🏗️  Deploying new LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy();
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  
  console.log("✅ LendingPool deployed:", poolAddress);

  // Initialize USDC reserve
  console.log("\n⚙️  Initializing USDC reserve...");
  const tx = await pool.initReserve(
    usdcAddress,
    6, // decimals
    ethers.parseUnits("0.8", 18), // 80% LTV
    ethers.parseUnits("0.85", 18), // 85% liquidation threshold
    ethers.parseUnits("0.05", 18), // 5% reserve factor
    ethers.parseUnits("0.03", 18), // 3% base rate
    ethers.parseUnits("0.05", 18), // 5% slope1
    ethers.parseUnits("1.00", 18), // 100% slope2
    ethers.parseUnits("0.8", 18)   // 80% optimal utilization
  );
  await tx.wait();
  console.log("✅ USDC reserve initialized");

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("LendingPool:", poolAddress);
  console.log("USDC:", usdcAddress);
  console.log("\n⚠️  IMPORTANT: Update frontend with new pool address!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


