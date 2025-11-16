const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fix RewardDistributor.rewardAccumulator to point to new RewardAccumulator
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log();

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("📋 Addresses:");
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   RewardAccumulator (new):", RewardAccumulatorAddress);
  console.log();

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check current state
  const currentOwner = await rewardDistributor.owner();
  const currentAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("Current state:");
  console.log("   Owner:", currentOwner);
  console.log("   rewardAccumulator:", currentAccumulator);
  console.log("   Expected:", RewardAccumulatorAddress);
  console.log("   Match:", currentAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  // Fix: Set new RewardAccumulator
  if (currentAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("🔧 Fixing RewardDistributor.rewardAccumulator...");
    
    // Check if deployer is owner
    if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
      try {
        console.log("   Setting rewardAccumulator to:", RewardAccumulatorAddress);
        const setTx = await rewardDistributor.setRewardAccumulator(RewardAccumulatorAddress);
        await setTx.wait();
        console.log("   ✅ Successfully updated!");
        
        // Verify
        const newAccumulator = await rewardDistributor.rewardAccumulator();
        console.log("   Verified new rewardAccumulator:", newAccumulator);
        if (newAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()) {
          console.log("   ✅ Verification passed!");
        }
      } catch (error) {
        console.error("   ❌ Error:", error.message);
        if (error.message.includes("unauthorized")) {
          console.log("   💡 Deployer is not owner. Owner is:", currentOwner);
          console.log("   💡 Need to call from owner or use old accumulator to update");
        }
      }
    } else {
      console.log("⚠️  Deployer is not owner");
      console.log("   Current owner:", currentOwner);
      console.log("   Deployer:", deployer.address);
      console.log();
      console.log("💡 Solutions:");
      console.log("   1. Transfer ownership to deployer first");
      console.log("   2. Or call setRewardAccumulator from current owner");
      console.log("   3. Or use old RewardAccumulator to call setRewardAccumulator (if it has that function)");
      
      // Try to use old accumulator to update
      if (currentAccumulator && currentAccumulator !== "0x0000000000000000000000000000000000000000") {
        console.log();
        console.log("   Attempting to use old accumulator to update...");
        try {
          // Impersonate old accumulator (if on local network)
          if (hre.network.name === "ganache" || hre.network.name === "localhost") {
            await hre.network.provider.request({
              method: "hardhat_impersonateAccount",
              params: [currentAccumulator],
            });
            
            const impersonatedSigner = await ethers.getSigner(currentAccumulator);
            await deployer.sendTransaction({
              to: currentAccumulator,
              value: ethers.parseEther("1.0"),
            });
            
            const rewardDistributorWithImpersonated = rewardDistributor.connect(impersonatedSigner);
            const setTx = await rewardDistributorWithImpersonated.setRewardAccumulator(RewardAccumulatorAddress);
            await setTx.wait();
            console.log("   ✅ Successfully updated using old accumulator!");
            
            // Verify
            const newAccumulator = await rewardDistributor.rewardAccumulator();
            console.log("   Verified new rewardAccumulator:", newAccumulator);
          } else {
            console.log("   ⚠️  Not on local network, cannot impersonate");
          }
        } catch (error) {
          console.error("   ❌ Error:", error.message);
        }
      }
    }
  } else {
    console.log("✅ RewardDistributor.rewardAccumulator is already correct!");
  }

  console.log();
  console.log("🎁 After fixing, users need to:");
  console.log("   1. Supply/withdraw again to initialize RewardAccumulator state");
  console.log("   2. Then rewards will accumulate on next supply/withdraw");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


