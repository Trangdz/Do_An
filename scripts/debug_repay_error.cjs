const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debug Repay Error");
    console.log("=" .repeat(40));
    
    const [deployer] = await ethers.getSigners();
    
    // Contract addresses
    const lendingPoolAddress = "0xbd7291F534fb3fDABF398a1D29D89Df2fe980d19";
    const usdcAddress = "0x4c763c7552204844f595aAE1C727698CF301B3F2";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ], deployer);
    
    console.log("\n📊 Current State");
    console.log("-".repeat(20));
    
    const userReserve = await lendingPool.userReserves(deployer.address, usdcAddress);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const allowance = await usdc.allowance(deployer.address, lendingPoolAddress);
    
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("USDC Supply:", ethers.formatEther(userReserve.supply.principal));
    console.log("USDC Borrow:", ethers.formatEther(userReserve.borrow.principal));
    console.log("USDC Allowance:", ethers.formatUnits(allowance, 6));
    
    console.log("\n📊 Reserve Data");
    console.log("-".repeat(20));
    
    const reserve = await lendingPool.reserves(usdcAddress);
    console.log("Reserve Cash:", ethers.formatEther(reserve.reserveCash));
    console.log("Total Debt:", ethers.formatEther(reserve.totalDebtPrincipal));
    console.log("Decimals:", reserve.decimals);
    
    console.log("\n📊 Test Different Repay Amounts");
    console.log("-".repeat(30));
    
    // Test 1: Repay with exact debt amount
    try {
        console.log("1. Testing repay with exact debt amount...");
        const exactAmount = ethers.parseUnits("1000", 6); // 1000 USDC
        
        // Approve exact amount
        await usdc.approve(lendingPoolAddress, exactAmount);
        console.log("✅ Approved exact amount");
        
        // Try to repay
        const repayTx = await lendingPool.repay(usdcAddress, exactAmount, deployer.address);
        await repayTx.wait();
        console.log("✅ Repay with exact amount successful!");
        
    } catch (error) {
        console.log("❌ Repay with exact amount failed:", error.message);
    }
    
    // Test 2: Repay with MaxUint256
    try {
        console.log("\n2. Testing repay with MaxUint256...");
        
        // Approve MaxUint256
        await usdc.approve(lendingPoolAddress, ethers.MaxUint256);
        console.log("✅ Approved MaxUint256");
        
        // Try to repay
        const repayTx = await lendingPool.repay(usdcAddress, ethers.MaxUint256, deployer.address);
        await repayTx.wait();
        console.log("✅ Repay with MaxUint256 successful!");
        
    } catch (error) {
        console.log("❌ Repay with MaxUint256 failed:", error.message);
        
        // Try to get more details about the error
        if (error.data) {
            console.log("Error data:", error.data);
        }
        
        // Check if it's a specific revert reason
        if (error.message.includes("Health factor too low")) {
            console.log("❌ Health factor too low");
        } else if (error.message.includes("Insufficient balance")) {
            console.log("❌ Insufficient balance");
        } else if (error.message.includes("Insufficient allowance")) {
            console.log("❌ Insufficient allowance");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("❌ Invalid amount");
        } else {
            console.log("❌ Unknown error:", error.message);
        }
    }
    
    console.log("\n📊 Final State");
    console.log("-".repeat(20));
    
    const userReserveFinal = await lendingPool.userReserves(deployer.address, usdcAddress);
    const usdcBalanceFinal = await usdc.balanceOf(deployer.address);
    
    console.log("USDC Balance:", ethers.formatUnits(usdcBalanceFinal, 6));
    console.log("USDC Supply:", ethers.formatEther(userReserveFinal.supply.principal));
    console.log("USDC Borrow:", ethers.formatEther(userReserveFinal.borrow.principal));
    
    if (userReserveFinal.borrow.principal === 0n) {
        console.log("✅ Debt fully repaid!");
    } else {
        console.log("❌ Debt still exists:", ethers.formatEther(userReserveFinal.borrow.principal));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
