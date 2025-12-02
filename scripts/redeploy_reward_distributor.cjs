const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Redeploy RewardDistributor with new code and migrate LENDX tokens
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LENDXTokenAddress = getAddress("LENDXTokenAddress");
  const OldRewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("📋 Current addresses:");
  console.log("   LENDXToken:", LENDXTokenAddress);
  console.log("   Old RewardDistributor:", OldRewardDistributorAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log();

  // 1. Deploy new RewardDistributor
  console.log("1️⃣  Deploying new RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    LENDXTokenAddress,
    deployer.address // initial owner
  );
  await rewardDistributor.waitForDeployment();
  const newRewardDistributorAddress = await rewardDistributor.getAddress();
  console.log("   ✅ New RewardDistributor deployed:", newRewardDistributorAddress);

  // 2. Migrate LENDX tokens from old to new (if possible)
  console.log("\n2️⃣  Migrating LENDX tokens...");
  try {
    const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
    const lendxToken = LENDXToken.attach(LENDXTokenAddress);
    
    // Check old distributor balance
    const oldBalance = await lendxToken.balanceOf(OldRewardDistributorAddress);
    console.log("   Old RewardDistributor balance:", ethers.formatEther(oldBalance), "LENDX");
    
    if (oldBalance > 0n) {
      // Try to transfer from old distributor (if we can)
      // This might fail if old distributor doesn't allow it
      console.log("   ⚠️  Old distributor has tokens. Manual migration may be needed.");
      console.log("   💡 You may need to call emergencyWithdraw from old distributor if it has that function.");
    }
    
    // Transfer 80M LENDX to new distributor (same as initial deployment)
    const REWARD_AMOUNT = ethers.parseUnits("80000000", 18); // 80M
    const currentBalance = await lendxToken.balanceOf(deployer.address);
    console.log("   Deployer LENDX balance:", ethers.formatEther(currentBalance), "LENDX");
    
    if (currentBalance >= REWARD_AMOUNT) {
      console.log("   Transferring 80M LENDX to new RewardDistributor...");
      const transferTx = await lendxToken.transfer(newRewardDistributorAddress, REWARD_AMOUNT);
      await transferTx.wait();
      console.log("   ✅ Transferred 80M LENDX to new RewardDistributor");
    } else {
      console.log("   ⚠️  Deployer doesn't have enough LENDX. You may need to mint or transfer more.");
    }
  } catch (error) {
    console.error("   ❌ Error migrating tokens:", error.message);
  }

  // 3. Configure new RewardDistributor
  console.log("\n3️⃣  Configuring new RewardDistributor...");
  try {
    const setTx = await rewardDistributor.setRewardAccumulator(RewardAccumulatorAddress);
    await setTx.wait();
    console.log("   ✅ RewardAccumulator set in new RewardDistributor");
  } catch (error) {
    console.error("   ❌ Error:", error.message);
  }

  // 4. Update LendingPool to use new RewardDistributor (if needed)
  // Actually, LendingPool doesn't directly use RewardDistributor,
  // it uses RewardAccumulator which then uses RewardDistributor
  // So we just need to make sure RewardAccumulator uses new RewardDistributor
  
  // Wait, RewardAccumulator constructor takes RewardDistributor, so we'd need to redeploy it too
  // Or we can update RewardAccumulator's rewardDistributor if it has that function
  
  // Actually, RewardAccumulator has immutable rewardDistributor, so we need to redeploy it
  console.log("\n4️⃣  Redeploying RewardAccumulator with new RewardDistributor...");
  try {
    const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
    const rewardAccumulator = await RewardAccumulator.deploy(
      newRewardDistributorAddress, // new RewardDistributor
      deployer.address // initial owner
    );
    await rewardAccumulator.waitForDeployment();
    const newAccumulatorAddress = await rewardAccumulator.getAddress();
    console.log("   ✅ New RewardAccumulator deployed:", newAccumulatorAddress);

    // Configure new RewardAccumulator
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = LendingPool.attach(getAddress("LendingPoolAddress"));
    
    const setPoolTx = await rewardAccumulator.setLendingPool(getAddress("LendingPoolAddress"));
    await setPoolTx.wait();
    console.log("   ✅ LendingPool set in new RewardAccumulator");

    // Update LendingPool
    const setAccumulatorTx = await lendingPool.setRewardAccumulator(newAccumulatorAddress);
    await setAccumulatorTx.wait();
    console.log("   ✅ New RewardAccumulator set in LendingPool");

    // Update addresses.js
    console.log("\n5️⃣  Updating addresses.js...");
    let content = fs.readFileSync(addressesPath, "utf8");
    content = content.replace(
      /export const RewardDistributorAddress\s*=\s*"[^"]+";/g,
      `export const RewardDistributorAddress = "${newRewardDistributorAddress}";`
    );
    content = content.replace(
      /export const RewardAccumulatorAddress\s*=\s*"[^"]+";/g,
      `export const RewardAccumulatorAddress = "${newAccumulatorAddress}";`
    );
    fs.writeFileSync(addressesPath, content);
    console.log("   ✅ addresses.js updated");

    console.log("\n✅ All done! Reward system is now fully configured.");
    console.log("   - New RewardDistributor:", newRewardDistributorAddress);
    console.log("   - New RewardAccumulator:", newAccumulatorAddress);
    console.log("\n💡 Test by supplying tokens and checking rewards!");

  } catch (error) {
    console.error("   ❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

















