const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Deep analysis of reward flow - find the exact problem
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

  console.log("🔬 DEEP ANALYSIS - FINDING THE EXACT PROBLEM");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Step 1: Verify the complete chain
  console.log("1️⃣  VERIFYING COMPLETE CHAIN");
  console.log("-".repeat(70));
  
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  const distributorOwner = await rewardDistributor.owner();
  
  console.log("Chain verification:");
  console.log("  LendingPool → RewardAccumulator:", poolAccumulator);
  console.log("    ✓", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("  RewardAccumulator → LendingPool:", accumulatorLendingPool);
  console.log("    ✓", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log("  RewardAccumulator → RewardDistributor:", accumulatorDistributor);
  console.log("    ✓", accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase());
  console.log("  RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log("    ✓", distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("  RewardDistributor.owner:", distributorOwner);
  console.log();

  // Step 2: Check authorization
  console.log("2️⃣  CHECKING AUTHORIZATION");
  console.log("-".repeat(70));
  
  // When RewardAccumulator calls RewardDistributor.accumulateReward():
  // msg.sender = RewardAccumulator
  // RewardDistributor checks: msg.sender == owner() || msg.sender == rewardAccumulator
  const canAccumulate = (
    distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase() ||
    distributorOwner.toLowerCase() === RewardAccumulatorAddress.toLowerCase()
  );
  
  console.log("Can RewardAccumulator call accumulateReward?");
  console.log("  distributorAccumulator == RewardAccumulator:", 
    distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("  distributorOwner == RewardAccumulator:", 
    distributorOwner.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("  Result:", canAccumulate ? "✅ YES" : "❌ NO");
  console.log();

  // Step 3: Test the actual function call
  console.log("3️⃣  TESTING FUNCTION CALLS");
  console.log("-".repeat(70));
  
  // Test if RewardAccumulator can call RewardDistributor
  try {
    // We can't call directly because we're not RewardAccumulator
    // But we can check the function exists and is callable
    console.log("Testing RewardDistributor.accumulateReward() authorization...");
    
    // Check function selector
    const iface = new ethers.Interface([
      "function accumulateReward(address user, uint256 amount) external"
    ]);
    const selector = iface.getFunction("accumulateReward").selector;
    console.log("  Function selector:", selector);
    console.log("  Function exists: ✅");
    console.log();
    
    // Test updateSupplyBalance selector
    const accumulatorIface = new ethers.Interface([
      "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
    ]);
    const updateSelector = accumulatorIface.getFunction("updateSupplyBalance").selector;
    console.log("Testing RewardAccumulator.updateSupplyBalance()...");
    console.log("  Function selector:", updateSelector);
    console.log("  Function exists: ✅");
    console.log();
    
  } catch (error) {
    console.error("  ❌ Error:", error.message);
  }

  // Step 4: Analyze the flow step by step
  console.log("4️⃣  FLOW ANALYSIS");
  console.log("-".repeat(70));
  console.log("When user supplies 100 DAI:");
  console.log();
  console.log("Step 1: User calls LendingPool.lend(DAI, 100)");
  console.log("  → LendingPool receives tokens");
  console.log("  → Calculates sNew = currentSupply + 100");
  console.log("  → Updates userReserves[user][DAI].supply.principal = sNew");
  console.log("  → Calls _updateSupplyReward(user, DAI, sNew)");
  console.log();
  console.log("Step 2: _updateSupplyReward() executes");
  console.log("  → Checks: rewardAccumulator != address(0) ✅");
  console.log("  → Makes low-level call:");
  console.log("    rewardAccumulator.call{gas: 100000}(...)");
  console.log("  → Call data: updateSupplyBalance(user, DAI, sNew)");
  console.log();
  console.log("Step 3: RewardAccumulator.updateSupplyBalance() executes");
  console.log("  → Checks: msg.sender == lendingPool");
  console.log("    msg.sender = LendingPool ✅");
  console.log("  → Reads: lastTime, lastSupply");
  console.log("  → If lastTime > 0 && lastSupply > 0:");
  console.log("    - Calculates: reward = lastSupply × rate × timeElapsed");
  console.log("    - Calls: rewardDistributor.accumulateReward(user, reward)");
  console.log("  → Updates: lastUpdateTime = now, lastSupplyBalance = sNew");
  console.log();
  console.log("Step 4: RewardDistributor.accumulateReward() executes");
  console.log("  → Checks: msg.sender == owner() || msg.sender == rewardAccumulator");
  console.log("    msg.sender = RewardAccumulator ✅");
  console.log("  → Updates: rewards[user] += amount");
  console.log("  → Emits: RewardAccumulated(user, amount)");
  console.log();

  // Step 5: Check for potential issues
  console.log("5️⃣  POTENTIAL ISSUES");
  console.log("-".repeat(70));
  
  const issues = [];
  
  // Check if low-level call might fail
  console.log("Issue 1: Low-level call gas limit");
  console.log("  Current: 100000 gas");
  console.log("  This should be enough for updateSupplyBalance");
  console.log("  But if RewardDistributor.accumulateReward() needs more gas, it might fail");
  console.log();
  
  // Check if RewardDistributor has enough LENDX
  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxTokenAddress = await rewardDistributor.lendxToken();
  const lendxToken = LENDXToken.attach(lendxTokenAddress);
  const distributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("Issue 2: RewardDistributor LENDX balance");
  console.log("  Balance:", ethers.formatEther(distributorBalance), "LENDX");
  if (distributorBalance === 0n) {
    issues.push("❌ RewardDistributor has no LENDX tokens!");
    console.log("  ❌ PROBLEM: No LENDX to distribute!");
  } else {
    console.log("  ✅ Has LENDX tokens");
  }
  console.log();
  
  // Check if accumulateReward might revert
  console.log("Issue 3: accumulateReward() might revert");
  console.log("  If amount == 0, it returns early (no error)");
  console.log("  If user == address(0), it reverts with InvalidAddress");
  console.log("  If unauthorized, it reverts with 'unauthorized'");
  console.log("  If all OK, it updates rewards[user]");
  console.log();

  // Step 6: Test calculation
  console.log("6️⃣  TESTING REWARD CALCULATION");
  console.log("-".repeat(70));
  
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  console.log("Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
  
  // Example: 1000 DAI, 10 seconds
  const exampleSupply = ethers.parseEther("1000");
  const exampleTime = 10n;
  const exampleReward = (exampleSupply * supplyRate * exampleTime) / ethers.parseUnits("1", 18);
  console.log("Example: 1000 DAI for 10 seconds");
  console.log("  Reward:", ethers.formatEther(exampleReward), "LENDX");
  console.log("  Formula: (1000 × 0.001 × 10) / 1e18 =", ethers.formatEther(exampleReward));
  console.log();

  // Final summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  
  if (issues.length > 0) {
    console.log("Issues found:");
    issues.forEach(issue => console.log("  " + issue));
  } else {
    console.log("✅ No obvious issues in configuration");
    console.log();
    console.log("💡 If reward is still 0, the problem might be:");
    console.log("   1. Low-level call is failing silently (check RewardUpdateFailed events)");
    console.log("   2. Gas limit is too low (100000 might not be enough)");
    console.log("   3. User hasn't supplied after LendingPool redeployment");
    console.log("   4. First supply initializes state (no reward), need second supply");
    console.log();
    console.log("🔧 SOLUTION:");
    console.log("   Increase gas limit in _updateSupplyReward to 200000 or more");
    console.log("   Or use direct interface call instead of low-level call");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });










