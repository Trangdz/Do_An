const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test reward system after LendingPool redeployment
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

  console.log("🧪 TESTING REWARD SYSTEM AFTER REDEPLOY");
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
    "function transfer(address, uint256) returns (bool)",
    "function decimals() view returns (uint8)"
  ];
  const dai = new ethers.Contract(DAIAddress, ERC20_ABI, deployer);

  // Step 1: Check configuration
  console.log("1️⃣  CONFIGURATION CHECK");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("  Match:", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("  Match:", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log();

  // Step 2: Check if reserve is initialized
  console.log("2️⃣  CHECKING RESERVE INITIALIZATION");
  console.log("-".repeat(70));
  try {
    const reserve = await lendingPool.reserves(DAIAddress);
    const lastUpdate = reserve.lastUpdate;
    console.log("DAI reserve lastUpdate:", lastUpdate.toString());
    if (lastUpdate === 0n) {
      console.log("  ❌ Reserve not initialized!");
      console.log("  💡 Need to initialize reserve first");
    } else {
      console.log("  ✅ Reserve initialized");
    }
  } catch (error) {
    console.log("  ❌ Error checking reserve:", error.message);
  }
  console.log();

  // Step 3: Check user state
  console.log("3️⃣  USER STATE");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const claimableReward = await rewardDistributor.getClaimableReward(userAddress);
  
  console.log("User:", userAddress);
  console.log("Supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
  console.log();

  // Step 4: Test supply transaction
  if (supplyPrincipal === 0n) {
    console.log("4️⃣  USER HAS NO SUPPLY");
    console.log("-".repeat(70));
    console.log("  User needs to supply tokens first");
    console.log("  After supply, reward will be initialized");
    console.log("  Then on next supply/withdraw, reward will be calculated");
  } else {
    console.log("4️⃣  TESTING SUPPLY TRANSACTION");
    console.log("-".repeat(70));
    
    // Check user DAI balance
    const userDaiBalance = await dai.balanceOf(userAddress);
    console.log("User DAI balance:", ethers.formatEther(userDaiBalance), "DAI");
    
    if (userDaiBalance < ethers.parseEther("0.0001")) {
      console.log("  ⚠️  User doesn't have enough DAI");
      console.log("  💡 Transferring 1 DAI to user...");
      const deployerDaiBalance = await dai.balanceOf(deployer.address);
      if (deployerDaiBalance > ethers.parseEther("1")) {
        const transferTx = await dai.transfer(userAddress, ethers.parseEther("1"));
        await transferTx.wait();
        console.log("  ✅ Transferred 1 DAI");
      }
    }
    
    // Check allowance
    const allowance = await dai.allowance(userAddress, LendingPoolAddress);
    console.log("Allowance:", ethers.formatEther(allowance), "DAI");
    
    if (allowance < ethers.parseEther("1")) {
      console.log("  ⚠️  Need approval");
      console.log("  💡 User needs to approve in MetaMask");
    }
    
    console.log();
    console.log("  💡 To test:");
    console.log("     1. User supplies 0.0001 DAI (or any amount)");
    console.log("     2. Check transaction receipt for RewardsAccumulated event");
    console.log("     3. Check claimable reward after transaction");
  }
  console.log();

  // Step 5: Summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  
  const issues = [];
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    issues.push("❌ LendingPool.rewardAccumulator mismatch");
  }
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    issues.push("❌ RewardAccumulator.lendingPool mismatch");
  }
  
  if (issues.length === 0) {
    console.log("✅ All configurations are correct");
    console.log();
    console.log("💡 Next steps:");
    console.log("   1. Make sure reserves are initialized");
    console.log("   2. User supplies tokens");
    console.log("   3. Wait a few seconds");
    console.log("   4. User supplies/withdraws again");
    console.log("   5. Check claimable reward");
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


