const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Demo: Anti-Spam Protection
 * Chứng minh user không thể spam transactions
 */
async function main() {
    const [user] = await hre.ethers.getSigners();
    
    // Load addresses
    const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    
    const getAddress = (name) => {
        const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
        return match ? match[1] : null;
    };

    const LendingPoolAddress = getAddress("LendingPoolAddress");
    const DAIAddress = getAddress("DAIAddress");
    const RewardDistributorAddress = getAddress("RewardDistributorAddress");
    
    const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
    const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
    const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);
    
    console.log("🛡️ DEMO: Anti-Spam Protection");
    console.log("=".repeat(70));
    console.log();
    
    // Approve
    const allowance = await dai.allowance(user.address, LendingPoolAddress);
    if (allowance < ethers.parseEther("1000")) {
        console.log("Approving DAI...");
        await dai.approve(LendingPoolAddress, ethers.parseEther("1000"));
        await new Promise(r => setTimeout(r, 2000));
    }
    
    // Check initial reward
    let reward1 = await rewardDistributor.getClaimableReward(user.address);
    console.log("1️⃣ Initial reward:", ethers.formatEther(reward1), "LENDX");
    console.log();
    
    // Supply lần 1
    console.log("2️⃣ Supplying 100 DAI...");
    await lendingPool.lend(DAIAddress, ethers.parseEther("100"));
    await new Promise(r => setTimeout(r, 2000));
    
    let reward2 = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Reward after supply 1:", ethers.formatEther(reward2), "LENDX");
    if (reward2 > reward1) {
        console.log("   ✅ Reward accumulated (first time)");
    } else {
        console.log("   ⚠️  No reward (might be first supply)");
    }
    console.log();
    
    // Supply lần 2 ngay sau đó (1 giây)
    console.log("3️⃣ Supplying 0.0001 DAI again (1 second later)...");
    await lendingPool.lend(DAIAddress, ethers.parseEther("0.0001"));
    await new Promise(r => setTimeout(r, 2000));
    
    let reward3 = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Reward after supply 2:", ethers.formatEther(reward3), "LENDX");
    if (reward3 === reward2) {
        console.log("   ✅ Reward NOT accumulated (time < 60s)");
    } else {
        console.log("   ⚠️  Reward increased (might be significant reward)");
    }
    console.log();
    
    console.log("💡 Explanation:");
    console.log("   - Minimum time between accumulations: 60 seconds");
    console.log("   - OR minimum reward amount: 0.01 LENDX");
    console.log("   - This prevents users from spamming transactions");
    console.log("   - Reward only accumulates if enough time has passed OR reward is significant");
    console.log();
    console.log("🔐 Security Mechanism:");
    console.log("   if (timeElapsed >= minimumTimeElapsed || supplyReward >= minimumRewardAmount) {");
    console.log("       rewardDistributor.accumulateReward(user, supplyReward);");
    console.log("   }");
}

main().catch(console.error);





