const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Supplying USDC to pool with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xE4A60C536053F3C239d2FaEc7848D33A6d21Cdac";
    const usdcAddress = "0xBf1507936e8c0550437318dD594B49D731311b59";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n=== Before Supply ===");
    
    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Check USDC reserve
    const usdcReserve = await lendingPool.reserves(usdcAddress);
    console.log("USDC Reserve Cash:", ethers.formatUnits(usdcReserve.reserveCash, usdcReserve.decimals));
    
    console.log("\n=== Supplying USDC to Pool ===");
    const supplyAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    
    try {
        // Approve USDC
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ USDC approved");
        
        // Supply USDC
        console.log("Supplying 10,000 USDC to pool...");
        const supplyTx = await lendingPool.lend(usdcAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ USDC supplied to pool");
        
    } catch (error) {
        console.log("❌ Error supplying USDC:", error.message);
    }
    
    console.log("\n=== After Supply ===");
    
    // Check USDC balance after
    const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalanceAfter, 6));
    
    // Check USDC reserve after
    const usdcReserveAfter = await lendingPool.reserves(usdcAddress);
    console.log("USDC Reserve Cash:", ethers.formatUnits(usdcReserveAfter.reserveCash, usdcReserveAfter.decimals));
    
    console.log("\n✅ Pool now has USDC liquidity for borrowing!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

