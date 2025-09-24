const { ethers } = require("hardhat");

async function main() {
    console.log("🌐 Frontend Integration Test");
    console.log("============================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Get contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Create contract instances
    const lendingPoolABI = [
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function lend(address asset, uint256 amount)',
        'function withdraw(address asset, uint256 requested) returns (uint256 amount1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, lendingPoolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("\n📊 Current State (for Frontend)");
    console.log("===============================");
    
    // Check current balances and states
    const wethBalance = await weth.balanceOf(deployer.address);
    const accountData = await pool.getAccountData(deployer.address);
    
    console.log("WETH Wallet Balance:", ethers.formatEther(wethBalance));
    console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
    console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
    console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
    
    console.log("\n🔄 Simulate Frontend Transaction");
    console.log("===============================");
    
    try {
        // Simulate a small lend transaction
        const lendAmount = ethers.parseEther("1.0");
        
        console.log("1. Approving WETH...");
        const approveTx = await weth.approve(lendingPoolAddress, lendAmount);
        await approveTx.wait();
        console.log("✅ Approval successful");
        
        console.log("2. Lending 1 WETH...");
        const lendTx = await pool.lend(wethAddress, lendAmount);
        const lendReceipt = await lendTx.wait();
        console.log("✅ Lend successful, tx:", lendReceipt.transactionHash);
        
        console.log("\n📊 Updated State (should reflect in Frontend)");
        console.log("=============================================");
        
        // Check updated state
        const newWethBalance = await weth.balanceOf(deployer.address);
        const newAccountData = await pool.getAccountData(deployer.address);
        
        console.log("Updated WETH Wallet Balance:", ethers.formatEther(newWethBalance));
        console.log("Updated Collateral Value:", ethers.formatEther(newAccountData.collateralValue1e18));
        console.log("Updated Debt Value:", ethers.formatEther(newAccountData.debtValue1e18));
        console.log("Updated Health Factor:", ethers.formatEther(newAccountData.healthFactor1e18));
        
        console.log("\n📈 Changes Detected:");
        console.log("====================");
        console.log("WETH Balance Change:", ethers.formatEther(wethBalance - newWethBalance));
        console.log("Collateral Value Change:", ethers.formatEther(newAccountData.collateralValue1e18 - accountData.collateralValue1e18));
        
        console.log("\n✅ Frontend Integration Test Complete!");
        console.log("The frontend should now show:");
        console.log("- Updated WETH wallet balance");
        console.log("- Updated supplied amount in 'Supplied' section");
        console.log("- All debug logs should show the transaction");
        
    } catch (error) {
        console.error("❌ Frontend test failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
