const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Setup reward system by deploying RewardAccumulator and configuring it
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deploymentsDir = "deployments";
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // Load existing deployments
  let lendxSystem, lendingPoolAddress;
  try {
    lendxSystem = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "lendx-token-system.json"), "utf8"));
    console.log("📋 Found LENDX Token System deployment\n");
  } catch (e) {
    console.error("❌ Could not find LENDX token system deployment. Please deploy it first:");
    console.error("   npx hardhat run scripts/deploy_lendx_token_system.cjs --network ganache");
    process.exit(1);
  }

  try {
    const localChainlink = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "local-chainlink.json"), "utf8"));
    // Try different possible keys
    lendingPoolAddress = localChainlink.contracts?.lendingPool 
      || localChainlink.lendingPool 
      || localChainlink.contracts?.LendingPool
      || localChainlink.LendingPoolAddress;
    
    if (!lendingPoolAddress) {
      throw new Error("LendingPool address not found in deployment file");
    }
    console.log("📋 Found LendingPool:", lendingPoolAddress, "\n");
  } catch (e) {
    console.error("❌ Could not find LendingPool address. Please deploy LendingPool first.");
    console.error("   Error:", e.message);
    console.error("\n💡 Run: npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🎁 SETTING UP REWARD ACCUMULATOR SYSTEM                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const rewardDistributorAddress = lendxSystem.rewardDistributor;
  const lendxTokenAddress = lendxSystem.lendxToken;

  // 1. Deploy RewardAccumulator
  console.log("1️⃣  Deploying RewardAccumulator...");
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = await RewardAccumulator.deploy(
    rewardDistributorAddress,
    lendingPoolAddress,
    deployer.address
  );
  await rewardAccumulator.waitForDeployment();
  const accumulatorAddress = await rewardAccumulator.getAddress();
  console.log("   ✅ RewardAccumulator deployed:", accumulatorAddress);

  // 2. Set RewardAccumulator as owner of RewardDistributor (so it can call accumulateReward)
  console.log("\n2️⃣  Configuring RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(rewardDistributorAddress);
  
  // Transfer ownership of RewardDistributor to RewardAccumulator
  const transferTx = await rewardDistributor.transferOwnership(accumulatorAddress);
  await transferTx.wait();
  console.log("   ✅ RewardDistributor ownership transferred to RewardAccumulator");

  // 3. Set RewardAccumulator in LendingPool
  console.log("\n3️⃣  Configuring LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(lendingPoolAddress);
  
  const setAccumulatorTx = await lendingPool.setRewardAccumulator(accumulatorAddress);
  await setAccumulatorTx.wait();
  console.log("   ✅ LendingPool reward accumulator set");

  // 4. Add tracked assets to RewardAccumulator
  console.log("\n4️⃣  Adding tracked assets...");
  // Read addresses from addresses.js as fallback
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  let trackedAssets = [];
  
  // Try to get from local-chainlink.json first
  try {
    const localChainlink = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "local-chainlink.json"), "utf8"));
    trackedAssets = [
      localChainlink.tokens?.weth || localChainlink.weth,
      localChainlink.tokens?.dai || localChainlink.dai,
      localChainlink.tokens?.usdc || localChainlink.usdc,
    ].filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");
  } catch (e) {
    // Fallback to addresses.js
  }
  
  // If still empty, read from addresses.js
  if (trackedAssets.length === 0 && fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    const wethMatch = addressesContent.match(/export const WETHAddress = "([^"]+)"/);
    const daiMatch = addressesContent.match(/export const DAIAddress = "([^"]+)"/);
    const usdcMatch = addressesContent.match(/export const USDCAddress = "([^"]+)"/);
    
    trackedAssets = [
      wethMatch ? wethMatch[1] : null,
      daiMatch ? daiMatch[1] : null,
      usdcMatch ? usdcMatch[1] : null,
    ].filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");
  }
  
  if (trackedAssets.length === 0) {
    console.warn("   ⚠️  No tracked assets found. You may need to add them manually.");
  }

  for (const asset of trackedAssets) {
    try {
      const addTx = await rewardAccumulator.addTrackedAsset(asset);
      await addTx.wait();
      console.log(`   ✅ Added asset: ${asset}`);
    } catch (err) {
      console.warn(`   ⚠️  Could not add asset ${asset}:`, err.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    ...lendxSystem,
    rewardAccumulator: accumulatorAddress,
    setupAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "lendx-token-system.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update frontend addresses
  const frontendAddressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  if (fs.existsSync(frontendAddressesPath)) {
    let addressesContent = fs.readFileSync(frontendAddressesPath, "utf8");
    
    // Update RewardAccumulator address safely
    const { updateAddresses } = require("./utils/update_addresses");
    try {
      const result = updateAddresses({ RewardAccumulatorAddress: accumulatorAddress }, frontendAddressesPath);
      console.log("\n✅ Updated frontend addresses.js");
      if (result.duplicates) {
        console.warn("⚠️  Removed duplicates:", result.duplicates);
      }
    } catch (error) {
      console.error("❌ Error updating addresses.js:", error.message);
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ SETUP COMPLETE                                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  
  console.log("📝 Reward System is now active!");
  console.log("   - Users will automatically earn LENDX when they supply/borrow");
  console.log("   - Rewards are calculated based on balance and time");
  console.log("   - Users can claim rewards from the Dashboard\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


const fs = require("fs");
const path = require("path");

/**
 * @notice Setup reward system by deploying RewardAccumulator and configuring it
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deploymentsDir = "deployments";
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // Load existing deployments
  let lendxSystem, lendingPoolAddress;
  try {
    lendxSystem = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "lendx-token-system.json"), "utf8"));
    console.log("📋 Found LENDX Token System deployment\n");
  } catch (e) {
    console.error("❌ Could not find LENDX token system deployment. Please deploy it first:");
    console.error("   npx hardhat run scripts/deploy_lendx_token_system.cjs --network ganache");
    process.exit(1);
  }

  try {
    const localChainlink = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "local-chainlink.json"), "utf8"));
    // Try different possible keys
    lendingPoolAddress = localChainlink.contracts?.lendingPool 
      || localChainlink.lendingPool 
      || localChainlink.contracts?.LendingPool
      || localChainlink.LendingPoolAddress;
    
    if (!lendingPoolAddress) {
      throw new Error("LendingPool address not found in deployment file");
    }
    console.log("📋 Found LendingPool:", lendingPoolAddress, "\n");
  } catch (e) {
    console.error("❌ Could not find LendingPool address. Please deploy LendingPool first.");
    console.error("   Error:", e.message);
    console.error("\n💡 Run: npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🎁 SETTING UP REWARD ACCUMULATOR SYSTEM                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const rewardDistributorAddress = lendxSystem.rewardDistributor;
  const lendxTokenAddress = lendxSystem.lendxToken;

  // 1. Deploy RewardAccumulator
  console.log("1️⃣  Deploying RewardAccumulator...");
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = await RewardAccumulator.deploy(
    rewardDistributorAddress,
    lendingPoolAddress,
    deployer.address
  );
  await rewardAccumulator.waitForDeployment();
  const accumulatorAddress = await rewardAccumulator.getAddress();
  console.log("   ✅ RewardAccumulator deployed:", accumulatorAddress);

  // 2. Set RewardAccumulator as owner of RewardDistributor (so it can call accumulateReward)
  console.log("\n2️⃣  Configuring RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(rewardDistributorAddress);
  
  // Transfer ownership of RewardDistributor to RewardAccumulator
  const transferTx = await rewardDistributor.transferOwnership(accumulatorAddress);
  await transferTx.wait();
  console.log("   ✅ RewardDistributor ownership transferred to RewardAccumulator");

  // 3. Set RewardAccumulator in LendingPool
  console.log("\n3️⃣  Configuring LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(lendingPoolAddress);
  
  const setAccumulatorTx = await lendingPool.setRewardAccumulator(accumulatorAddress);
  await setAccumulatorTx.wait();
  console.log("   ✅ LendingPool reward accumulator set");

  // 4. Add tracked assets to RewardAccumulator
  console.log("\n4️⃣  Adding tracked assets...");
  // Read addresses from addresses.js as fallback
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  let trackedAssets = [];
  
  // Try to get from local-chainlink.json first
  try {
    const localChainlink = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "local-chainlink.json"), "utf8"));
    trackedAssets = [
      localChainlink.tokens?.weth || localChainlink.weth,
      localChainlink.tokens?.dai || localChainlink.dai,
      localChainlink.tokens?.usdc || localChainlink.usdc,
    ].filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");
  } catch (e) {
    // Fallback to addresses.js
  }
  
  // If still empty, read from addresses.js
  if (trackedAssets.length === 0 && fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    const wethMatch = addressesContent.match(/export const WETHAddress = "([^"]+)"/);
    const daiMatch = addressesContent.match(/export const DAIAddress = "([^"]+)"/);
    const usdcMatch = addressesContent.match(/export const USDCAddress = "([^"]+)"/);
    
    trackedAssets = [
      wethMatch ? wethMatch[1] : null,
      daiMatch ? daiMatch[1] : null,
      usdcMatch ? usdcMatch[1] : null,
    ].filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");
  }
  
  if (trackedAssets.length === 0) {
    console.warn("   ⚠️  No tracked assets found. You may need to add them manually.");
  }

  for (const asset of trackedAssets) {
    try {
      const addTx = await rewardAccumulator.addTrackedAsset(asset);
      await addTx.wait();
      console.log(`   ✅ Added asset: ${asset}`);
    } catch (err) {
      console.warn(`   ⚠️  Could not add asset ${asset}:`, err.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    ...lendxSystem,
    rewardAccumulator: accumulatorAddress,
    setupAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "lendx-token-system.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update frontend addresses
  const frontendAddressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  if (fs.existsSync(frontendAddressesPath)) {
    let addressesContent = fs.readFileSync(frontendAddressesPath, "utf8");
    
    // Update RewardAccumulator address safely
    const { updateAddresses } = require("./utils/update_addresses");
    try {
      const result = updateAddresses({ RewardAccumulatorAddress: accumulatorAddress }, frontendAddressesPath);
      console.log("\n✅ Updated frontend addresses.js");
      if (result.duplicates) {
        console.warn("⚠️  Removed duplicates:", result.duplicates);
      }
    } catch (error) {
      console.error("❌ Error updating addresses.js:", error.message);
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ SETUP COMPLETE                                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  
  console.log("📝 Reward System is now active!");
  console.log("   - Users will automatically earn LENDX when they supply/borrow");
  console.log("   - Rewards are calculated based on balance and time");
  console.log("   - Users can claim rewards from the Dashboard\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






































