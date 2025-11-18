const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Check RewardDistributor Balance ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const LENDXTokenAddress = getAddress("LENDXTokenAddress");
  const User1Address = getAddress("User1Address"); // User from error message
  
  console.log("📋 Addresses:");
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   LENDX Token:", LENDXTokenAddress);
  console.log("   User 1:", User1Address);
  console.log();
  
  // Get contracts
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);
  
  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = LENDXToken.attach(LENDXTokenAddress);
  
  // Check RewardDistributor LENDX balance
  console.log("1️⃣  Checking RewardDistributor LENDX balance...");
  const distributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("   Balance:", ethers.formatEther(distributorBalance), "LENDX");
  
  if (distributorBalance === 0n) {
    console.log("   ❌ RewardDistributor has NO LENDX tokens!");
    console.log("   💡 Need to transfer LENDX to RewardDistributor");
    
    // Check deployer balance
    const deployerBalance = await lendxToken.balanceOf(deployer.address);
    console.log("\n   Deployer LENDX balance:", ethers.formatEther(deployerBalance), "LENDX");
    
    if (deployerBalance > 0n) {
      const amountToTransfer = ethers.parseUnits("80000000", 18); // 80M LENDX
      if (deployerBalance >= amountToTransfer) {
        console.log("\n   💡 Transferring 80M LENDX to RewardDistributor...");
        try {
          const tx = await lendxToken.transfer(RewardDistributorAddress, amountToTransfer);
          await tx.wait();
          console.log("   ✅ Transferred successfully!");
        } catch (error) {
          console.log("   ❌ Transfer failed:", error.message);
        }
      } else {
        console.log("\n   ⚠️  Deployer doesn't have enough LENDX");
        console.log("   💡 Need at least 80M LENDX to transfer");
      }
    }
  } else {
    console.log("   ✅ RewardDistributor has LENDX tokens");
  }
  console.log();
  
  // Check user's claimable reward
  console.log("2️⃣  Checking User 1's claimable reward...");
  try {
    const claimableReward = await rewardDistributor.getClaimableReward(User1Address);
    console.log("   Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
    
    if (claimableReward === 0n) {
      console.log("   ⚠️  User has no claimable reward");
      console.log("   💡 Rewards accumulate on NEXT transaction after supply/borrow");
    } else {
      console.log("   ✅ User has reward to claim");
      
      // Check if RewardDistributor has enough to pay
      const newDistributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
      if (newDistributorBalance < claimableReward) {
        console.log("   ❌ RewardDistributor doesn't have enough LENDX to pay!");
        console.log("   💡 Need to transfer more LENDX to RewardDistributor");
      } else {
        console.log("   ✅ RewardDistributor has enough LENDX to pay");
      }
    }
  } catch (error) {
    console.log("   ❌ Error checking claimable reward:", error.message);
  }
  console.log();
  
  // Check total distributed
  console.log("3️⃣  Checking total distributed...");
  try {
    const totalDistributed = await rewardDistributor.totalDistributed();
    console.log("   Total distributed:", ethers.formatEther(totalDistributed), "LENDX");
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
  console.log();
  
  // Test claimReward function (estimate gas)
  console.log("4️⃣  Testing claimReward() gas estimation...");
  try {
    const claimableReward = await rewardDistributor.getClaimableReward(User1Address);
    if (claimableReward > 0n) {
      // Try to estimate gas as User1
      const user1Signer = await hre.ethers.getSigner(User1Address);
      const rewardDistributorAsUser1 = rewardDistributor.connect(user1Signer);
      
      try {
        const gasEstimate = await rewardDistributorAsUser1.claimReward.estimateGas();
        console.log("   ✅ Gas estimate:", gasEstimate.toString());
        console.log("   ✅ Function callable");
      } catch (error) {
        console.log("   ❌ Gas estimation failed:", error.message);
        if (error.message.includes("NoRewardToClaim")) {
          console.log("   💡 User has no reward to claim");
        } else if (error.message.includes("insufficient funds")) {
          console.log("   💡 RewardDistributor doesn't have enough LENDX");
        }
      }
    } else {
      console.log("   ⚠️  User has no reward, skipping gas estimation");
    }
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

