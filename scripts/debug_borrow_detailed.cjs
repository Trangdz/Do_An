const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging borrow detailed with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xbA326D3cBE1040f452275E1D7CE4F6AE397bacf7";
    const usdcAddress = "0x232F3952a403b50aC5c59105FDbf8EC8F3915974";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function borrow(address asset, uint256 amount) external",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    console.log("\n=== USDC Reserve Data ===");
    
    try {
        const reserve = await lendingPool.reserves(usdcAddress);
        console.log("Is Borrowable:", reserve.isBorrowable);
        console.log("Reserve Cash:", ethers.formatUnits(reserve.reserveCash, 18));
        console.log("Decimals:", reserve.decimals);
        console.log("LTV Bps:", reserve.ltvBps);
        console.log("Liquidation Threshold Bps:", reserve.liqThresholdBps);
        
        if (!reserve.isBorrowable) {
            console.log("❌ USDC is not borrowable!");
            return;
        }
        
        const reserveCash = ethers.formatUnits(reserve.reserveCash, 18);
        console.log("Reserve Cash (formatted):", reserveCash);
        
        if (parseFloat(reserveCash) < 50) {
            console.log("❌ Insufficient liquidity! Need at least 50 USDC");
            return;
        }
        
    } catch (error) {
        console.log("❌ Error getting reserve data:", error.message);
        return;
    }
    
    console.log("\n=== Testing Borrow ===");
    
    try {
        const borrowAmount = ethers.parseUnits("50", 6); // 50 USDC
        console.log("Borrow Amount:", ethers.formatUnits(borrowAmount, 6));
        
        // Try to estimate gas
        console.log("Estimating gas...");
        const gasEstimate = await lendingPool.borrow.estimateGas(usdcAddress, borrowAmount);
        console.log("Gas Estimate:", gasEstimate.toString());
        
        // Try to call static
        console.log("Calling static...");
        await lendingPool.borrow.staticCall(usdcAddress, borrowAmount);
        console.log("✅ Static call successful");
        
        // Try actual borrow
        console.log("Attempting borrow...");
        const borrowTx = await lendingPool.borrow(usdcAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ Borrow successful!");
        
    } catch (error) {
        console.log("❌ Borrow failed:", error.message);
        
        // Try to decode revert reason
        if (error.data) {
            console.log("Error data:", error.data);
        }
        
        // Check if it's a specific revert
        if (error.message.includes("Health factor too low")) {
            console.log("❌ Health factor too low");
        } else if (error.message.includes("Insufficient liquidity")) {
            console.log("❌ Insufficient liquidity");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("❌ Invalid amount");
        } else {
            console.log("❌ Unknown error:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
