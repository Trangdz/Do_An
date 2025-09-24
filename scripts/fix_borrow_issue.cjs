const { ethers } = require("ethers");

async function main() {
    console.log("🔧 Fix Borrow Issue");
    console.log("===================");
    
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
        'function lend(address asset, uint256 amount) external',
        'function borrow(address asset, uint256 amount) external'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Account:", deployer.address);
    
    try {
        // Step 1: Supply WETH first (to create collateral)
        console.log("\n📊 Step 1: Supply WETH for Collateral");
        console.log("=====================================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        console.log("Current WETH Balance:", ethers.formatEther(wethBalance));
        
        if (parseFloat(ethers.formatEther(wethBalance)) >= 2) {
            console.log("Supplying 2 WETH...");
            
            // Approve WETH
            const approveTx = await weth.approve(lendingPoolAddress, ethers.parseEther("2.0"));
            await approveTx.wait();
            console.log("✅ WETH approved");
            
            // Supply WETH
            const lendTx = await pool.lend(wethAddress, ethers.parseEther("2.0"));
            const lendReceipt = await lendTx.wait();
            console.log("✅ Supply successful:", lendReceipt.transactionHash);
            
            // Check new state
            const newWethBalance = await weth.balanceOf(deployer.address);
            const newUserReserve = await pool.userReserves(deployer.address, wethAddress);
            const newAccountData = await pool.getAccountData(deployer.address);
            
            console.log("\n📊 State After Supply:");
            console.log("======================");
            console.log("WETH Balance:", ethers.formatEther(newWethBalance));
            console.log("Supply Balance:", ethers.formatUnits(newUserReserve.supplyBalance1e18, 18));
            console.log("Collateral Value:", ethers.formatEther(newAccountData.collateralValue1e18));
            console.log("Is Collateral:", newUserReserve.isCollateral);
            
            // Step 2: Try to borrow
            console.log("\n📊 Step 2: Try to Borrow");
            console.log("========================");
            
            if (parseFloat(ethers.formatEther(newAccountData.collateralValue1e18)) > 0) {
                console.log("✅ Collateral found! Trying to borrow...");
                
                try {
                    const borrowAmount = ethers.parseEther("0.5"); // 0.5 WETH
                    console.log("Attempting to borrow 0.5 WETH...");
                    
                    const borrowTx = await pool.borrow(wethAddress, borrowAmount);
                    const borrowReceipt = await borrowTx.wait();
                    console.log("✅ Borrow successful:", borrowReceipt.transactionHash);
                    
                    // Check final state
                    const finalUserReserve = await pool.userReserves(deployer.address, wethAddress);
                    const finalAccountData = await pool.getAccountData(deployer.address);
                    
                    console.log("\n📊 Final State:");
                    console.log("================");
                    console.log("Supply Balance:", ethers.formatUnits(finalUserReserve.supplyBalance1e18, 18));
                    console.log("Borrow Balance:", ethers.formatUnits(finalUserReserve.borrowBalance1e18, 18));
                    console.log("Collateral Value:", ethers.formatEther(finalAccountData.collateralValue1e18));
                    console.log("Debt Value:", ethers.formatEther(finalAccountData.debtValue1e18));
                    console.log("Health Factor:", ethers.formatEther(finalAccountData.healthFactor1e18));
                    
                } catch (borrowError) {
                    console.log("❌ Borrow still failed:", borrowError.message);
                    console.log("💡 This indicates a contract issue, not a user issue.");
                }
                
            } else {
                console.log("❌ Still no collateral value. Contract may have issues.");
            }
            
        } else {
            console.log("❌ Insufficient WETH balance for supply");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
