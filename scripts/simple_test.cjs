const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Simple test with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x69D16FAF50A11e1Da4dc12caC48f88C1062A793D";
    const wethAddress = "0x78328F2954A1760d15c32BEEAcCf165d57d98c31";
    
    // Check if contracts exist
    const lendingPoolCode = await ethers.provider.getCode(lendingPoolAddress);
    const wethCode = await ethers.provider.getCode(wethAddress);
    
    console.log("LendingPool code length:", lendingPoolCode.length);
    console.log("WETH code length:", wethCode.length);
    
    if (lendingPoolCode === "0x") {
        console.log("❌ LendingPool contract not found!");
        return;
    }
    
    if (wethCode === "0x") {
        console.log("❌ WETH contract not found!");
        return;
    }
    
    // Try to call a simple function
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (tuple(address asset, uint256 reserveCash, uint256 totalDebt, uint256 utilization, uint256 borrowRate, uint256 supplyRate, bool isBorrowable, bool isActive))",
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)"
    ], deployer);
    
    try {
        const reserve = await lendingPool.reserves(wethAddress);
        console.log("✅ Reserve data retrieved successfully!");
        console.log("Asset:", reserve.asset);
        console.log("Is Active:", reserve.isActive);
        console.log("Is Borrowable:", reserve.isBorrowable);
        console.log("Reserve Cash:", ethers.formatEther(reserve.reserveCash));
    } catch (error) {
        console.log("❌ Error calling reserves:", error.message);
        
        // Try to get more details about the error
        if (error.data) {
            console.log("Error data:", error.data);
        }
        if (error.reason) {
            console.log("Error reason:", error.reason);
        }
    }
    
    try {
        const accountData = await lendingPool.getAccountData(deployer.address);
        console.log("✅ Account data retrieved successfully!");
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
    } catch (error) {
        console.log("❌ Error calling getAccountData:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
