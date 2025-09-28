const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing withdraw with correct user, deployer:", deployer.address);
    
    // Use deployer as user (since they have tokens)
    const userAddress = deployer.address;
    
    // Contract addresses (from deploy output)
    const lendingPoolAddress = "0x9342B401e862bBbEe7EC4Cca268ef6A39CEa68Cc";
    const usdcAddress = "0x08ae23E02EB8dB6517a55241164F610c7E8b519d";
    const wethAddress = "0xD0472345d3C565Ff3f43d5D91dD01a073fE3536e";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)",
        "function setAsCollateral(address asset, bool useAsCollateral) external",
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
    const usdcBalance = await usdc.balanceOf(userAddress);
    const wethBalance = await weth.balanceOf(userAddress);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    
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
    
    console.log("\n=== STEP 4: Set USDC as collateral ===");
    
    try {
        console.log("Setting USDC as collateral...");
        const setCollateralTx = await lendingPool.setAsCollateral(usdcAddress, true);
        await setCollateralTx.wait();
        console.log("✅ USDC set as collateral");
        
    } catch (error) {
        console.log("❌ Error setting USDC as collateral:", error.message);
    }
    
    console.log("\n=== STEP 5: Check user reserves ===");
    
    try {
        const usdcUserReserve = await lendingPool.userReserves(userAddress, usdcAddress);
        const wethUserReserve = await lendingPool.userReserves(userAddress, wethAddress);
        
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
        console.log("WETH Supply:", ethers.formatEther(wethUserReserve.supply.principal));
        console.log("WETH Use As Collateral:", wethUserReserve.useAsCollateral);
        
    } catch (error) {
        console.log("❌ Error checking user reserves:", error.message);
    }
    
    console.log("\n=== STEP 6: Try to withdraw USDC ===");
    
    try {
        const withdrawAmount = ethers.parseUnits("10", 6); // 10 USDC
        
        console.log("Withdrawing 10 USDC...");
        const withdrawTx = await lendingPool.withdraw(usdcAddress, withdrawAmount);
        await withdrawTx.wait();
        console.log("✅ USDC withdrawn successfully!");
        
        // Check balances after withdraw
        const usdcBalanceAfter = await usdc.balanceOf(userAddress);
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
