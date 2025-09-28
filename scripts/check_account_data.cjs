const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking account data with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xbA326D3cBE1040f452275E1D7CE4F6AE397bacf7";
    const usdcAddress = "0x232F3952a403b50aC5c59105FDbf8EC8F3915974";
    const wethAddress = "0xC98835773761FFBa1000233890A1996F52f0E388";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    console.log("\n=== Account Data ===");
    
    try {
        const accountData = await lendingPool.getAccountData(deployer.address);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
        
        // Check if collateral is enough for 50 USDC borrow
        const borrowAmount = ethers.parseUnits("50", 6); // 50 USDC
        const borrowAmount1e18 = ethers.parseUnits("50", 18); // 50 USDC in 18 decimals
        const newDebt = accountData.debtValue1e18 + borrowAmount1e18;
        const requiredCollateral = newDebt * 110n / 100n; // 110% buffer
        
        console.log("\n=== Borrow Analysis ===");
        console.log("Borrow Amount (6 decimals):", ethers.formatUnits(borrowAmount, 6));
        console.log("Borrow Amount (18 decimals):", ethers.formatEther(borrowAmount1e18));
        console.log("Current Debt:", ethers.formatEther(accountData.debtValue1e18));
        console.log("New Debt:", ethers.formatEther(newDebt));
        console.log("Required Collateral:", ethers.formatEther(requiredCollateral));
        console.log("Current Collateral:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Can Borrow:", accountData.collateralValue1e18 >= requiredCollateral);
        
    } catch (error) {
        console.log("❌ Error getting account data:", error.message);
    }
    
    console.log("\n=== User Reserves ===");
    
    // Check WETH supply
    try {
        const wethUserReserve = await lendingPool.userReserves(deployer.address, wethAddress);
        console.log("WETH Supply:", ethers.formatEther(wethUserReserve.supply.principal));
        console.log("WETH Use As Collateral:", wethUserReserve.useAsCollateral);
    } catch (error) {
        console.log("❌ Error getting WETH user reserve:", error.message);
    }
    
    // Check USDC supply
    try {
        const usdcUserReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
    } catch (error) {
        console.log("❌ Error getting USDC user reserve:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
