const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking user borrow status, deployer:", deployer.address);
    
    // User address from error message
    const userAddress = "0xd9b7fc43b964a38f1683d6a84e9e027f3b3a4494";
    
    // Contract addresses
    const lendingPoolAddress = "0xF4C1C75D3B446b3Baa6D3F8259e3A20cf0825100";
    const usdcAddress = "0xf09Cd31aECB6B86661e10Dd7308b9fF183346A7d";
    const wethAddress = "0xC9CE6c273F233dbcFbA4D279D96BB3ea288dbcBf";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
        "function getAccountData(address user) external view returns (uint256 totalCollateral1e18, uint256 totalDebt1e18, uint256 healthFactor1e18)"
    ], deployer);
    
    console.log("\n=== Check User Reserves ===");
    
    try {
        // Check USDC reserves
        const usdcUserReserve = await lendingPool.userReserves(userAddress, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Borrow:", ethers.formatEther(usdcUserReserve.borrow.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
        
        // Check WETH reserves
        const wethUserReserve = await lendingPool.userReserves(userAddress, wethAddress);
        console.log("WETH Supply:", ethers.formatEther(wethUserReserve.supply.principal));
        console.log("WETH Borrow:", ethers.formatEther(wethUserReserve.borrow.principal));
        console.log("WETH Use As Collateral:", wethUserReserve.useAsCollateral);
        
    } catch (error) {
        console.log("❌ Error checking user reserves:", error.message);
    }
    
    console.log("\n=== Check Account Data ===");
    
    try {
        const accountData = await lendingPool.getAccountData(userAddress);
        console.log("Total Collateral:", ethers.formatEther(accountData[0]));
        console.log("Total Debt:", ethers.formatEther(accountData[1]));
        console.log("Health Factor:", ethers.formatEther(accountData[2]));
        
        // Check if health factor is too low
        const healthFactor = parseFloat(ethers.formatEther(accountData[2]));
        if (healthFactor < 1.0) {
            console.log("❌ Health factor too low:", healthFactor);
        } else {
            console.log("✅ Health factor OK:", healthFactor);
        }
        
    } catch (error) {
        console.log("❌ Error checking account data:", error.message);
    }
    
    console.log("\n=== Check Reserve Data ===");
    
    try {
        // Check USDC reserve data
        const usdcReserve = await lendingPool.reserves(usdcAddress);
        console.log("USDC Reserve Cash:", ethers.formatEther(usdcReserve.reserveCash));
        console.log("USDC Total Debt:", ethers.formatEther(usdcReserve.totalDebtPrincipal));
        console.log("USDC Decimals:", usdcReserve.decimals);
        console.log("USDC Is Borrowable:", usdcReserve.isBorrowable);
        
        // Check WETH reserve data
        const wethReserve = await lendingPool.reserves(wethAddress);
        console.log("WETH Reserve Cash:", ethers.formatEther(wethReserve.reserveCash));
        console.log("WETH Total Debt:", ethers.formatEther(wethReserve.totalDebtPrincipal));
        console.log("WETH Decimals:", wethReserve.decimals);
        console.log("WETH Is Borrowable:", wethReserve.isBorrowable);
        
    } catch (error) {
        console.log("❌ Error checking reserve data:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
