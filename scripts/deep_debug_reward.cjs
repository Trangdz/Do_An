const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Deep debug reward accumulation - trace every step
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

  console.log("🔍 DEEP DEBUG - Reward Accumulation");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Step 1: Check configuration
  console.log("1️⃣  CONFIGURATION CHECK");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("  ✓ Match:", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("  ✓ Match:", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log();
  console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("  ✓ Match:", accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase());
  console.log();
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log("  ✓ Match:", distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  // Step 2: Check user state
  console.log("2️⃣  USER STATE CHECK");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  console.log("User:", userAddress);
  console.log("Asset: DAI", DAIAddress);
  console.log("Supply principal:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log();

  // Step 3: Check RewardAccumulator state
  console.log("3️⃣  REWARD ACCUMULATOR STATE");
  console.log("-".repeat(70));
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  
  console.log("lastUpdateTime:", lastUpdateTime.toString());
  console.log("  Is zero (not initialized):", lastUpdateTime === 0n);
  console.log("lastSupplyBalance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("currentTime:", currentTime.toString());
  if (lastUpdateTime > 0n) {
    const timeElapsed = currentTime - lastUpdateTime;
    console.log("timeElapsed:", timeElapsed.toString(), "seconds");
    console.log("timeElapsed (hours):", Number(timeElapsed) / 3600);
  }
  console.log();

  // Step 4: Check reward rates
  console.log("4️⃣  REWARD RATES");
  console.log("-".repeat(70));
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
  console.log("supplyRewardRatePerTokenPerSecond:", ethers.formatEther(supplyRate), "LENDX");
  console.log("borrowRewardRatePerTokenPerSecond:", ethers.formatEther(borrowRate), "LENDX");
  console.log();

  // Step 5: Calculate expected reward
  console.log("5️⃣  EXPECTED REWARD CALCULATION");
  console.log("-".repeat(70));
  if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
    const timeElapsed = currentTime - lastUpdateTime;
    const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    console.log("Formula: (lastSupplyBalance × supplyRate × timeElapsed) / 1e18");
    console.log(`Calculation: (${ethers.formatEther(lastSupplyBalance)} × ${ethers.formatEther(supplyRate)} × ${timeElapsed}) / 1e18`);
    console.log("Expected reward:", ethers.formatEther(expectedReward), "LENDX");
  } else {
    console.log("⚠️  Cannot calculate - state not initialized");
    console.log("   User needs to supply/withdraw to initialize");
  }
  console.log();

  // Step 6: Check claimable reward
  console.log("6️⃣  CLAIMABLE REWARD");
  console.log("-".repeat(70));
  const claimableReward = await rewardDistributor.getClaimableReward(userAddress);
  console.log("Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
  console.log();

  // Step 7: Test direct call simulation
  console.log("7️⃣  TESTING DIRECT CALL (Simulation)");
  console.log("-".repeat(70));
  try {
    // Try to call updateSupplyBalance directly (should fail)
    console.log("Attempting direct call (should fail with 'only LendingPool')...");
    await rewardAccumulator.updateSupplyBalance(userAddress, DAIAddress, supplyPrincipal);
    console.log("❌ Should have failed!");
  } catch (error) {
    if (error.message.includes("only LendingPool")) {
      console.log("✅ Correctly protected");
    } else {
      console.error("❌ Unexpected error:", error.message);
    }
  }
  console.log();

  // Step 8: Check if LendingPool can call
  console.log("8️⃣  TESTING LENDINGPOOL CALL");
  console.log("-".repeat(70));
  
  // We can't easily test this without making an actual supply transaction
  // But we can check the function signature
  const iface = new ethers.Interface([
    "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
  ]);
  const data = iface.encodeFunctionData("updateSupplyBalance", [userAddress, DAIAddress, supplyPrincipal]);
  console.log("Function data length:", data.length);
  console.log("Function data:", data);
  console.log();

  // Step 9: Check RewardDistributor balance
  console.log("9️⃣  REWARD DISTRIBUTOR BALANCE");
  console.log("-".repeat(70));
  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = LENDXToken.attach(await rewardDistributor.lendxToken());
  const distributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("RewardDistributor LENDX balance:", ethers.formatEther(distributorBalance), "LENDX");
  console.log();

  // Step 10: Summary and recommendations
  console.log("🔟 SUMMARY & RECOMMENDATIONS");
  console.log("=".repeat(70));
  
  const issues = [];
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    issues.push("❌ LendingPool.rewardAccumulator mismatch");
  }
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    issues.push("❌ RewardAccumulator.lendingPool mismatch");
  }
  if (distributorAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    issues.push("❌ RewardDistributor.rewardAccumulator mismatch");
  }
  if (lastUpdateTime === 0n) {
    issues.push("⚠️  RewardAccumulator state not initialized (user needs to supply/withdraw)");
  }
  if (supplyPrincipal === 0n) {
    issues.push("⚠️  User has no supply");
  }
  if (distributorBalance === 0n) {
    issues.push("❌ RewardDistributor has no LENDX tokens");
  }

  if (issues.length === 0) {
    console.log("✅ All checks passed!");
    console.log();
    console.log("If reward is still 0, possible reasons:");
    console.log("1. Time elapsed is too short (reward rate is 0.001 LENDX/second per token)");
    console.log("2. User needs to make another supply/withdraw to trigger calculation");
    console.log("3. Silent failure in _updateSupplyReward (check transaction logs)");
  } else {
    console.log("Issues found:");
    issues.forEach(issue => console.log("  " + issue));
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

