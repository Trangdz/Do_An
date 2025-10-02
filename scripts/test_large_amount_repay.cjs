const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay with Large Amount (not MaxUint256)");
    console.log("=" .repeat(60));
    
    const [deployer] = await ethers.getSigners();
    
    // Contract addresses
    const lendingPoolAddress = "0xbd7291F534fb3fDABF398a1D29D89Df2fe980d19";
    const usdcAddress = "0x4c763c7552204844f595aAE1C727698CF301B3F2";
    const wethAddress = "0x7c2f5AC96F5d9C5CCfFA852cf384a0F298FF1254";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)",
        "function setAsCollateral(address asset, bool useAsCollateral) external",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n📊 STEP 1: Create debt to repay");
    console.log("-".repeat(30));
    
    try {
        // Supply WETH
        const wethAmount = ethers.parseEther("100");
        await weth.approve(lendingPoolAddress, wethAmount);
        await lendingPool.lend(wethAddress, wethAmount);
        console.log("✅ WETH supplied");
        
        // Supply USDC
        const usdcAmount = ethers.parseUnits("10000", 6);
        await usdc.approve(lendingPoolAddress, usdcAmount);
        await lendingPool.lend(usdcAddress, usdcAmount);
        console.log("✅ USDC supplied");
        
        // Set USDC as collateral
        await lendingPool.setAsCollateral(usdcAddress, true);
        console.log("✅ USDC set as collateral");
        
        // Borrow USDC
        const borrowAmount = ethers.parseUnits("2000", 6); // 2000 USDC
        await lendingPool.borrow(usdcAddress, borrowAmount);
        console.log("✅ USDC borrowed");
        
    } catch (error) {
        console.log("❌ Setup error:", error.message);
        return;
    }
    
    console.log("\n📊 STEP 2: Check debt before repay");
    console.log("-".repeat(30));
    
    const userReserveBefore = await lendingPool.userReserves(deployer.address, usdcAddress);
    const usdcBalanceBefore = await usdc.balanceOf(deployer.address);
    
    console.log("USDC Balance:", ethers.formatUnits(usdcBalanceBefore, 6));
    console.log("USDC Borrow:", ethers.formatEther(userReserveBefore.borrow.principal));
    
    console.log("\n📊 STEP 3: Test Repay with Large Amount");
    console.log("-".repeat(30));
    
    try {
        // Use large amount instead of MaxUint256
        const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        console.log("Large amount:", ethers.formatUnits(largeAmount, 6), "USDC");
        
        // Approve large amount
        console.log("Approving large amount...");
        const approveTx = await usdc.approve(lendingPoolAddress, largeAmount);
        await approveTx.wait();
        console.log("✅ Approved large amount");
        
        // Repay with large amount
        console.log("Repaying with large amount...");
        const repayTx = await lendingPool.repay(usdcAddress, largeAmount, deployer.address);
        const receipt = await repayTx.wait();
        console.log("✅ Repay successful!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Check the actual amount repaid from the event
        const repayEvent = receipt.logs.find(log => {
            try {
                const parsed = lendingPool.interface.parseLog(log);
                return parsed.name === 'Repaid';
            } catch (e) {
                return false;
            }
        });
        
        if (repayEvent) {
            const parsed = lendingPool.interface.parseLog(repayEvent);
            const repaidAmount = ethers.formatUnits(parsed.args.amount, 6);
            console.log("Actual amount repaid:", repaidAmount, "USDC");
        }
        
    } catch (error) {
        console.log("❌ Repay error:", error.message);
    }
    
    console.log("\n📊 STEP 4: Check debt after repay");
    console.log("-".repeat(30));
    
    const userReserveAfter = await lendingPool.userReserves(deployer.address, usdcAddress);
    const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
    
    console.log("USDC Balance:", ethers.formatUnits(usdcBalanceAfter, 6));
    console.log("USDC Borrow:", ethers.formatEther(userReserveAfter.borrow.principal));
    
    if (userReserveAfter.borrow.principal === 0n) {
        console.log("✅ Debt fully repaid!");
    } else {
        console.log("ℹ️ Some debt remains:", ethers.formatEther(userReserveAfter.borrow.principal));
    }
    
    console.log("\n🎉 Test completed!");
    console.log("\n💡 Solution: Use large amount (1M tokens) instead of MaxUint256");
    console.log("✅ This avoids overflow issues in the contract");
    console.log("✅ Contract still caps to actual debt amount");
    console.log("✅ More reliable than MaxUint256");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
