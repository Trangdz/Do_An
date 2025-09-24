const { ethers } = require("ethers");

async function main() {
    console.log("🌐 Frontend Ganache Test");
    console.log("=========================");
    
    // Connect to Ganache (same as frontend)
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses (same as frontend config)
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // ABI that frontend should use
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Testing account:", deployer.address);
    
    try {
        // Simulate frontend data fetching
        console.log("\n📊 Fetching User Assets (Wallet Balance)");
        console.log("=========================================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        console.log("WETH Wallet Balance:", ethers.formatEther(wethBalance));
        
        console.log("\n📊 Fetching Supply Assets (Supplied Amount)");
        console.log("===========================================");
        
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const supplyBalance = ethers.formatUnits(userReserve.supplyBalance1e18, 18);
        const borrowBalance = ethers.formatUnits(userReserve.borrowBalance1e18, 18);
        
        console.log("Supply Balance:", supplyBalance);
        console.log("Borrow Balance:", borrowBalance);
        console.log("Is Collateral:", userReserve.isCollateral);
        
        // This is what frontend should display
        console.log("\n📱 Frontend Should Display:");
        console.log("==========================");
        console.log("Wallet: ", ethers.formatEther(wethBalance), "WETH");
        
        if (parseFloat(supplyBalance) > 0) {
            console.log("Supplied: ", supplyBalance, "WETH ✅");
        } else {
            console.log("Supplied: 0 WETH ❌");
        }
        
        if (parseFloat(borrowBalance) > 0) {
            console.log("Borrowed: ", borrowBalance, "WETH");
        } else {
            console.log("Borrowed: 0 WETH");
        }
        
        console.log("\n✅ Test Complete!");
        console.log("Frontend should now show the correct supplied amount.");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
