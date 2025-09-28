const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging reserve cash detailed with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x3a2200d9A1502a42a21675639148760a1a4B5A7a";
    const usdcAddress = "0x350E815Fb645165F1623b986D684a414220ac2FB";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ], deployer);
    
    console.log("\n=== Debugging USDC Reserve Cash ===");
    
    try {
        // Get USDC decimals from token contract
        const usdcDecimals = await usdc.decimals();
        console.log("USDC Token Decimals:", usdcDecimals);
        
        // Get reserve data
        const reserve = await lendingPool.reserves(usdcAddress);
        console.log("Contract Reserve Decimals:", reserve.decimals);
        console.log("Reserve Cash (raw):", reserve.reserveCash.toString());
        
        // Get actual USDC balance of the pool
        const poolBalance = await usdc.balanceOf(lendingPoolAddress);
        console.log("Pool USDC Balance (raw):", poolBalance.toString());
        console.log("Pool USDC Balance (6 decimals):", ethers.formatUnits(poolBalance, 6));
        
        // Format reserve cash with different decimals
        console.log("\n--- Formatting Reserve Cash ---");
        console.log("With 6 decimals:", ethers.formatUnits(reserve.reserveCash, 6));
        console.log("With 18 decimals:", ethers.formatUnits(reserve.reserveCash, 18));
        
        // Check if reserve cash matches pool balance
        const reserveCash6 = ethers.formatUnits(reserve.reserveCash, 6);
        const poolBalance6 = ethers.formatUnits(poolBalance, 6);
        console.log("\n--- Comparison ---");
        console.log("Reserve Cash (6 decimals):", reserveCash6);
        console.log("Pool Balance (6 decimals):", poolBalance6);
        console.log("Match:", reserveCash6 === poolBalance6);
        
        // Check if reserve cash is normalized (18 decimals)
        const reserveCash18 = ethers.formatUnits(reserve.reserveCash, 18);
        const poolBalance18 = ethers.formatUnits(poolBalance, 18);
        console.log("\n--- Normalized Comparison ---");
        console.log("Reserve Cash (18 decimals):", reserveCash18);
        console.log("Pool Balance (18 decimals):", poolBalance18);
        console.log("Match:", reserveCash18 === poolBalance18);
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
