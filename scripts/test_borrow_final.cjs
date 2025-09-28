const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing borrow with new contract, deployer:", deployer.address);
    
    // Contract addresses (new)
    const lendingPoolAddress = "0xF4C1C75D3B446b3Baa6D3F8259e3A20cf0825100";
    const usdcAddress = "0xf09Cd31aECB6B86661e10Dd7308b9fF183346A7d";
    const wethAddress = "0xC9CE6c273F233dbcFbA4D279D96BB3ea288dbcBf";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n=== STEP 1: Supply WETH as collateral ===");
    
    try {
        const supplyAmount = ethers.parseEther("100"); // 100 WETH
        
        // Approve WETH
        console.log("Approving WETH...");
        const approveTx = await weth.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ WETH approved");
        
        // Supply WETH
        console.log("Supplying 100 WETH...");
        const supplyTx = await lendingPool.lend(wethAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ WETH supplied");
        
    } catch (error) {
        console.log("❌ Error supplying WETH:", error.message);
    }
    
    console.log("\n=== STEP 2: Supply USDC to pool ===");
    
    try {
        const supplyAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        
        // Approve USDC
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ USDC approved");
        
        // Supply USDC
        console.log("Supplying 10,000 USDC...");
        const supplyTx = await lendingPool.lend(usdcAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ USDC supplied");
        
    } catch (error) {
        console.log("❌ Error supplying USDC:", error.message);
    }
    
    console.log("\n=== STEP 3: Check user reserves ===");
    
    try {
        const wethUserReserve = await lendingPool.userReserves(deployer.address, wethAddress);
        const usdcUserReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
        
        console.log("WETH Supply:", ethers.formatEther(wethUserReserve.supply.principal));
        console.log("WETH Use As Collateral:", wethUserReserve.useAsCollateral);
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
        
    } catch (error) {
        console.log("❌ Error getting user reserves:", error.message);
    }
    
    console.log("\n=== STEP 4: Try to borrow USDC ===");
    
    try {
        const borrowAmount = ethers.parseUnits("50", 6); // 50 USDC
        
        console.log("Borrowing 50 USDC...");
        const borrowTx = await lendingPool.borrow(usdcAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ USDC borrowed successfully!");
        
        // Check balances after borrow
        const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
        console.log("USDC Balance after borrow:", ethers.formatUnits(usdcBalanceAfter, 6));
        
    } catch (error) {
        console.log("❌ Error borrowing USDC:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
