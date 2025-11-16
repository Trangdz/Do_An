const hre = require("hardhat");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test complete reward flow - simulate supply and check reward accumulation
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

  console.log("🧪 TESTING COMPLETE REWARD FLOW");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // DAI ABI (minimal)
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
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const currentSupply = userReserve.supply.principal;
  
  console.log("User:", userAddress);
  console.log("Current supply:", ethers.formatEther(currentSupply), "DAI");
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("Initial claimable reward:", ethers.formatEther(initialClaimable), "LENDX");
  console.log();

  // Step 2: Wait a bit to accumulate time
  console.log("2️⃣  WAITING 5 SECONDS...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log("✅ Waited 5 seconds");
  console.log();

  // Step 3: Make a tiny supply to trigger reward calculation
  console.log("3️⃣  MAKING TINY SUPPLY TO TRIGGER REWARD CALCULATION");
  console.log("-".repeat(70));
  
  try {
    // Check user DAI balance
    const userDaiBalance = await dai.balanceOf(userAddress);
    console.log("User DAI balance:", ethers.formatEther(userDaiBalance), "DAI");
    
    if (userDaiBalance < ethers.parseEther("0.0001")) {
      console.log("⚠️  User doesn't have enough DAI. Transferring some...");
      // Transfer from deployer if deployer has DAI
      const deployerDaiBalance = await dai.balanceOf(deployer.address);
      if (deployerDaiBalance > ethers.parseEther("1")) {
        const transferTx = await dai.transfer(userAddress, ethers.parseEther("1"));
        await transferTx.wait();
        console.log("✅ Transferred 1 DAI to user");
      }
    }
    
    // Approve if needed
    const allowance = await dai.allowance(userAddress, LendingPoolAddress);
    if (allowance < ethers.parseEther("0.0001")) {
      console.log("⚠️  Need approval. Using deployer to approve...");
      // We can't approve for user, so we'll use a different approach
      console.log("💡 User needs to approve in MetaMask first");
    }
    
    // Get user signer (impersonate for testing)
    if (hre.network.name === "ganache" || hre.network.name === "localhost") {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
      });
      
      const userSigner = await ethers.getSigner(userAddress);
      await deployer.sendTransaction({
        to: userAddress,
        value: ethers.parseEther("1.0"),
      });
      
      // Approve
      const daiWithUser = dai.connect(userSigner);
      const approveTx = await daiWithUser.approve(LendingPoolAddress, ethers.parseEther("1000"));
      await approveTx.wait();
      console.log("✅ Approved");
      
      // Make tiny supply
      const lendingPoolWithUser = lendingPool.connect(userSigner);
      const tinyAmount = ethers.parseEther("0.0001");
      console.log("Supplying 0.0001 DAI...");
      const supplyTx = await lendingPoolWithUser.lend(DAIAddress, tinyAmount);
      const receipt = await supplyTx.wait();
      console.log("✅ Supply transaction successful!");
      console.log("   Transaction hash:", supplyTx.hash);
      console.log();
      
      // Step 4: Check reward after supply
      console.log("4️⃣  CHECKING REWARD AFTER SUPPLY");
      console.log("-".repeat(70));
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for state update
      
      const newClaimable = await rewardDistributor.getClaimableReward(userAddress);
      const newLastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
      const newLastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
      
      console.log("New claimable reward:", ethers.formatEther(newClaimable), "LENDX");
      console.log("New last update time:", newLastUpdateTime.toString());
      console.log("New last supply balance:", ethers.formatEther(newLastSupplyBalance), "DAI");
      console.log();
      
      const rewardEarned = newClaimable - initialClaimable;
      if (rewardEarned > 0n) {
        console.log("🎉 SUCCESS! Reward earned:", ethers.formatEther(rewardEarned), "LENDX");
      } else {
        console.log("⚠️  No reward earned. Possible reasons:");
        console.log("   1. Time elapsed was too short");
        console.log("   2. Reward calculation didn't trigger");
        console.log("   3. Check transaction logs for errors");
        
        // Check if updateSupplyBalance was called
        console.log();
        console.log("Checking transaction logs...");
        const logs = receipt.logs;
        console.log("Number of logs:", logs.length);
        
        // Try to decode events
        const accumulatorInterface = new ethers.Interface([
          "event RewardsAccumulated(address indexed user, uint256 amount)"
        ]);
        
        for (const log of logs) {
          try {
            const parsed = accumulatorInterface.parseLog(log);
            if (parsed && parsed.name === "RewardsAccumulated") {
              console.log("✅ Found RewardsAccumulated event!");
              console.log("   User:", parsed.args.user);
              console.log("   Amount:", ethers.formatEther(parsed.args.amount), "LENDX");
            }
          } catch (e) {
            // Not the event we're looking for
          }
        }
      }
    } else {
      console.log("⚠️  Not on local network. Cannot impersonate user.");
      console.log("💡 User needs to manually supply/withdraw to trigger reward calculation.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }

  console.log();
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

