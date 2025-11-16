const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying LendingPool with Governor support...");
  console.log("Deployer:", deployer.address);

  // Read existing addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  // Extract existing addresses
  const irmMatch = addressesContent.match(/InterestRateModelAddress\s*=\s*"([^"]+)"/);
  const oracleMatch = addressesContent.match(/PriceOracleAddress\s*=\s*"([^"]+)"/);
  const wethMatch = addressesContent.match(/WETHAddress\s*=\s*"([^"]+)"/);
  const daiMatch = addressesContent.match(/DAIAddress\s*=\s*"([^"]+)"/);
  const governorMatch = addressesContent.match(/GovernorAddress\s*=\s*"([^"]+)"/);

  if (!irmMatch || !oracleMatch || !wethMatch || !daiMatch) {
    console.error("❌ Required addresses not found");
    process.exit(1);
  }

  const irmAddress = irmMatch[1];
  const oracleAddress = oracleMatch[1];
  const wethAddress = wethMatch[1];
  const daiAddress = daiMatch[1];
  const governorAddress = governorMatch ? governorMatch[1] : null;

  console.log("\n📋 Using existing addresses:");
  console.log(`   InterestRateModel: ${irmAddress}`);
  console.log(`   PriceOracle: ${oracleAddress}`);
  console.log(`   WETH: ${wethAddress}`);
  console.log(`   DAI: ${daiAddress}`);
  if (governorAddress) {
    console.log(`   Governor: ${governorAddress}`);
  }

  // Deploy new LendingPool
  console.log("\n🚀 Deploying new LendingPool...");
  const LendingPoolFactory = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPoolFactory.deploy(
    irmAddress,
    oracleAddress,
    wethAddress,
    daiAddress
  );
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.getAddress();
  console.log("✅ New LendingPool deployed:", poolAddress);

  // Set Governor if available
  if (governorAddress) {
    console.log("\n🔧 Setting Governor in LendingPool...");
    try {
      const tx = await lendingPool.setGovernor(governorAddress);
      await tx.wait();
      console.log("✅ Governor set:", governorAddress);
    } catch (error) {
      console.error("❌ Error setting Governor:", error.message);
    }
  }

  // Update addresses.js safely
  console.log("\n📝 Updating addresses.js...");
  const { updateAddresses } = require("./utils/update_addresses");
  try {
    const result = updateAddresses({ LendingPoolAddress: poolAddress }, addressesPath);
    console.log("✅ Updated addresses.js");
    if (result.duplicates) {
      console.warn("⚠️  WARNING: Found duplicates:", result.duplicates);
    }
  } catch (error) {
    console.error("❌ Error updating addresses.js:", error.message);
    throw error;
  }

  console.log("\n⚠️  IMPORTANT: You need to re-initialize reserves in the new LendingPool!");
  console.log("   Run the initReserve calls from deploy_ganache_simple.cjs");
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ LENDINGPOOL REDEPLOYED                              ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

