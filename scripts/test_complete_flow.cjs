const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Complete Flow - State Tracking");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Get contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Create contract instances
    const lendingPoolABI = [
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function lend(address asset, uint256 amount)',
        'function withdraw(address asset, uint256 requested) returns (uint256 amount1e18)',
        'function borrow(address asset, uint256 amount)',
        'function repay(address asset, uint256 amount, address onBehalfOf) returns (uint256)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount)',
        'function allowance(address owner, address spender) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, lendingPoolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("\n📊 Initial State Check");
    console.log("======================");
    
    // Check initial WETH balance
    const initialBalance = await weth.balanceOf(deployer.address);
    console.log("Initial WETH Balance:", ethers.formatEther(initialBalance));
    
    // Check initial account data
    const initialAccountData = await pool.getAccountData(deployer.address);
    console.log("Initial Collateral Value:", ethers.formatEther(initialAccountData.collateralValue1e18));
    console.log("Initial Debt Value:", ethers.formatEther(initialAccountData.debtValue1e18));
    console.log("Initial Health Factor:", ethers.formatEther(initialAccountData.healthFactor1e18));
    
    console.log("\n🔄 Test 1: Lend WETH");
    console.log("====================");
    
    try {
        // Approve WETH for lending pool
        const lendAmount = ethers.parseEther("5.0");
        console.log("Approving WETH...");
        const approveTx = await weth.approve(lendingPoolAddress, lendAmount);
        await approveTx.wait();
        console.log("✅ WETH approved");
        
        // Lend WETH
        console.log("Lending 5 WETH...");
        const lendTx = await pool.lend(wethAddress, lendAmount);
        const lendReceipt = await lendTx.wait();
        console.log("✅ Lend transaction successful:", lendReceipt.transactionHash);
        
        // Check state after lend
        const afterLendAccountData = await pool.getAccountData(deployer.address);
        console.log("After Lend - Collateral Value:", ethers.formatEther(afterLendAccountData.collateralValue1e18));
        console.log("After Lend - Debt Value:", ethers.formatEther(afterLendAccountData.debtValue1e18));
        console.log("After Lend - Health Factor:", ethers.formatEther(afterLendAccountData.healthFactor1e18));
        
        const afterLendBalance = await weth.balanceOf(deployer.address);
        console.log("After Lend - Wallet Balance:", ethers.formatEther(afterLendBalance));
        
    } catch (error) {
        console.error("❌ Lend test failed:", error.message);
    }
    
    console.log("\n🔄 Test 2: Borrow WETH");
    console.log("======================");
    
    try {
        // Borrow WETH
        const borrowAmount = ethers.parseEther("2.0");
        console.log("Borrowing 2 WETH...");
        const borrowTx = await pool.borrow(wethAddress, borrowAmount);
        const borrowReceipt = await borrowTx.wait();
        console.log("✅ Borrow transaction successful:", borrowReceipt.transactionHash);
        
        // Check state after borrow
        const afterBorrowAccountData = await pool.getAccountData(deployer.address);
        console.log("After Borrow - Collateral Value:", ethers.formatEther(afterBorrowAccountData.collateralValue1e18));
        console.log("After Borrow - Debt Value:", ethers.formatEther(afterBorrowAccountData.debtValue1e18));
        console.log("After Borrow - Health Factor:", ethers.formatEther(afterBorrowAccountData.healthFactor1e18));
        
        const afterBorrowBalance = await weth.balanceOf(deployer.address);
        console.log("After Borrow - Wallet Balance:", ethers.formatEther(afterBorrowBalance));
        
    } catch (error) {
        console.error("❌ Borrow test failed:", error.message);
    }
    
    console.log("\n🔄 Test 3: Repay WETH");
    console.log("=====================");
    
    try {
        // Repay WETH
        const repayAmount = ethers.parseEther("1.0");
        console.log("Repaying 1 WETH...");
        const repayTx = await pool.repay(wethAddress, repayAmount, deployer.address);
        const repayReceipt = await repayTx.wait();
        console.log("✅ Repay transaction successful:", repayReceipt.transactionHash);
        
        // Check state after repay
        const afterRepayAccountData = await pool.getAccountData(deployer.address);
        console.log("After Repay - Collateral Value:", ethers.formatEther(afterRepayAccountData.collateralValue1e18));
        console.log("After Repay - Debt Value:", ethers.formatEther(afterRepayAccountData.debtValue1e18));
        console.log("After Repay - Health Factor:", ethers.formatEther(afterRepayAccountData.healthFactor1e18));
        
        const afterRepayBalance = await weth.balanceOf(deployer.address);
        console.log("After Repay - Wallet Balance:", ethers.formatEther(afterRepayBalance));
        
    } catch (error) {
        console.error("❌ Repay test failed:", error.message);
    }
    
    console.log("\n🔄 Test 4: Withdraw WETH");
    console.log("=======================");
    
    try {
        // Withdraw WETH
        const withdrawAmount = ethers.parseEther("1.0");
        console.log("Withdrawing 1 WETH...");
        const withdrawTx = await pool.withdraw(wethAddress, withdrawAmount);
        const withdrawReceipt = await withdrawTx.wait();
        console.log("✅ Withdraw transaction successful:", withdrawReceipt.transactionHash);
        
        // Check state after withdraw
        const afterWithdrawAccountData = await pool.getAccountData(deployer.address);
        console.log("After Withdraw - Collateral Value:", ethers.formatEther(afterWithdrawAccountData.collateralValue1e18));
        console.log("After Withdraw - Debt Value:", ethers.formatEther(afterWithdrawAccountData.debtValue1e18));
        console.log("After Withdraw - Health Factor:", ethers.formatEther(afterWithdrawAccountData.healthFactor1e18));
        
        const afterWithdrawBalance = await weth.balanceOf(deployer.address);
        console.log("After Withdraw - Wallet Balance:", ethers.formatEther(afterWithdrawBalance));
        
    } catch (error) {
        console.error("❌ Withdraw test failed:", error.message);
    }
    
    console.log("\n📊 Final State Summary");
    console.log("=====================");
    
    const finalAccountData = await pool.getAccountData(deployer.address);
    const finalBalance = await weth.balanceOf(deployer.address);
    
    console.log("Final Wallet Balance:", ethers.formatEther(finalBalance));
    console.log("Final Collateral Value:", ethers.formatEther(finalAccountData.collateralValue1e18));
    console.log("Final Debt Value:", ethers.formatEther(finalAccountData.debtValue1e18));
    console.log("Final Health Factor:", ethers.formatEther(finalAccountData.healthFactor1e18));
    
    console.log("\n✅ Complete Flow Test Finished!");
    console.log("All transactions should be reflected in the blockchain state.");
    console.log("Check the frontend to see if UI updates correctly.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
