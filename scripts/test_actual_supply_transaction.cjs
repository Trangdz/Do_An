const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test actual supply transaction and check if reward is accumulated
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

  console.log("🔍 TESTING ACTUAL SUPPLY TRANSACTION");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // DAI ABI
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function transfer(address, uint256) returns (bool)"
  ];
  const dai = new ethers.Contract(DAIAddress, ERC20_ABI, deployer);

  // Step 1: Check initial state
  console.log("1️⃣  INITIAL STATE");
  console.log("-".repeat(70));
  const initialClaimable = await rewardDistributor.getClaimableReward(userAddress);
  const lastUpdateTimeBefore = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalanceBefore = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const userReserveBefore = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyBefore = userReserveBefore.supply.principal;
  
  console.log("User:", userAddress);
  console.log("Supply before:", ethers.formatEther(supplyBefore), "DAI");
  console.log("Last update time:", lastUpdateTimeBefore.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalanceBefore), "DAI");
  console.log("Initial claimable reward:", ethers.formatEther(initialClaimable), "LENDX");
  console.log();

  // Step 2: Calculate expected reward
  if (lastUpdateTimeBefore > 0n && lastSupplyBalanceBefore > 0n) {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTimeBefore;
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    const expectedReward = (lastSupplyBalanceBefore * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    
    console.log("2️⃣  EXPECTED REWARD");
    console.log("-".repeat(70));
    console.log("Time elapsed:", timeElapsed.toString(), "seconds");
    console.log("Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
    console.log("Expected reward:", ethers.formatEther(expectedReward), "LENDX");
    console.log();
  }

  // Step 3: Test direct call to updateSupplyBalance (simulating what LendingPool does)
  console.log("3️⃣  TESTING DIRECT CALL (Simulating LendingPool)");
  console.log("-".repeat(70));
  
  // We can't call directly because it requires LendingPool as msg.sender
  // But we can check if the call would work by testing the mechanism
  
  // Check if we can make a call from LendingPool's perspective
  // Since we can't impersonate easily on Ganache, let's check the actual mechanism
  
  console.log("💡 Testing mechanism:");
  console.log("   LendingPool._updateSupplyReward() uses:");
  console.log("   rewardAccumulator.call(abi.encodeWithSignature(...))");
  console.log();
  console.log("   This means msg.sender will be LendingPool");
  console.log("   RewardAccumulator checks: require(msg.sender == lendingPool)");
  console.log();
  
  // Check if the call data is correct
  const iface = new ethers.Interface([
    "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
  ]);
  const callData = iface.encodeFunctionData("updateSupplyBalance", [
    userAddress,
    DAIAddress,
    supplyBefore
  ]);
  
  console.log("   Call data:", callData);
  console.log("   Call data length:", callData.length);
  console.log();

  // Step 4: Check if RewardAccumulator can call RewardDistributor
  console.log("4️⃣  CHECKING REWARD ACCUMULATOR → REWARD DISTRIBUTOR CALL");
  console.log("-".repeat(70));
  
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log("Match:", accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase() &&
                     distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  // Step 5: Test if RewardAccumulator can accumulate reward
  console.log("5️⃣  TESTING REWARD ACCUMULATION");
  console.log("-".repeat(70));
  
  // Check RewardDistributor owner
  const distributorOwner = await rewardDistributor.owner();
  console.log("RewardDistributor.owner:", distributorOwner);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log();
  
  // Check if RewardAccumulator can call accumulateReward
  // It should be able to if distributorAccumulator is set correctly
  if (distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()) {
    console.log("✅ RewardAccumulator is authorized to call accumulateReward");
  } else {
    console.log("❌ RewardAccumulator is NOT authorized!");
    console.log("   This is the problem!");
  }
  console.log();

  // Step 6: Manual test - try to call updateSupplyBalance with correct parameters
  console.log("6️⃣  MANUAL TEST");
  console.log("-".repeat(70));
  console.log("Since we can't easily impersonate LendingPool on Ganache,");
  console.log("let's check if the logic would work:");
  console.log();
  
  // Check the actual implementation
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("LendingPool address:", LendingPoolAddress);
  console.log("Match:", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log();

  // Final summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  
  const issues = [];
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    issues.push("❌ RewardAccumulator.lendingPool mismatch");
  }
  if (distributorAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    issues.push("❌ RewardDistributor.rewardAccumulator mismatch");
  }
  if (accumulatorDistributor.toLowerCase() !== RewardDistributorAddress.toLowerCase()) {
    issues.push("❌ RewardAccumulator.rewardDistributor mismatch");
  }
  
  if (issues.length === 0) {
    console.log("✅ All configurations are correct");
    console.log();
    console.log("💡 If reward is still 0 after supply/withdraw:");
    console.log("   1. Check transaction receipt for RewardsAccumulated event");
    console.log("   2. Check transaction receipt for RewardUpdateFailed event");
    console.log("   3. Verify that _updateSupplyReward is actually being called");
    console.log("   4. Check browser console for errors");
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


