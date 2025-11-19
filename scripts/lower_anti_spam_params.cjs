const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Lower anti-spam parameters to allow rewards to accumulate faster for testing
 */
async function main() {
  console.log("=== Lower Anti-Spam Parameters ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);
  
  // Get current values
  const currentMinTime = await rewardAccumulator.minimumTimeElapsed();
  const currentMinAmount = await rewardAccumulator.minimumRewardAmount();
  
  console.log("Current values:");
  console.log("   minimumTimeElapsed:", currentMinTime.toString(), "seconds");
  console.log("   minimumRewardAmount:", ethers.formatEther(currentMinAmount), "LENDX");
  console.log("");
  
  // Set lower values for testing
  // 5 seconds minimum time (instead of 60)
  // 0.001 LENDX minimum amount (instead of 0.01)
  const newMinTime = 5; // 5 seconds
  const newMinAmount = ethers.parseUnits("0.001", 18); // 0.001 LENDX
  
  console.log("Setting new values:");
  console.log("   minimumTimeElapsed:", newMinTime, "seconds");
  console.log("   minimumRewardAmount:", ethers.formatEther(newMinAmount), "LENDX");
  console.log("");
  
  try {
    const tx = await rewardAccumulator.connect(deployer).setAntiSpamParams(newMinTime, newMinAmount);
    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("✅ Anti-spam parameters updated!");
    console.log("");
    console.log("💡 Now rewards will accumulate faster:");
    console.log("   - Minimum time between calculations: 5 seconds (was 60)");
    console.log("   - Minimum reward to accumulate: 0.001 LENDX (was 0.01)");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("onlyOwner")) {
      console.log("💡 Need to call from owner address");
    }
  }
}

main().catch(console.error);




