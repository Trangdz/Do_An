const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing withdraw USDC with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xF4C1C75D3B446b3Baa6D3F8259e3A20cf0825100";
    const usdcAddress = "0xf09Cd31aECB6B86661e10Dd7308b9fF183346A7d";
    const wethAddress = "0xC9CE6c273F233dbcFbA4D279D96BB3ea288dbcBf";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)",
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
    
    console.log("\n=== STEP 1: Check initial state ===");
    
    // Check balances
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    
    // Check user reserves
    const usdcUserReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
    const wethUserReserve = await lendingPool.userReserves(deployer.address, wethAddress);
    console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
    console.log("WETH Supply:", ethers.formatEther(wethUserReserve.supply.principal));
    
    console.log("\n=== STEP 2: Supply WETH as collateral ===");
    
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
    
    console.log("\n=== STEP 3: Supply USDC to pool ===");
    
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
    
    console.log("\n=== STEP 4: Check user reserves after supply ===");
    
    try {
        const usdcUserReserveAfter = await lendingPool.userReserves(deployer.address, usdcAddress);
        console.log("USDC Supply after:", ethers.formatEther(usdcUserReserveAfter.supply.principal));
        
    } catch (error) {
        console.log("❌ Error getting user reserves:", error.message);
    }
    
    console.log("\n=== STEP 5: Try to withdraw USDC ===");
    
    try {
        const withdrawAmount = ethers.parseUnits("10", 6); // 10 USDC
        
        console.log("Withdrawing 10 USDC...");
        const withdrawTx = await lendingPool.withdraw(usdcAddress, withdrawAmount);
        await withdrawTx.wait();
        console.log("✅ USDC withdrawn successfully!");
        
        // Check balances after withdraw
        const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
        console.log("USDC Balance after withdraw:", ethers.formatUnits(usdcBalanceAfter, 6));
        
    } catch (error) {
        console.log("❌ Error withdrawing USDC:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
