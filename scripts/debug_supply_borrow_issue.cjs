const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Debug Supply-Borrow Issue");
    console.log("============================");
    
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
        console.log("📊 Step 1: Check Current State");
        console.log("=============================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        const reserveData = await pool.reserves(wethAddress);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Is Collateral:", userReserve.isCollateral);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Total Debt:", ethers.formatEther(reserveData.totalDebt));
        
        // Analysis
        console.log("\n🔍 Analysis:");
        console.log("============");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        
        console.log("Supply Balance:", supplyBalance, "WETH");
        console.log("Borrow Balance:", borrowBalance, "WETH");
        
        if (borrowBalance > 1000000) {
            console.log("❌ Borrow balance is abnormally large!");
            console.log("💡 This suggests a bug in the contract or data storage");
        }
        
        if (supplyBalance > 0 && borrowBalance > 0) {
            console.log("⚠️  Both supply and borrow have values");
            console.log("💡 This could indicate a data corruption issue");
        }
        
        // Check if this is a display issue
        console.log("\n📱 Frontend Display Analysis:");
        console.log("=============================");
        
        console.log("What frontend should show:");
        console.log("- Supplied:", supplyBalance, "WETH");
        console.log("- Borrowed:", borrowBalance, "WETH");
        
        if (supplyBalance > 0 && borrowBalance > 0) {
            console.log("❌ This is wrong! Supply should not create borrow balance");
            console.log("💡 Possible causes:");
            console.log("1. Contract bug in lend() function");
            console.log("2. Data corruption in userReserves mapping");
            console.log("3. Frontend display bug");
            console.log("4. Contract state corruption");
        }
        
        // Check reserve data for anomalies
        console.log("\n📊 Reserve Data Analysis:");
        console.log("=========================");
        
        const reserveCash = parseFloat(ethers.formatEther(reserveData.reserveCash));
        const totalDebt = parseFloat(ethers.formatEther(reserveData.totalDebt));
        const utilization = parseFloat(ethers.formatUnits(reserveData.utilizationWad, 18));
        
        console.log("Reserve Cash:", reserveCash, "WETH");
        console.log("Total Debt:", totalDebt, "WETH");
        console.log("Utilization:", utilization, "%");
        
        if (utilization > 100) {
            console.log("❌ Utilization is over 100%!");
            console.log("💡 This indicates a serious contract issue");
        }
        
        if (totalDebt > 1000000) {
            console.log("❌ Total debt is abnormally large!");
            console.log("💡 This suggests data corruption");
        }
        
        // Check if this is a known issue
        console.log("\n🔧 Potential Solutions:");
        console.log("=======================");
        
        if (borrowBalance > 1000000) {
            console.log("1. Reset contract state (redeploy)");
            console.log("2. Check contract logic for lend() function");
            console.log("3. Verify userReserves mapping is correct");
            console.log("4. Check if there's a bug in the contract");
        }
        
        if (supplyBalance > 0 && borrowBalance > 0) {
            console.log("5. This is definitely a contract bug");
            console.log("6. Supply should only increase supplyBalance");
            console.log("7. Borrow should only increase borrowBalance");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

