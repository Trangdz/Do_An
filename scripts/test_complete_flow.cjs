const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing complete flow with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xF2eE1c841E792fa3a36aDD619d6191b4a89E869b";
    const wethAddress = "0x58E8D7188AcC7F49c2326476e5C34878eba951d2";
    const usdcAddress = "0x8A12e8a78819cf21FFAfd49da5f09f6C48dA4E41";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function supply(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function getUserReserve(address user, address asset) external view returns (tuple(uint256 supplyBalance1e18, uint256 borrowBalance1e18, uint256 userIndex, uint256 lastUpdateTimestamp))",
        "function getReserve(address asset) external view returns (tuple(address asset, uint256 reserveCash, uint256 totalDebt, uint256 utilization, uint256 borrowRate, uint256 supplyRate, bool isBorrowable, bool isActive))"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n=== STEP 1: Check initial balances ===");
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    console.log("\n=== STEP 2: Supply WETH as collateral ===");
    const supplyAmount = ethers.parseEther("100"); // 100 WETH
    
    // Approve WETH
    console.log("Approving WETH...");
    const approveTx = await weth.approve(lendingPoolAddress, supplyAmount);
    await approveTx.wait();
    console.log("✅ WETH approved");
    
    // Supply WETH
    console.log("Supplying 100 WETH...");
    const supplyTx = await lendingPool.supply(wethAddress, supplyAmount);
    await supplyTx.wait();
    console.log("✅ WETH supplied");
    
    console.log("\n=== STEP 3: Check user reserve after supply ===");
    const userReserve = await lendingPool.getUserReserve(deployer.address, wethAddress);
    console.log("User WETH Supply:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
    console.log("User WETH Borrow:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
    
    console.log("\n=== STEP 4: Try to borrow USDC ===");
    const borrowAmount = ethers.parseUnits("50", 6); // 50 USDC
    
    try {
        const borrowTx = await lendingPool.borrow(usdcAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ USDC borrowed successfully!");
        
        // Check final balances
        const finalUsdcBalance = await usdc.balanceOf(deployer.address);
        console.log("Final USDC Balance:", ethers.formatUnits(finalUsdcBalance, 6));
        
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