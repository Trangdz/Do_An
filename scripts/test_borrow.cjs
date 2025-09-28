const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing borrow with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xF2eE1c841E792fa3a36aDD619d6191b4a89E869b";
    const usdcAddress = "0x8A12e8a78819cf21FFAfd49da5f09f6C48dA4E41";
    
    // Check if contracts exist
    const lendingPoolCode = await ethers.provider.getCode(lendingPoolAddress);
    const usdcCode = await ethers.provider.getCode(usdcAddress);
    
    console.log("LendingPool code length:", lendingPoolCode.length);
    console.log("USDC code length:", usdcCode.length);
    
    if (lendingPoolCode === "0x") {
        console.log("❌ LendingPool contract not found!");
        return;
    }
    
    if (usdcCode === "0x") {
        console.log("❌ USDC contract not found!");
        return;
    }
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function borrow(address asset, uint256 amount) external",
        "function getUserReserve(address user, address asset) external view returns (tuple(uint256 supplyBalance1e18, uint256 borrowBalance1e18, uint256 userIndex, uint256 lastUpdateTimestamp))",
        "function getReserve(address asset) external view returns (tuple(address asset, uint256 reserveCash, uint256 totalDebt, uint256 utilization, uint256 borrowRate, uint256 supplyRate, bool isBorrowable, bool isActive))"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    // Check balances
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Check reserve data
    try {
        const reserve = await lendingPool.getReserve(usdcAddress);
        console.log("USDC Reserve Cash:", ethers.formatUnits(reserve.reserveCash, 6));
        console.log("USDC Is Borrowable:", reserve.isBorrowable);
    } catch (error) {
        console.log("Error getting reserve data:", error.message);
    }
    
    // Check user reserve data
    try {
        const userReserve = await lendingPool.getUserReserve(deployer.address, usdcAddress);
        console.log("User Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("User Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
    } catch (error) {
        console.log("Error getting user reserve data:", error.message);
    }
    
    // Try to borrow a small amount
    const borrowAmount = ethers.parseUnits("100", 6); // 100 USDC
    console.log("\nTrying to borrow 100 USDC...");
    
    try {
        const tx = await lendingPool.borrow(usdcAddress, borrowAmount);
        console.log("✅ Borrow transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Borrow successful!");
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

