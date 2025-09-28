const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing borrow USDC with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xbA326D3cBE1040f452275E1D7CE4F6AE397bacf7";
    const usdcAddress = "0x232F3952a403b50aC5c59105FDbf8EC8F3915974";
    const wethAddress = "0xC98835773761FFBa1000233890A1996F52f0E388";
    
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
    
    console.log("\n=== STEP 1: Check initial state ===");
    
    // Check balances
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    
    // Check user reserves
    const usdcUserReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
    const wethUserReserve = await lendingPool.userReserves(deployer.address, wethAddress);
    console.log("USDC Supply:", ethers.formatUnits(usdcUserReserve.supply.principal, 18));
    console.log("USDC Borrow:", ethers.formatUnits(usdcUserReserve.borrow.principal, 18));
    console.log("WETH Supply:", ethers.formatUnits(wethUserReserve.supply.principal, 18));
    console.log("WETH Borrow:", ethers.formatUnits(wethUserReserve.borrow.principal, 18));
    
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
        console.log("Error details:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
