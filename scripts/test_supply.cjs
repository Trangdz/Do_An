const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing supply with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xE4A60C536053F3C239d2FaEc7848D33A6d21Cdac";
    const wethAddress = "0xe9cec17E93a6f103be7D2306D8a1E498247a0F92";
    const usdcAddress = "0xBf1507936e8c0550437318dD594B49D731311b59";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function decimals() view returns (uint8)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function decimals() view returns (uint8)"
    ], deployer);
    
    console.log("\n=== Before Supply ===");
    
    // Check balances
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Check reserves
    const wethReserve = await lendingPool.reserves(wethAddress);
    const usdcReserve = await lendingPool.reserves(usdcAddress);
    console.log("WETH Reserve Cash:", ethers.formatUnits(wethReserve.reserveCash, wethReserve.decimals));
    console.log("USDC Reserve Cash:", ethers.formatUnits(usdcReserve.reserveCash, usdcReserve.decimals));
    
    console.log("\n=== Supplying WETH ===");
    const supplyAmount = ethers.parseEther("100"); // 100 WETH
    
    try {
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
    
    console.log("\n=== After Supply ===");
    
    // Check balances again
    const wethBalanceAfter = await weth.balanceOf(deployer.address);
    const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalanceAfter));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalanceAfter, 6));
    
    // Check reserves again
    const wethReserveAfter = await lendingPool.reserves(wethAddress);
    const usdcReserveAfter = await lendingPool.reserves(usdcAddress);
    console.log("WETH Reserve Cash:", ethers.formatUnits(wethReserveAfter.reserveCash, wethReserveAfter.decimals));
    console.log("USDC Reserve Cash:", ethers.formatUnits(usdcReserveAfter.reserveCash, usdcReserveAfter.decimals));
    
    // Check account data
    const accountData = await lendingPool.getAccountData(deployer.address);
    console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
    console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
    console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

