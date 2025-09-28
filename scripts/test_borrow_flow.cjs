const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing complete borrow flow with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xE4A60C536053F3C239d2FaEc7848D33A6d21Cdac";
    const wethAddress = "0xe9cec17E93a6f103be7D2306D8a1E498247a0F92";
    const usdcAddress = "0xBf1507936e8c0550437318dD594B49D731311b59";
    const daiAddress = "0x9c83ed7D0b86ee035A39BEA31B389a975b55146b";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n=== STEP 1: Check initial state ===");
    
    // Check initial balances
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Check initial user reserves
    const wethUserReserve = await lendingPool.userReserves(deployer.address, wethAddress);
    const usdcUserReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
    console.log("WETH Supply:", ethers.formatUnits(wethUserReserve.supplyBalance1e18, 18));
    console.log("WETH Borrow:", ethers.formatUnits(wethUserReserve.borrowBalance1e18, 18));
    console.log("USDC Supply:", ethers.formatUnits(usdcUserReserve.supplyBalance1e18, 18));
    console.log("USDC Borrow:", ethers.formatUnits(usdcUserReserve.borrowBalance1e18, 18));
    
    // Check account data
    const accountData = await lendingPool.getAccountData(deployer.address);
    console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
    console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
    console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
    
    console.log("\n=== STEP 2: Try to borrow USDC ===");
    const borrowAmount = ethers.parseUnits("50", 6); // 50 USDC
    
    try {
        console.log("Borrowing 50 USDC...");
        const borrowTx = await lendingPool.borrow(usdcAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ USDC borrowed successfully!");
        
        // Check balances after borrow
        const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
        console.log("USDC Balance after borrow:", ethers.formatUnits(usdcBalanceAfter, 6));
        
        // Check user reserves after borrow
        const usdcUserReserveAfter = await lendingPool.userReserves(deployer.address, usdcAddress);
        console.log("USDC Borrow after:", ethers.formatUnits(usdcUserReserveAfter.borrowBalance1e18, 18));
        
        // Check account data after borrow
        const accountDataAfter = await lendingPool.getAccountData(deployer.address);
        console.log("Debt Value after:", ethers.formatEther(accountDataAfter.debtValue1e18));
        console.log("Health Factor after:", ethers.formatEther(accountDataAfter.healthFactor1e18));
        
    } catch (error) {
        console.log("❌ Borrow failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

