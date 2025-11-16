const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Trigger reward accumulation cho user bằng cách supply một số lượng nhỏ
 * @dev Script này giúp user trigger reward accumulation nếu đã supply trước khi setup
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Lấy user address từ environment variable hoặc dùng deployer
  const userAddress = process.env.USER_ADDRESS || deployer.address;
  
  console.log("🎯 Triggering Reward Accumulation for User...\n");
  console.log("User Address:", userAddress, "\n");

  const deploymentsDir = "deployments";
  const localChainlink = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "local-chainlink.json"), "utf8"));
  const lendxSystem = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "lendx-token-system.json"), "utf8"));
  
  const lendingPoolAddress = localChainlink.contracts?.lendingPool || localChainlink.lendingPool;
  const daiAddress = localChainlink.tokens?.dai || localChainlink.dai;
  
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(lendingPoolAddress);
  
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const distributor = RewardDistributor.attach(lendxSystem.rewardDistributor);
  
  const DAI = await hre.ethers.getContractFactory("ERC20Mock");
  const dai = DAI.attach(daiAddress);
  
  // Check current reward
  const claimableBefore = await distributor.getClaimableReward(userAddress);
  console.log("📊 Current State:");
  console.log("   Claimable Reward:", ethers.formatEther(claimableBefore), "LENDX");
  
  try {
    const supplyBalance = await lendingPool.getCurrentSupplyBalance(userAddress, daiAddress);
    console.log("   Supply Balance:", ethers.formatEther(supplyBalance), "DAI");
    
    if (supplyBalance === 0n) {
      console.log("\n⚠️  User has NO supply balance!");
      console.log("   💡 User needs to supply first to earn rewards");
      return;
    }
  } catch (e) {
    console.log("   ❌ Error:", e.message);
    return;
  }
  
  // Check if user has DAI to supply
  const userDaiBalance = await dai.balanceOf(userAddress);
  console.log("   DAI Balance:", ethers.formatEther(userDaiBalance), "DAI");
  
  if (userDaiBalance < ethers.parseEther("0.01")) {
    console.log("\n⚠️  User doesn't have enough DAI to trigger!");
    console.log("   💡 Need at least 0.01 DAI to trigger reward accumulation");
    return;
  }
  
  // Trigger by supplying a tiny amount
  console.log("\n🔄 Triggering reward accumulation...");
  try {
    // Use user's signer if different from deployer
    let signer = deployer;
    if (userAddress.toLowerCase() !== deployer.address.toLowerCase()) {
      // Get signer for user address (if in hardhat accounts)
      const signers = await hre.ethers.getSigners();
      const userSigner = signers.find(s => s.address.toLowerCase() === userAddress.toLowerCase());
      if (userSigner) {
        signer = userSigner;
      } else {
        console.log("   ⚠️  Cannot find signer for user address");
        console.log("   💡 User needs to run this from their wallet");
        return;
      }
    }
    
    // Approve
    const triggerAmount = ethers.parseEther("0.01"); // Very small amount
    const approveTx = await dai.connect(signer).approve(lendingPoolAddress, triggerAmount);
    await approveTx.wait();
    console.log("   ✅ Approved 0.01 DAI");
    
    // Supply tiny amount to trigger
    const supplyAmount = ethers.parseEther("0.01");
    console.log("   Supplying 0.01 DAI to trigger accumulation...");
    const supplyTx = await lendingPool.connect(signer).lend(daiAddress, supplyAmount);
    await supplyTx.wait();
    console.log("   ✅ Supply successful - reward should be accumulated!");
    
    // Check reward after
    await new Promise(resolve => setTimeout(resolve, 2000));
    const claimableAfter = await distributor.getClaimableReward(userAddress);
    const increase = claimableAfter - claimableBefore;
    
    console.log("\n📈 Result:");
    console.log("   Claimable Reward:", ethers.formatEther(claimableAfter), "LENDX");
    if (increase > 0n) {
      console.log("   ✅ Reward INCREASED by:", ethers.formatEther(increase), "LENDX");
    } else {
      console.log("   ⚠️  Reward did not increase (may be too small to see)");
      console.log("   💡 Try increasing reward rate or wait longer");
    }
    
  } catch (e) {
    console.log("   ❌ Error:", e.message);
    if (e.message.includes("AssetNotInitialized")) {
      console.log("   💡 Asset not initialized. Need to init reserve first.");
    }
  }
  
  console.log("\n✅ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








































