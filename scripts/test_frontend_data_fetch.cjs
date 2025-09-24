const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Testing Frontend Data Fetch on Ganache");
    console.log("==========================================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    console.log("Testing with account:", deployer.address);
    
    // Get contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Create contract instances
    const lendingPoolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, lendingPoolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("\n📊 Current State Check");
    console.log("======================");
    
    try {
        // Check WETH balance
        const wethBalance = await weth.balanceOf(deployer.address);
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        
        // Check account data
        const accountData = await pool.getAccountData(deployer.address);
        console.log("Account Data:");
        console.log("- Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("- Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("- Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
        
        // Check user reserve data (this is what frontend should use)
        console.log("\n🔍 Testing userReserves (Frontend Function)");
        console.log("===========================================");
        
        const userReserveData = await pool.userReserves(deployer.address, wethAddress);
        console.log("User Reserve Data for WETH:");
        console.log("- Supply Balance:", ethers.formatEther(userReserveData.supplyBalance1e18));
        console.log("- Borrow Balance:", ethers.formatEther(userReserveData.borrowBalance1e18));
        console.log("- Is Collateral:", userReserveData.isCollateral);
        
        // This should match what frontend sees
        console.log("\n📱 Frontend Should Display:");
        console.log("==========================");
        console.log("Wallet Balance:", ethers.formatEther(wethBalance));
        console.log("Supplied Amount:", ethers.formatEther(userReserveData.supplyBalance1e18));
        console.log("Borrowed Amount:", ethers.formatEther(userReserveData.borrowBalance1e18));
        
        if (parseFloat(ethers.formatEther(userReserveData.supplyBalance1e18)) > 0) {
            console.log("✅ Supply data found - Frontend should show supplied amount");
        } else {
            console.log("❌ No supply data - Frontend will show 0 WETH supplied");
        }
        
    } catch (error) {
        console.error("❌ Error testing data fetch:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
