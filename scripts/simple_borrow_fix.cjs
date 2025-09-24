const { ethers } = require("ethers");

async function main() {
    console.log("🔧 Simple Borrow Fix");
    console.log("====================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Current State:");
        console.log("=================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        const reserveData = await pool.reserves(wethAddress);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Is Borrowable:", reserveData.isBorrowable);
        
        console.log("\n🔍 Analysis:");
        console.log("============");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        const collateralValue = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
        const reserveCash = parseFloat(ethers.formatEther(reserveData.reserveCash));
        
        if (supplyBalance === 0) {
            console.log("❌ No assets supplied");
            console.log("💡 Solution: Supply WETH first");
        } else {
            console.log("✅ Assets supplied:", supplyBalance, "WETH");
        }
        
        if (collateralValue === 0) {
            console.log("❌ No collateral value");
            console.log("💡 Solution: Enable assets as collateral");
        } else {
            console.log("✅ Collateral value:", collateralValue, "USD");
        }
        
        if (reserveCash === 0) {
            console.log("❌ No reserve cash");
            console.log("💡 Solution: Add liquidity to reserve");
        } else {
            console.log("✅ Reserve cash:", reserveCash, "WETH");
        }
        
        if (borrowBalance > 1000000) {
            console.log("❌ Borrow balance is abnormally large:", borrowBalance);
            console.log("💡 This is a display bug");
        }
        
        if (!reserveData.isBorrowable) {
            console.log("❌ Asset is not borrowable");
            console.log("💡 Solution: Configure asset as borrowable");
        } else {
            console.log("✅ Asset is borrowable");
        }
        
        console.log("\n📱 Frontend Should Show:");
        console.log("=======================");
        
        if (supplyBalance > 0 && collateralValue > 0 && reserveCash > 0 && reserveData.isBorrowable) {
            console.log("✅ Borrow should be available");
            console.log("💡 Try borrowing a small amount");
        } else {
            console.log("❌ Borrow not available");
            console.log("💡 Fix the issues above first");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
