const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check if _updateSupplyReward is being called correctly
 * This will analyze the actual call mechanism
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
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const DAIAddress = getAddress("DAIAddress");
  const userAddress = getAddress("User1Address");

  console.log("🔍 CHECKING REWARD CALL MECHANISM");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check configuration
  console.log("1️⃣  CONFIGURATION");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("Expected:", RewardAccumulatorAddress);
  console.log("Match:", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  // Check user state
  console.log("2️⃣  USER STATE");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  
  console.log("User supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log();

  // Test the actual call that LendingPool makes
  console.log("3️⃣  TESTING ACTUAL CALL");
  console.log("-".repeat(70));
  
  // Simulate what _updateSupplyReward does
  const iface = new ethers.Interface([
    "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
  ]);
  const data = iface.encodeFunctionData("updateSupplyBalance", [userAddress, DAIAddress, supplyPrincipal]);
  
  console.log("Call data:", data);
  console.log("Call data length:", data.length);
  console.log();

  // Try to call directly from LendingPool (using static call to simulate)
  console.log("4️⃣  SIMULATING CALL FROM LENDINGPOOL");
  console.log("-".repeat(70));
  
  try {
    // We can't easily test the internal function, but we can check if the call would work
    // by trying to call updateSupplyBalance directly (should fail with "only LendingPool")
    console.log("Testing direct call (should fail)...");
    await rewardAccumulator.updateSupplyBalance(userAddress, DAIAddress, supplyPrincipal);
    console.log("❌ Should have failed!");
  } catch (error) {
    if (error.message.includes("only LendingPool")) {
      console.log("✅ Correctly protected - only LendingPool can call");
      console.log("   This means the function exists and is callable");
    } else {
      console.error("❌ Unexpected error:", error.message);
    }
  }
  console.log();

  // Check if we can estimate gas (this tests if the call would succeed from LendingPool)
  console.log("5️⃣  ESTIMATING GAS (from LendingPool perspective)");
  console.log("-".repeat(70));
  
  try {
    // Create a contract instance that can call updateSupplyBalance
    // We'll use the LendingPool's address as the caller
    const accumulatorWithPool = rewardAccumulator.connect(
      await ethers.getImpersonatedSigner(LendingPoolAddress)
    );
    
    // But wait, we can't impersonate on Ganache easily
    // Instead, let's check the actual mechanism
    
    console.log("💡 Analysis:");
    console.log("   _updateSupplyReward uses low-level call:");
    console.log("   rewardAccumulator.call(abi.encodeWithSignature(...))");
    console.log();
    console.log("   This means:");
    console.log("   1. LendingPool calls RewardAccumulator");
    console.log("   2. msg.sender will be LendingPool");
    console.log("   3. RewardAccumulator checks: require(msg.sender == lendingPool)");
    console.log();
    console.log("   ✅ This should work if LendingPool.rewardAccumulator is set correctly");
    console.log();
    
    // Check if silent failure might be happening
    console.log("6️⃣  CHECKING FOR SILENT FAILURES");
    console.log("-".repeat(70));
    console.log("   _updateSupplyReward catches errors and silently fails");
    console.log("   This means if there's an error, it won't revert the transaction");
    console.log("   but reward won't be accumulated");
    console.log();
    console.log("   Possible reasons for silent failure:");
    console.log("   1. RewardAccumulator address mismatch");
    console.log("   2. Function signature mismatch");
    console.log("   3. Gas limit too low");
    console.log("   4. RewardAccumulator.rewardDistributor not set correctly");
    console.log();
    
    // Check RewardAccumulator.rewardDistributor
    const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
    console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
    console.log("Expected:", RewardDistributorAddress);
    console.log("Match:", accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase());
    console.log();
    
    // Check RewardDistributor.rewardAccumulator
    const distributorAccumulator = await rewardDistributor.rewardAccumulator();
    console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
    console.log("Expected:", RewardAccumulatorAddress);
    console.log("Match:", distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
    console.log();
    
    if (
      poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase() &&
      accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase() &&
      distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()
    ) {
      console.log("✅ All configurations are correct!");
      console.log();
      console.log("💡 Next steps:");
      console.log("   1. User needs to supply/withdraw to trigger reward calculation");
      console.log("   2. Check browser console for any errors");
      console.log("   3. Check transaction receipt for RewardsAccumulated events");
    } else {
      console.log("❌ Configuration mismatch detected!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






