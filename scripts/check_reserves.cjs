const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking reserves for deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x69D16FAF50A11e1Da4dc12caC48f88C1062A793D";
    const wethAddress = "0x78328F2954A1760d15c32BEEAcCf165d57d98c31";
    const usdcAddress = "0x894A963813f5A2Abb30c80896138ACc10B7FE52B";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function getReserve(address asset) external view returns (tuple(address asset, uint256 reserveCash, uint256 totalDebt, uint256 utilization, uint256 borrowRate, uint256 supplyRate, bool isBorrowable, bool isActive))",
        "function isReserveActive(address asset) external view returns (bool)",
        "function isReserveBorrowable(address asset) external view returns (bool)"
    ], deployer);
    
    console.log("\n=== Checking WETH Reserve ===");
    try {
        const wethReserve = await lendingPool.getReserve(wethAddress);
        console.log("WETH Reserve Active:", wethReserve.isActive);
        console.log("WETH Reserve Borrowable:", wethReserve.isBorrowable);
        console.log("WETH Reserve Cash:", ethers.formatEther(wethReserve.reserveCash));
    } catch (error) {
        console.log("Error getting WETH reserve:", error.message);
    }
    
    console.log("\n=== Checking USDC Reserve ===");
    try {
        const usdcReserve = await lendingPool.getReserve(usdcAddress);
        console.log("USDC Reserve Active:", usdcReserve.isActive);
        console.log("USDC Reserve Borrowable:", usdcReserve.isBorrowable);
        console.log("USDC Reserve Cash:", ethers.formatUnits(usdcReserve.reserveCash, 6));
    } catch (error) {
        console.log("Error getting USDC reserve:", error.message);
    }
    
    console.log("\n=== Checking Reserve Status ===");
    try {
        const wethActive = await lendingPool.isReserveActive(wethAddress);
        const wethBorrowable = await lendingPool.isReserveBorrowable(wethAddress);
        console.log("WETH Active:", wethActive);
        console.log("WETH Borrowable:", wethBorrowable);
    } catch (error) {
        console.log("Error checking WETH status:", error.message);
    }
    
    try {
        const usdcActive = await lendingPool.isReserveActive(usdcAddress);
        const usdcBorrowable = await lendingPool.isReserveBorrowable(usdcAddress);
        console.log("USDC Active:", usdcActive);
        console.log("USDC Borrowable:", usdcBorrowable);
    } catch (error) {
        console.log("Error checking USDC status:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
