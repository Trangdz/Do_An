const { ethers } = require("ethers");

async function main() {
    console.log("🔧 Fix Contract Bug");
    console.log("==================");
    
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
        console.log("📊 Current State (Before Fix):");
        console.log("=============================");
        
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        const reserveData = await pool.reserves(wethAddress);
        
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Total Debt:", ethers.formatEther(reserveData.totalDebt));
        console.log("Utilization:", ethers.formatUnits(reserveData.utilizationWad, 18), "%");
        
        console.log("\n🔍 Problem Analysis:");
        console.log("===================");
        
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        const utilization = parseFloat(ethers.formatUnits(reserveData.utilizationWad, 18));
        
        if (borrowBalance > 1000000) {
            console.log("❌ Borrow balance is corrupted:", borrowBalance);
            console.log("💡 This is definitely a contract bug");
        }
        
        if (utilization > 100) {
            console.log("❌ Utilization is corrupted:", utilization, "%");
            console.log("💡 This indicates serious contract issues");
        }
        
        console.log("\n🔧 Recommended Solutions:");
        console.log("=========================");
        
        console.log("1. 🚨 IMMEDIATE ACTION: Redeploy contracts");
        console.log("   - Stop using current contracts");
        console.log("   - Deploy fresh contracts");
        console.log("   - This will reset all corrupted state");
        
        console.log("\n2. 🔍 Debug contract logic:");
        console.log("   - Check lend() function implementation");
        console.log("   - Check userReserves mapping logic");
        console.log("   - Check reserve data calculations");
        
        console.log("\n3. 🧪 Test with fresh deployment:");
        console.log("   - Deploy new contracts");
        console.log("   - Test supply functionality");
        console.log("   - Verify borrow balance doesn't increase");
        
        console.log("\n4. 📱 Frontend fixes:");
        console.log("   - Add validation for abnormal values");
        console.log("   - Show error messages for corrupted data");
        console.log("   - Implement data sanity checks");
        
        console.log("\n⚠️  WARNING:");
        console.log("===========");
        console.log("Current contract state is corrupted!");
        console.log("Do NOT use for production!");
        console.log("Redeploy contracts immediately!");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

