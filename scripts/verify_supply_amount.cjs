const { ethers } = require("ethers");

async function main() {
    console.log("✅ Verify Supply Amount");
    console.log("=======================");
    
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
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        
        console.log("📊 Current State:");
        console.log("=================");
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        
        // Calculate what frontend should show
        const suppliedAmount = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        
        console.log("\n📱 Frontend Should Display:");
        console.log("==========================");
        console.log("Supplied Amount:", suppliedAmount, "WETH");
        
        if (suppliedAmount === 2.0) {
            console.log("✅ Perfect! Supply amount is exactly 2 WETH");
        } else if (suppliedAmount > 0) {
            console.log("⚠️  Supply amount is", suppliedAmount, "WETH (not exactly 2)");
        } else {
            console.log("❌ No supply found. Please supply 2 WETH first.");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
