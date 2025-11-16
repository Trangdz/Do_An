const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Redeploy LendingPool with reward system support
 * WARNING: This will create a new LendingPool. Users will need to supply again.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();
  console.log("⚠️  WARNING: This will redeploy LendingPool!");
  console.log("   Users will need to supply tokens again.");
  console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");
  console.log();
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const InterestRateModelAddress = getAddress("InterestRateModelAddress");
  const PriceOracleAddress = getAddress("PriceOracleAddress");
  const WETHAddress = getAddress("WETHAddress");
  const DAIAddress = getAddress("DAIAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const GovernorAddress = getAddress("GovernorAddress");

  console.log("📋 Current addresses:");
  console.log("   InterestRateModel:", InterestRateModelAddress);
  console.log("   PriceOracle:", PriceOracleAddress);
  console.log("   WETH:", WETHAddress);
  console.log("   DAI:", DAIAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log("   Governor:", GovernorAddress);
  console.log();

  // 1. Deploy new LendingPool
  console.log("1️⃣  Deploying new LendingPool with reward support...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    InterestRateModelAddress,
    PriceOracleAddress,
    WETHAddress,
    DAIAddress
  );
  await lendingPool.waitForDeployment();
  const newPoolAddress = await lendingPool.getAddress();
  console.log("   ✅ New LendingPool deployed:", newPoolAddress);
  console.log();

  // 2. Configure RewardAccumulator
  console.log("2️⃣  Configuring RewardAccumulator...");
  if (RewardAccumulatorAddress) {
    const setAccumulatorTx = await lendingPool.setRewardAccumulator(RewardAccumulatorAddress);
    await setAccumulatorTx.wait();
    console.log("   ✅ RewardAccumulator set");
  }
  console.log();

  // 3. Configure Governor
  console.log("3️⃣  Configuring Governor...");
  if (GovernorAddress) {
    const Governor = await hre.ethers.getContractFactory("LendHubGovernor");
    const governor = Governor.attach(GovernorAddress);
    
    try {
      const setPoolTx = await governor.setLendingPool(newPoolAddress);
      await setPoolTx.wait();
      console.log("   ✅ LendingPool set in Governor");
    } catch (error) {
      console.log("   ⚠️  Error setting LendingPool in Governor:", error.message);
    }

    // Set asset addresses in Governor
    const assets = [
      { symbol: "WETH", address: WETHAddress },
      { symbol: "DAI", address: DAIAddress },
      { symbol: "USDC", address: getAddress("USDCAddress") },
    ];

    for (const asset of assets) {
      if (asset.address) {
        try {
          const setAssetTx = await governor.setAssetAddress(asset.symbol, asset.address);
          await setAssetTx.wait();
          console.log(`   ✅ ${asset.symbol} address set in Governor`);
        } catch (error) {
          console.log(`   ⚠️  Error setting ${asset.symbol}:`, error.message);
        }
      }
    }
  }
  console.log();

  // 4. Set Governor in LendingPool
  console.log("4️⃣  Setting Governor in LendingPool...");
  if (GovernorAddress) {
    try {
      const setGovernorTx = await lendingPool.setGovernor(GovernorAddress);
      await setGovernorTx.wait();
      console.log("   ✅ Governor set in LendingPool");
    } catch (error) {
      console.log("   ⚠️  Error setting Governor:", error.message);
    }
  }
  console.log();

  // 5. Initialize reserves (same as deploy_ganache_simple.cjs)
  console.log("5️⃣  Initializing reserves...");
  const assetsToInit = [
    { address: WETHAddress, symbol: "WETH", ltv: 8000, liqThreshold: 8500, isBorrowable: false },
    { address: DAIAddress, symbol: "DAI", ltv: 7500, liqThreshold: 8000, isBorrowable: true },
    { address: getAddress("USDCAddress"), symbol: "USDC", ltv: 7500, liqThreshold: 8000, isBorrowable: true },
  ].filter(a => a.address);

  for (const asset of assetsToInit) {
    try {
      // Get decimals
      const ERC20_ABI = ["function decimals() view returns (uint8)"];
      const token = new ethers.Contract(asset.address, ERC20_ABI, deployer);
      const decimals = await token.decimals();

      // Use correct initReserve signature
      const SECONDS_PER_YEAR = 365 * 24 * 3600;
      const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
      
      const baseRate = toRayPerSec(0.001);   // 0.1% base APR
      const slope1 = toRayPerSec(0.002);     // 0.2% slope 1
      const slope2 = toRayPerSec(0.01);      // 1% slope 2

      const initTx = await lendingPool.initReserve(
        asset.address,
        decimals,
        1000,  // reserveFactorBps (10%)
        asset.ltv,
        asset.liqThreshold,
        500,   // liqBonusBps (5%)
        5000,  // closeFactorBps (50%)
        asset.isBorrowable,
        8000,  // optimalUBps (80%)
        baseRate,
        slope1,
        slope2
      );
      await initTx.wait();
      console.log(`   ✅ ${asset.symbol} reserve initialized`);
    } catch (error) {
      console.log(`   ⚠️  Error initializing ${asset.symbol}:`, error.message);
      console.log(`   💡 You may need to initialize manually or use deploy_ganache_simple.cjs`);
    }
  }
  console.log();

  // 6. Update addresses.js
  console.log("6️⃣  Updating addresses.js...");
  try {
    let content = fs.readFileSync(addressesPath, "utf8");
    content = content.replace(
      /export const LendingPoolAddress\s*=\s*"[^"]+";/g,
      `export const LendingPoolAddress = "${newPoolAddress}";`
    );
    fs.writeFileSync(addressesPath, content);
    console.log("   ✅ addresses.js updated");
  } catch (error) {
    console.error("   ❌ Error updating addresses.js:", error.message);
  }
  console.log();

  // 7. Verify
  console.log("7️⃣  Verifying configuration...");
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const poolGovernor = await lendingPool.governor();
  
  console.log("   LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("   LendingPool.governor:", poolGovernor);
  console.log();

  if (
    poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase() &&
    poolGovernor.toLowerCase() === GovernorAddress.toLowerCase()
  ) {
    console.log("   ✅ All configurations correct!");
  } else {
    console.log("   ⚠️  Some configurations may be incorrect");
  }

  console.log();
  console.log("=".repeat(70));
  console.log("✅ REDEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log();
  console.log("📋 New LendingPool address:", newPoolAddress);
  console.log();
  console.log("⚠️  IMPORTANT:");
  console.log("   1. Users need to supply tokens again");
  console.log("   2. Frontend needs to be refreshed");
  console.log("   3. Reward system should now work!");
  console.log();
  console.log("🧪 Test by:");
  console.log("   1. Supply some tokens");
  console.log("   2. Wait a few seconds");
  console.log("   3. Supply/withdraw again");
  console.log("   4. Check claimable reward - should see rewards!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

