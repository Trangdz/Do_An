const { ethers } = require("ethers");

async function main() {
    console.log("🧪 Simple Borrow Test");
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
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        // Check current state
        console.log("📊 Current State:");
        console.log("=================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Is Collateral:", userReserve.isCollateral);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        
        // Analysis
        console.log("\n🔍 Analysis:");
        console.log("============");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const collateralValue = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
        
        if (supplyBalance > 0) {
            console.log("✅ You have supplied assets:", supplyBalance, "WETH");
        } else {
            console.log("❌ No assets supplied. You need to supply first!");
            console.log("💡 Solution: Supply WETH or other assets to use as collateral.");
        }
        
        if (collateralValue > 0) {
            console.log("✅ You have collateral value:", collateralValue, "USD");
        } else {
            console.log("❌ No collateral value. Assets may not be set as collateral.");
            console.log("💡 Solution: Check if your supplied assets are set as collateral.");
        }
        
        if (supplyBalance > 0 && collateralValue === 0) {
            console.log("⚠️  You have supplied assets but no collateral value!");
            console.log("💡 This means your assets are not set as collateral.");
            console.log("💡 You need to enable collateral for your supplied assets.");
        }
        
        if (supplyBalance > 0 && collateralValue > 0) {
            console.log("✅ You should be able to borrow!");
            console.log("💡 Try borrowing a small amount (e.g., 0.1 WETH)");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
