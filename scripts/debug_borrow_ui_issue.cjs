const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Debug Borrow UI Issue");
    console.log("========================");
    
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
        'function balanceOf(address) view returns (uint256)',
        'function totalSupply() view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Current State Analysis:");
        console.log("=========================");
        
        // Check user reserves
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        console.log("User Reserve Data:");
        console.log("- Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("- Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("- Is Collateral:", userReserve.isCollateral);
        
        // Check account data
        const accountData = await pool.getAccountData(deployer.address);
        console.log("\nAccount Data:");
        console.log("- Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("- Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("- Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
        
        // Check reserve data
        const reserveData = await pool.reserves(wethAddress);
        console.log("\nReserve Data:");
        console.log("- Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("- Total Debt:", ethers.formatEther(reserveData.totalDebt));
        console.log("- Utilization:", ethers.formatUnits(reserveData.utilizationWad, 18));
        console.log("- Is Borrowable:", reserveData.isBorrowable);
        console.log("- LTV:", reserveData.ltv);
        console.log("- Liquidation Threshold:", reserveData.liquidationThreshold);
        
        // Check WETH balance
        const wethBalance = await weth.balanceOf(deployer.address);
        const totalSupply = await weth.totalSupply();
        console.log("\nWETH Data:");
        console.log("- User Balance:", ethers.formatEther(wethBalance));
        console.log("- Total Supply:", ethers.formatEther(totalSupply));
        
        // Analysis
        console.log("\n🔍 Analysis:");
        console.log("============");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        const collateralValue = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
        const reserveCash = parseFloat(ethers.formatEther(reserveData.reserveCash));
        
        console.log("1. Supply Balance:", supplyBalance, "WETH");
        console.log("2. Borrow Balance:", borrowBalance, "WETH");
        console.log("3. Collateral Value:", collateralValue, "USD");
        console.log("4. Reserve Cash:", reserveCash, "WETH");
        console.log("5. Is Borrowable:", reserveData.isBorrowable);
        
        // Check why borrow is not available
        if (reserveCash === 0) {
            console.log("❌ No reserve cash available for borrowing");
            console.log("💡 Solution: Add liquidity to the reserve");
        }
        
        if (!reserveData.isBorrowable) {
            console.log("❌ WETH is not configured as borrowable");
            console.log("💡 Solution: Configure WETH as borrowable asset");
        }
        
        if (collateralValue === 0) {
            console.log("❌ No collateral value");
            console.log("💡 Solution: Supply assets and enable as collateral");
        }
        
        if (borrowBalance > 1000000) {
            console.log("❌ Borrow balance is abnormally large:", borrowBalance);
            console.log("💡 This is likely a display bug in the frontend");
        }
        
        // Calculate available borrow
        if (collateralValue > 0 && reserveData.isBorrowable) {
            const maxBorrow = collateralValue * (reserveData.ltv / 10000);
            const availableBorrow = Math.min(maxBorrow, reserveCash * 1600); // Assuming $1600/WETH
            console.log("\n💰 Borrow Calculation:");
            console.log("=====================");
            console.log("Max Borrow (based on collateral):", maxBorrow, "USD");
            console.log("Available Borrow (based on reserve):", availableBorrow, "USD");
            console.log("Available Borrow in WETH:", availableBorrow / 1600, "WETH");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
