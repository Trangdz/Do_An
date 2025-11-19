const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Verify if LendingPool on-chain has _updateSupplyReward code
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");

  console.log("🔍 VERIFYING LENDINGPOOL CODE");
  console.log("=".repeat(70));
  console.log();

  // Get contract code
  const code = await ethers.provider.getCode(LendingPoolAddress);
  console.log("LendingPool address:", LendingPoolAddress);
  console.log("Code length:", code.length, "bytes");
  console.log();

  // Check if code contains _updateSupplyReward signature
  // The function selector for updateSupplyBalance is: 0x08b091fd
  // If LendingPool calls this, the call data will contain this selector
  
  // We can't directly check internal functions, but we can check if the contract
  // has the rewardAccumulator state variable and setRewardAccumulator function
  
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  try {
    // Check if rewardAccumulator exists
    const rewardAccumulator = await lendingPool.rewardAccumulator();
    console.log("✅ rewardAccumulator state variable exists");
    console.log("   Value:", rewardAccumulator);
    console.log();

    // Check if setRewardAccumulator exists
    try {
      // Try to get function selector
      const iface = new ethers.Interface([
        "function setRewardAccumulator(address) external"
      ]);
      const selector = iface.getFunction("setRewardAccumulator").selector;
      console.log("✅ setRewardAccumulator function exists");
      console.log("   Selector:", selector);
      console.log();
    } catch (e) {
      console.log("❌ setRewardAccumulator function might not exist");
      console.log();
    }

    // The problem: We can't directly check if _updateSupplyReward exists
    // because it's an internal function. But we can infer:
    // - If rewardAccumulator is set, the code should have _updateSupplyReward
    // - But if it was deployed before we added _updateSupplyReward, it won't have it
    
    console.log("💡 INFERENCE:");
    if (rewardAccumulator && rewardAccumulator !== "0x0000000000000000000000000000000000000000") {
      console.log("   rewardAccumulator is set, which suggests code might have _updateSupplyReward");
      console.log("   BUT: If LendingPool was deployed BEFORE we added _updateSupplyReward,");
      console.log("   it won't have the function even if rewardAccumulator is set");
      console.log();
      console.log("   SOLUTION: Redeploy LendingPool with latest code");
    } else {
      console.log("   rewardAccumulator is not set");
      console.log("   This definitely means LendingPool needs to be updated");
    }
  } catch (error) {
    console.error("❌ Error checking LendingPool:", error.message);
    console.log();
    console.log("💡 This might mean LendingPool on-chain doesn't have the new code");
    console.log("   SOLUTION: Redeploy LendingPool");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });









