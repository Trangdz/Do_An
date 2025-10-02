const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay All functionality");
    console.log("=" .repeat(50));
    
    const [deployer] = await ethers.getSigners();
    
    // Contract addresses (from addresses.js)
    const lendingPoolAddress = "0xbd7291F534fb3fDABF398a1D29D89Df2fe980d19";
    const usdcAddress = "0x4c763c7552204844f595aAE1C727698CF301B3F2";
    const wethAddress = "0x7c2f5AC96F5d9C5CCfFA852cf384a0F298FF1254";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const weth = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    console.log("\n📊 STEP 1: Check initial state");
    console.log("-".repeat(30));
    
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    
    console.log("\n📊 STEP 2: Supply WETH as collateral");
    console.log("-".repeat(30));
    
    try {
        const supplyAmount = ethers.parseEther("100"); // 100 WETH
        
        // Approve WETH
        console.log("Approving WETH...");
        const approveTx = await weth.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ WETH approved");
        
        // Supply WETH
        console.log("Supplying 100 WETH...");
        const supplyTx = await lendingPool.lend(wethAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ WETH supplied");
        
    } catch (error) {
        console.log("❌ Error supplying WETH:", error.message);
    }
    
    console.log("\n📊 STEP 3: Supply USDC to pool");
    console.log("-".repeat(30));
    
    try {
        const supplyAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        
        // Approve USDC
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ USDC approved");
        
        // Supply USDC
        console.log("Supplying 10,000 USDC...");
        const supplyTx = await lendingPool.lend(usdcAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ USDC supplied");
        
    } catch (error) {
        console.log("❌ Error supplying USDC:", error.message);
    }
    
    console.log("\n📊 STEP 4: Borrow USDC");
    console.log("-".repeat(30));
    
    try {
        const borrowAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
        
        console.log("Borrowing 1,000 USDC...");
        const borrowTx = await lendingPool.borrow(usdcAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ USDC borrowed");
        
    } catch (error) {
        console.log("❌ Error borrowing USDC:", error.message);
    }
    
    console.log("\n📊 STEP 5: Check debt before repay");
    console.log("-".repeat(30));
    
    try {
        const userReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(userReserve.supply.principal));
        console.log("USDC Borrow:", ethers.formatEther(userReserve.borrow.principal));
        
        const usdcBalanceAfterBorrow = await usdc.balanceOf(deployer.address);
        console.log("USDC Balance after borrow:", ethers.formatUnits(usdcBalanceAfterBorrow, 6));
        
    } catch (error) {
        console.log("❌ Error checking user reserves:", error.message);
    }
    
    console.log("\n📊 STEP 6: Test Repay All (Max Uint256)");
    console.log("-".repeat(30));
    
    try {
        // Approve max uint256
        console.log("Approving max uint256 for USDC...");
        const approveTx = await usdc.approve(lendingPoolAddress, ethers.MaxUint256);
        await approveTx.wait();
        console.log("✅ USDC approved for max amount");
        
        // Repay with max uint256 (contract will cap to actual debt)
        console.log("Repaying with max uint256...");
        const repayTx = await lendingPool.repay(usdcAddress, ethers.MaxUint256, deployer.address);
        const receipt = await repayTx.wait();
        console.log("✅ Repay transaction successful!");
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
        console.log("❌ Error repaying:", error.message);
    }
    
    console.log("\n📊 STEP 7: Check debt after repay");
    console.log("-".repeat(30));
    
    try {
        const userReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(userReserve.supply.principal));
        console.log("USDC Borrow:", ethers.formatEther(userReserve.borrow.principal));
        
        const usdcBalanceAfterRepay = await usdc.balanceOf(deployer.address);
        console.log("USDC Balance after repay:", ethers.formatUnits(usdcBalanceAfterRepay, 6));
        
        if (userReserve.borrow.principal === 0n) {
            console.log("✅ Debt fully repaid!");
        } else {
            console.log("❌ Debt still exists:", ethers.formatEther(userReserve.borrow.principal));
        }
        
    } catch (error) {
        console.log("❌ Error checking user reserves:", error.message);
    }
    
    console.log("\n🎉 Test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
