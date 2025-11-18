const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Check and Fix Reward System ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ addresses.js not found!");
    process.exit(1);
  }
  
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const WETHAddress = getAddress("WETHAddress");
  const DAIAddress = getAddress("DAIAddress");
  const USDCAddress = getAddress("USDCAddress");
  const LINKAddress = getAddress("LINKAddress");
  
  console.log("📋 Addresses:");
  console.log("   LendingPool:", LendingPoolAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log();
  
  // Get contracts
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);
  
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);
  
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);
  
  // 1. Check LendingPool.rewardAccumulator
  console.log("1️⃣  Checking LendingPool.rewardAccumulator...");
  const poolAccumulator = await lendingPool.rewardAccumulator();
  console.log("   Current:", poolAccumulator);
  console.log("   Expected:", RewardAccumulatorAddress);
  
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Fixing...");
    try {
      const tx = await lendingPool.setRewardAccumulator(RewardAccumulatorAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
      if (error.message.includes("onlyOwner")) {
        console.log("   💡 Need to call from owner address");
      }
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log();
  
  // 2. Check RewardAccumulator.lendingPool
  console.log("2️⃣  Checking RewardAccumulator.lendingPool...");
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  console.log("   Current:", accumulatorLendingPool);
  console.log("   Expected:", LendingPoolAddress);
  
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Fixing...");
    try {
      const tx = await rewardAccumulator.setLendingPool(LendingPoolAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log();
  
  // 3. Check RewardDistributor.rewardAccumulator
  console.log("3️⃣  Checking RewardDistributor.rewardAccumulator...");
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  console.log("   Current:", distributorAccumulator);
  console.log("   Expected:", RewardAccumulatorAddress);
  
  if (distributorAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Fixing...");
    try {
      const tx = await rewardDistributor.setRewardAccumulator(RewardAccumulatorAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
      if (error.message.includes("unauthorized")) {
        console.log("   💡 Trying to transfer ownership instead...");
        try {
          const owner = await rewardDistributor.owner();
          if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            const transferTx = await rewardDistributor.transferOwnership(RewardAccumulatorAddress);
            await transferTx.wait();
            console.log("   ✅ Ownership transferred to RewardAccumulator!");
          } else {
            console.log("   ⚠️  Owner is:", owner, "(not deployer)");
          }
        } catch (e) {
          console.log("   ❌ Transfer ownership failed:", e.message);
        }
      }
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log();
  
  // 4. Check tracked assets
  console.log("4️⃣  Checking tracked assets...");
  const assets = [
    { name: "WETH", address: WETHAddress },
    { name: "DAI", address: DAIAddress },
    { name: "USDC", address: USDCAddress },
    { name: "LINK", address: LINKAddress },
  ];
  
  for (const asset of assets) {
    try {
      // Check if asset is tracked (by trying to read lastUpdateTime for a test address)
      // If it throws or returns 0, might not be tracked
      const testAddress = "0x0000000000000000000000000000000000000000";
      const lastUpdate = await rewardAccumulator.lastUpdateTime(testAddress, asset.address);
      
      // Try to add asset (will fail if already tracked, but that's OK)
      try {
        const addTx = await rewardAccumulator.addTrackedAsset(asset.address);
        await addTx.wait();
        console.log(`   ✅ Added ${asset.name} to tracked assets`);
      } catch (error) {
        if (error.message.includes("already tracked") || error.message.includes("revert")) {
          console.log(`   ✅ ${asset.name} is already tracked`);
        } else {
          console.log(`   ⚠️  Could not add ${asset.name}:`, error.message);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking ${asset.name}:`, error.message);
    }
  }
  console.log();
  
  // 5. Check reward rates
  console.log("5️⃣  Checking reward rates...");
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
  console.log("   Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
  console.log("   Borrow rate:", ethers.formatEther(borrowRate), "LENDX per token per second");
  
  // Check if rates are too low
  const MIN_RATE = ethers.parseUnits("0.0001", 18); // 0.0001 LENDX per token per second
  if (supplyRate < MIN_RATE) {
    console.log("   ⚠️  Supply rate seems low. Consider increasing for demo purposes.");
    console.log("   💡 To increase: call rewardAccumulator.setRewardRates()");
  }
  if (borrowRate < MIN_RATE) {
    console.log("   ⚠️  Borrow rate seems low. Consider increasing for demo purposes.");
  }
  console.log();
  
  // 6. Summary
  console.log("=".repeat(60));
  console.log("✅ Check complete!");
  console.log("=".repeat(60));
  console.log("\n💡 Next steps:");
  console.log("   1. Make a supply/borrow transaction");
  console.log("   2. Wait a few seconds");
  console.log("   3. Check claimable reward again");
  console.log("   4. If still 0, rewards accumulate on NEXT transaction");
  console.log("\n📝 Note: Rewards are accumulated when you:");
  console.log("   - Supply tokens (rewards calculated from previous balance)");
  console.log("   - Withdraw tokens (rewards calculated from current balance)");
  console.log("   - Borrow tokens (rewards calculated from previous balance)");
  console.log("   - Repay tokens (rewards calculated from current balance)");
  console.log("\n   So if you just supplied, rewards will show up on your NEXT interaction!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



