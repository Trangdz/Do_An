const hre = require("hardhat");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test direct call to updateSupplyBalance to see if it works
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
  const userAddress = "0x767548d92f8B8138742675bA45609E5AD26568e8";

  console.log("🧪 TESTING DIRECT CALL");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check current state
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const claimableBefore = await rewardDistributor.getClaimableReward(userAddress);

  console.log("Before:");
  console.log("  Supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log("  Last update time:", lastUpdateTime.toString());
  console.log("  Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("  Claimable reward:", ethers.formatEther(claimableBefore), "LENDX");
  console.log();

  // Simulate what _updateSupplyReward does
  console.log("Simulating _updateSupplyReward call...");
  const iface = new ethers.Interface([
    "function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external"
  ]);
  const callData = iface.encodeFunctionData("updateSupplyBalance", [
    userAddress,
    DAIAddress,
    supplyPrincipal
  ]);

  // Try to call from LendingPool's perspective
  // We can't easily impersonate, but we can check if the call would work
  console.log("Call data:", callData);
  console.log();

  // Check if we can estimate gas
  try {
    const gasEstimate = await rewardAccumulator.updateSupplyBalance.estimateGas(
      userAddress,
      DAIAddress,
      supplyPrincipal
    );
    console.log("Gas estimate:", gasEstimate.toString());
    console.log("  (This is from deployer, not LendingPool - will fail auth check)");
  } catch (error) {
    console.log("Gas estimate failed (expected - deployer is not LendingPool):", error.message);
  }
  console.log();

  // Check what happens if we call with low-level call from LendingPool
  // We can't do this directly, but we can check the mechanism
  console.log("💡 Analysis:");
  console.log("   When LendingPool calls _updateSupplyReward:");
  console.log("   1. It makes: rewardAccumulator.call{gas: 200000}(callData)");
  console.log("   2. msg.sender in updateSupplyBalance = LendingPool ✅");
  console.log("   3. If lastTime > 0 && lastSupply > 0:");
  console.log("      - Calculate reward");
  console.log("      - Call rewardDistributor.accumulateReward()");
  console.log("   4. Update state");
  console.log();

  // Check if there's a way to test this
  console.log("🔧 To test if it works:");
  console.log("   1. User supplies a small amount (0.0001 DAI)");
  console.log("   2. Check transaction receipt for RewardsAccumulated event");
  console.log("   3. If no event, check for RewardUpdateFailed event");
  console.log("   4. If no events, _updateSupplyReward might not be called");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



