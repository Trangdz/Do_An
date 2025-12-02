const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Setup Sustainable Reward Mechanism ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const LENDXTokenAddress = getAddress("LENDXTokenAddress");
  
  // Get contracts
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);
  
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);
  
  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = LENDXToken.attach(LENDXTokenAddress);
  
  console.log("📋 Current Status:");
  const poolStatus = await rewardDistributor.getPoolStatus();
  console.log("   Pool Balance:", ethers.formatEther(poolStatus.balance), "LENDX");
  console.log("   Days since last emission:", poolStatus.daysSinceLastEmission.toString());
  console.log("   Pending emission:", ethers.formatEther(poolStatus.pendingEmission), "LENDX");
  console.log();
  
  // 1. Setup emission source (use deployer as treasury for demo)
  console.log("1️⃣  Setting up emission source...");
  const dailyEmissionRate = ethers.parseUnits("100000", 18); // 100K LENDX/day
  const emissionSource = deployer.address; // Use deployer as treasury for demo
  
  try {
    // Approve RewardDistributor to transfer from treasury
    const currentAllowance = await lendxToken.allowance(emissionSource, RewardDistributorAddress);
    const requiredAllowance = ethers.parseUnits("10000000", 18); // 10M LENDX allowance (enough for 100 days)
    
    if (currentAllowance < requiredAllowance) {
      console.log("   💡 Approving RewardDistributor to transfer from treasury...");
      const approveTx = await lendxToken.approve(RewardDistributorAddress, requiredAllowance);
      await approveTx.wait();
      console.log("   ✅ Approved:", ethers.formatEther(requiredAllowance), "LENDX");
    } else {
      console.log("   ✅ Already approved");
    }
    
    // Set emission params
    const setEmissionTx = await rewardDistributor.setEmissionParams(
      dailyEmissionRate,
      emissionSource,
      true // Active
    );
    await setEmissionTx.wait();
    console.log("   ✅ Emission source set:", emissionSource);
    console.log("   ✅ Daily emission rate:", ethers.formatEther(dailyEmissionRate), "LENDX/day");
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
  console.log();
  
  // 2. Process initial emission (if needed)
  console.log("2️⃣  Processing daily emission...");
  try {
    const emissionTx = await rewardDistributor.processDailyEmission();
    await emissionTx.wait();
    console.log("   ✅ Daily emission processed");
    
    const newStatus = await rewardDistributor.getPoolStatus();
    console.log("   New pool balance:", ethers.formatEther(newStatus.balance), "LENDX");
  } catch (error) {
    console.log("   ⚠️  Emission processing:", error.message);
    if (error.message.includes("emission not active")) {
      console.log("   💡 Emission is not active, activating...");
      try {
        await rewardDistributor.setEmissionParams(dailyEmissionRate, emissionSource, true);
        await rewardDistributor.processDailyEmission();
        console.log("   ✅ Activated and processed");
      } catch (e) {
        console.log("   ❌ Error:", e.message);
      }
    }
  }
  console.log();
  
  // 3. Setup dynamic rate adjustment
  console.log("3️⃣  Setting up dynamic rate adjustment...");
  try {
    const minPoolBalance = ethers.parseUnits("10000000", 18); // 10M LENDX
    const setDynamicTx = await rewardAccumulator.setDynamicRateParams(minPoolBalance, true);
    await setDynamicTx.wait();
    console.log("   ✅ Dynamic rate adjustment enabled");
    console.log("   ✅ Min pool balance threshold:", ethers.formatEther(minPoolBalance), "LENDX");
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
  console.log();
  
  // 4. Check current rates
  console.log("4️⃣  Checking current reward rates...");
  try {
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
    const baseSupplyRate = await rewardAccumulator.baseSupplyRate();
    const baseBorrowRate = await rewardAccumulator.baseBorrowRate();
    
    console.log("   Base supply rate:", ethers.formatEther(baseSupplyRate), "LENDX/token/sec");
    console.log("   Base borrow rate:", ethers.formatEther(baseBorrowRate), "LENDX/token/sec");
    console.log("   Current supply rate:", ethers.formatEther(supplyRate), "LENDX/token/sec");
    console.log("   Current borrow rate:", ethers.formatEther(borrowRate), "LENDX/token/sec");
    
    if (supplyRate < baseSupplyRate) {
      console.log("   ⚠️  Rate reduced due to low pool balance");
    } else {
      console.log("   ✅ Rate at full capacity");
    }
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
  console.log();
  
  // 5. Summary
  console.log("=".repeat(60));
  console.log("✅ Setup Complete!");
  console.log("=".repeat(60));
  console.log("\n📝 Sustainable Reward Mechanism:");
  console.log("   1. Daily Claim Limit: 1,000 LENDX/user/day");
  console.log("   2. Daily Emission: 100,000 LENDX/day");
  console.log("   3. Dynamic Rate: Auto-adjusts based on pool balance");
  console.log("\n💡 Next steps:");
  console.log("   - Call processDailyEmission() mỗi ngày (có thể setup keeper bot)");
  console.log("   - Monitor pool balance với getPoolStatus()");
  console.log("   - Rate sẽ tự động điều chỉnh khi pool cạn");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });












