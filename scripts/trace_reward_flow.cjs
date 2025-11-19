const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Trace complete reward flow step by step
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

  console.log("🔍 TRACING COMPLETE REWARD FLOW");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Step 1: Check if LendingPool has _updateSupplyReward in code
  console.log("STEP 1: Check LendingPool code");
  console.log("-".repeat(70));
  const poolCode = await ethers.provider.getCode(LendingPoolAddress);
  console.log("LendingPool code length:", poolCode.length, "bytes");
  
  // Check if code contains updateSupplyBalance selector (0x08b091fd)
  const hasUpdateSupplyReward = poolCode.includes("08b091fd");
  console.log("Contains updateSupplyBalance selector:", hasUpdateSupplyReward);
  console.log("  (This indicates _updateSupplyReward calls updateSupplyBalance)");
  console.log();

  // Step 2: Check configuration
  console.log("STEP 2: Check configuration");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("  Expected:", RewardAccumulatorAddress);
  console.log("  Match:", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("  Expected:", LendingPoolAddress);
  console.log("  Match:", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log();

  // Step 3: Test the actual call mechanism
  console.log("STEP 3: Test call mechanism");
  console.log("-".repeat(70));
  
  // Simulate what _updateSupplyReward does
  const iface = new ethers.Interface([
    "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
  ]);
  
  // Test with a sample call
  const testUser = userAddress;
  const testAsset = DAIAddress;
  const testBalance = ethers.parseEther("1000");
  
  const callData = iface.encodeFunctionData("updateSupplyBalance", [
    testUser,
    testAsset,
    testBalance
  ]);
  
  console.log("Call data for updateSupplyBalance:");
  console.log("  Function selector: 0x08b091fd");
  console.log("  User:", testUser);
  console.log("  Asset:", testAsset);
  console.log("  Balance:", ethers.formatEther(testBalance), "DAI");
  console.log("  Full call data:", callData);
  console.log();

  // Step 4: Check if RewardAccumulator can call RewardDistributor
  console.log("STEP 4: Check RewardAccumulator → RewardDistributor");
  console.log("-".repeat(70));
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  const distributorOwner = await rewardDistributor.owner();
  
  console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log("RewardDistributor.owner:", distributorOwner);
  console.log();
  
  // Check authorization
  const canAccumulate = (
    distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase() ||
    distributorOwner.toLowerCase() === RewardAccumulatorAddress.toLowerCase()
  );
  console.log("Can RewardAccumulator call accumulateReward?", canAccumulate);
  console.log();

  // Step 5: Check current state
  console.log("STEP 5: Check current state");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const claimableReward = await rewardDistributor.getClaimableReward(userAddress);
  
  console.log("User supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
  console.log();

  // Step 6: Analyze the flow
  console.log("STEP 6: Flow analysis");
  console.log("-".repeat(70));
  console.log("When user supplies:");
  console.log("  1. User calls LendingPool.lend(asset, amount)");
  console.log("  2. LendingPool.lend() calculates new balance: sNew");
  console.log("  3. LendingPool calls _updateSupplyReward(user, asset, sNew)");
  console.log("  4. _updateSupplyReward() does:");
  console.log("     rewardAccumulator.call(abi.encodeWithSignature(...))");
  console.log("  5. RewardAccumulator.updateSupplyBalance() is called");
  console.log("  6. If lastTime > 0 && lastSupply > 0:");
  console.log("     - Calculate reward = lastSupply × rate × timeElapsed");
  console.log("     - Call rewardDistributor.accumulateReward(user, reward)");
  console.log("  7. Update state: lastUpdateTime = now, lastSupplyBalance = sNew");
  console.log();

  // Step 7: Check for potential issues
  console.log("STEP 7: Potential issues");
  console.log("-".repeat(70));
  
  const issues = [];
  
  if (!hasUpdateSupplyReward) {
    issues.push("❌ LendingPool code doesn't contain updateSupplyBalance selector");
    issues.push("   → _updateSupplyReward might not be calling updateSupplyBalance");
  }
  
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    issues.push("❌ LendingPool.rewardAccumulator mismatch");
  }
  
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    issues.push("❌ RewardAccumulator.lendingPool mismatch");
  }
  
  if (!canAccumulate) {
    issues.push("❌ RewardAccumulator cannot call RewardDistributor.accumulateReward()");
  }
  
  if (lastUpdateTime === 0n && supplyPrincipal > 0n) {
    issues.push("⚠️  User has supply but state not initialized");
    issues.push("   → Need to supply again to initialize");
  }
  
  if (lastUpdateTime > 0n && lastSupplyBalance !== supplyPrincipal) {
    issues.push("⚠️  State mismatch: lastSupplyBalance != current supply");
    issues.push("   → Need to supply/withdraw to update");
  }
  
  if (issues.length === 0) {
    console.log("✅ No obvious issues found");
    console.log();
    console.log("💡 If reward is still 0:");
    console.log("   1. Check transaction receipt for RewardsAccumulated event");
    console.log("   2. Check transaction receipt for RewardUpdateFailed event");
    console.log("   3. Verify _updateSupplyReward is actually being called");
    console.log("   4. Check if call is failing silently");
  } else {
    console.log("Issues found:");
    issues.forEach(issue => console.log("  " + issue));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });









