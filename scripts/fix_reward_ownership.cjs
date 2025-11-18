const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fix RewardDistributor ownership and configure new RewardAccumulator
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

  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("📋 Current addresses:");
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log();

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check current owner
  const currentOwner = await rewardDistributor.owner();
  console.log("Current RewardDistributor owner:", currentOwner);
  console.log("Deployer address:", deployer.address);
  console.log();

  // If owner is old RewardAccumulator, try to transfer from there
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("⚠️  Owner is not deployer. Trying to transfer ownership from old owner...");
    
    // Try to get old RewardAccumulator contract
    try {
      const oldAccumulatorCode = await ethers.provider.getCode(currentOwner);
      if (oldAccumulatorCode !== "0x") {
        console.log("   Old owner is a contract. Checking if it has transferOwnership...");
        // Try to call transferOwnership from old contract (if it's the old RewardAccumulator)
        // But we can't do this easily, so we'll need deployer to be owner
        console.log("   ⚠️  Cannot automatically transfer. Need manual intervention.");
        console.log("   💡 Options:");
        console.log("      1. If old RewardAccumulator has transferOwnership, call it manually");
        console.log("      2. Or redeploy RewardDistributor");
        return;
      }
    } catch (e) {
      console.error("   Error checking old owner:", e.message);
    }
  }

  // If deployer is owner, configure
  if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("✅ Deployer is owner. Configuring...");
    
    // Set RewardAccumulator
    try {
      const currentAccumulator = await rewardDistributor.rewardAccumulator();
      if (currentAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
        console.log("   Setting RewardAccumulator...");
        const setTx = await rewardDistributor.setRewardAccumulator(RewardAccumulatorAddress);
        await setTx.wait();
        console.log("   ✅ RewardAccumulator set");
      } else {
        console.log("   ✅ RewardAccumulator already set");
      }
    } catch (error) {
      console.error("   ❌ Error:", error.message);
    }
  } else {
    console.log("❌ Cannot configure: deployer is not owner");
    console.log("   Current owner:", currentOwner);
    console.log("   Deployer:", deployer.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






