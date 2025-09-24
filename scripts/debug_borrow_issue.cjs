const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Debug Borrow Issue");
    console.log("======================");
    
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
        'function borrow(address asset, uint256 amount) external',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Account:", deployer.address);
    
    try {
        // Check current state
        console.log("\n📊 Current Account State:");
        console.log("=========================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Is Collateral:", userReserve.isCollateral);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
        
        // Check reserve data
        console.log("\n📊 Reserve Data:");
        console.log("================");
        
        const reserveData = await pool.reserves(wethAddress);
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Total Debt:", ethers.formatEther(reserveData.totalDebt));
        console.log("Utilization:", ethers.formatUnits(reserveData.utilizationWad, 18));
        console.log("Is Borrowable:", reserveData.isBorrowable);
        console.log("LTV:", reserveData.ltv);
        console.log("Liquidation Threshold:", reserveData.liquidationThreshold);
        
        // Analyze borrow eligibility
        console.log("\n🔍 Borrow Eligibility Analysis:");
        console.log("===============================");
        
        const collateralValue = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
        const debtValue = parseFloat(ethers.formatEther(accountData.debtValue1e18));
        const healthFactor = parseFloat(ethers.formatEther(accountData.healthFactor1e18));
        
        console.log("1. Collateral Value:", collateralValue, "USD");
        console.log("2. Current Debt:", debtValue, "USD");
        console.log("3. Health Factor:", healthFactor);
        console.log("4. Is Borrowable:", reserveData.isBorrowable);
        
        // Check if user has collateral
        if (collateralValue === 0) {
            console.log("❌ No collateral found! You need to supply assets first.");
            console.log("💡 Solution: Supply WETH or other assets to use as collateral.");
        } else {
            console.log("✅ Collateral found:", collateralValue, "USD");
        }
        
        // Check if asset is borrowable
        if (!reserveData.isBorrowable) {
            console.log("❌ WETH is not borrowable in this reserve!");
            console.log("💡 Solution: Check if WETH is configured as borrowable asset.");
        } else {
            console.log("✅ WETH is borrowable");
        }
        
        // Check health factor
        if (healthFactor < 1.1) {
            console.log("❌ Health factor too low:", healthFactor);
            console.log("💡 Solution: Reduce debt or add more collateral.");
        } else {
            console.log("✅ Health factor is safe:", healthFactor);
        }
        
        // Calculate max borrow amount
        if (collateralValue > 0 && reserveData.isBorrowable) {
            const maxBorrow = collateralValue * (reserveData.ltv / 10000);
            console.log("\n💰 Max Borrow Calculation:");
            console.log("==========================");
            console.log("Collateral Value:", collateralValue, "USD");
            console.log("LTV:", reserveData.ltv / 100, "%");
            console.log("Max Borrow:", maxBorrow, "USD");
            console.log("Max Borrow in WETH:", maxBorrow / 1600, "WETH (assuming $1600/WETH)");
        }
        
        // Test small borrow
        console.log("\n🧪 Testing Small Borrow:");
        console.log("========================");
        
        try {
            const testBorrowAmount = ethers.parseEther("0.1"); // 0.1 WETH
            console.log("Attempting to borrow 0.1 WETH...");
            
            const borrowTx = await pool.borrow(wethAddress, testBorrowAmount);
            const borrowReceipt = await borrowTx.wait();
            console.log("✅ Borrow successful:", borrowReceipt.transactionHash);
            
            // Check new state
            const newUserReserve = await pool.userReserves(deployer.address, wethAddress);
            const newAccountData = await pool.getAccountData(deployer.address);
            
            console.log("New Borrow Balance:", ethers.formatUnits(newUserReserve.borrowBalance1e18, 18));
            console.log("New Debt Value:", ethers.formatEther(newAccountData.debtValue1e18));
            console.log("New Health Factor:", ethers.formatEther(newAccountData.healthFactor1e18));
            
        } catch (borrowError) {
            console.log("❌ Borrow failed:", borrowError.message);
            console.log("💡 This explains why you can't borrow!");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
