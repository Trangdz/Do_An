const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Demo: Access Control Security
 * Chứng minh user không thể tự tăng reward
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

    const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
    const DAIAddress = getAddress("DAIAddress");
    
    const rewardAccumulator = await hre.ethers.getContractAt(
        "RewardAccumulator",
        RewardAccumulatorAddress
    );
    
    console.log("🔒 DEMO: Access Control Security");
    console.log("=".repeat(70));
    console.log();
    console.log("User:", user.address);
    console.log("Attempting to call updateSupplyBalance() directly...");
    console.log();
    
    try {
        const tx = await rewardAccumulator.updateSupplyBalance(
            user.address,
            DAIAddress,
            ethers.parseEther("1000000") // Cố gắng set balance cao
        );
        await tx.wait();
        console.log("❌ FAIL: Transaction succeeded (should have reverted)");
    } catch (error) {
        console.log("✅ PASS: Transaction reverted");
        console.log("Error:", error.message);
        console.log();
        console.log("💡 Explanation:");
        console.log("   - User cannot directly call updateSupplyBalance()");
        console.log("   - Only LendingPool can call this function");
        console.log("   - This prevents users from manipulating their rewards");
        console.log();
        console.log("🔐 Security Mechanism:");
        console.log("   require(msg.sender == lendingPool, \"RewardAccumulator: only LendingPool\");");
    }
}

main().catch(console.error);




