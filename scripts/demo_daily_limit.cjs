const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Demo: Daily Claim Limit
 * Chứng minh user không thể claim quá daily limit
 */
async function main() {
    const [owner, user] = await hre.ethers.getSigners();
    
    // Load addresses
    const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    
    const getAddress = (name) => {
        const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
        return match ? match[1] : null;
    };

    const RewardDistributorAddress = getAddress("RewardDistributorAddress");
    
    const rewardDistributor = await hre.ethers.getContractAt(
        "RewardDistributor",
        RewardDistributorAddress
    );
    
    console.log("📊 DEMO: Daily Claim Limit");
    console.log("=".repeat(70));
    console.log();
    
    // Check current day
    const currentDay = Math.floor(Date.now() / 86400000);
    console.log("Current day:", currentDay);
    console.log();
    
    // Accumulate 5000 LENDX cho user
    console.log("1️⃣ Accumulating 5000 LENDX reward for user...");
    try {
        await rewardDistributor.connect(owner).accumulateReward(
            user.address,
            ethers.parseEther("5000")
        );
        console.log("   ✅ Reward accumulated");
    } catch (error) {
        console.log("   ⚠️  Error (might need owner):", error.message);
    }
    console.log();
    
    // Check claimable
    let claimable = await rewardDistributor.getClaimableReward(user.address);
    console.log("2️⃣ Claimable reward:", ethers.formatEther(claimable), "LENDX");
    console.log();
    
    // Check daily limit
    const dailyLimit = await rewardDistributor.dailyClaimLimit();
    console.log("   Daily claim limit:", ethers.formatEther(dailyLimit), "LENDX");
    console.log();
    
    // Claim lần 1
    console.log("3️⃣ Claiming reward (1st time)...");
    try {
        const tx = await rewardDistributor.connect(user).claimReward();
        await tx.wait();
        const claimed1 = await rewardDistributor.dailyClaimed(user.address, currentDay);
        console.log("   ✅ Claimed:", ethers.formatEther(claimed1), "LENDX");
    } catch (error) {
        console.log("   ❌ Error:", error.message);
    }
    console.log();
    
    // Claim lần 2
    console.log("4️⃣ Claiming reward (2nd time)...");
    try {
        const tx = await rewardDistributor.connect(user).claimReward();
        await tx.wait();
        const claimed2 = await rewardDistributor.dailyClaimed(user.address, currentDay);
        console.log("   ✅ Claimed:", ethers.formatEther(claimed2), "LENDX");
    } catch (error) {
        console.log("   ❌ Error:", error.message);
    }
    console.log();
    
    // Claim lần 3
    console.log("5️⃣ Claiming reward (3rd time)...");
    try {
        const tx = await rewardDistributor.connect(user).claimReward();
        await tx.wait();
        console.log("   ❌ FAIL: Should have reverted");
    } catch (error) {
        if (error.message.includes("DailyLimitExceeded") || error.message.includes("daily")) {
            console.log("   ✅ PASS: Daily limit exceeded");
        } else {
            console.log("   ⚠️  Error:", error.message);
        }
    }
    console.log();
    
    console.log("💡 Explanation:");
    console.log("   - Daily claim limit: 1000 LENDX per day per user");
    console.log("   - User can claim up to 1000 LENDX per day");
    console.log("   - This ensures fair distribution among all users");
    console.log("   - Prevents early users from claiming all rewards");
    console.log();
    console.log("🔐 Security Mechanism:");
    console.log("   uint256 currentDay = block.timestamp / 86400;");
    console.log("   uint256 claimedToday = dailyClaimed[msg.sender][currentDay];");
    console.log("   if (claimedToday >= dailyClaimLimit) revert DailyLimitExceeded();");
}

main().catch(console.error);





