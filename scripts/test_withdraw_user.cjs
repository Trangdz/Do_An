const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing withdraw with user address, deployer:", deployer.address);
    
    // User address from error message
    const userAddress = "0xd9b7fc43b964a38f1683d6a84e9e027f3b3a4494";
    
    // Contract addresses
    const lendingPoolAddress = "0xF4C1C75D3B446b3Baa6D3F8259e3A20cf0825100";
    const usdcAddress = "0xf09Cd31aECB6B86661e10Dd7308b9fF183346A7d";
    const wethAddress = "0xC9CE6c273F233dbcFbA4D279D96BB3ea288dbcBf";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)"
    ], deployer);
    
    console.log("\n=== Check User State ===");
    
    try {
        // Check user reserves
        const usdcUserReserve = await lendingPool.userReserves(userAddress, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
        
        // Check USDC balance
        const usdcBalance = await usdc.balanceOf(userAddress);
        console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
        
        // Check if user has supply
        const supplyAmount = parseFloat(ethers.formatEther(usdcUserReserve.supply.principal));
        if (supplyAmount < 10) {
            console.log("❌ User doesn't have enough USDC supply to withdraw 10 USDC");
            console.log("Current supply:", supplyAmount, "USDC");
            return;
        }
        
    } catch (error) {
        console.log("❌ Error checking user state:", error.message);
        return;
    }
    
    console.log("\n=== Test Withdraw ===");
    
    try {
        const withdrawAmount = ethers.parseUnits("10", 6); // 10 USDC
        
        console.log("Withdrawing 10 USDC for user:", userAddress);
        console.log("Withdraw amount (6 decimals):", ethers.formatUnits(withdrawAmount, 6));
        console.log("Withdraw amount (hex):", "0x" + withdrawAmount.toString(16));
        
        // Try to estimate gas
        console.log("Estimating gas...");
        const gasEstimate = await lendingPool.withdraw.estimateGas(usdcAddress, withdrawAmount);
        console.log("Gas Estimate:", gasEstimate.toString());
        
        // Try to call static
        console.log("Calling static...");
        const result = await lendingPool.withdraw.staticCall(usdcAddress, withdrawAmount);
        console.log("Static call result:", result.toString());
        
        // Try actual withdraw
        console.log("Attempting withdraw...");
        const withdrawTx = await lendingPool.withdraw(usdcAddress, withdrawAmount);
        await withdrawTx.wait();
        console.log("✅ Withdraw successful!");
        
        // Check balances after withdraw
        const usdcBalanceAfter = await usdc.balanceOf(userAddress);
        console.log("USDC Balance after withdraw:", ethers.formatUnits(usdcBalanceAfter, 6));
        
    } catch (error) {
        console.log("❌ Withdraw failed:", error.message);
        
        // Try to decode revert reason
        if (error.data) {
            console.log("Error data:", error.data);
        }
        
        // Check if it's a specific revert
        if (error.message.includes("Health factor too low")) {
            console.log("❌ Health factor too low");
        } else if (error.message.includes("Insufficient balance")) {
            console.log("❌ Insufficient balance");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("❌ Invalid amount");
        } else {
            console.log("❌ Unknown error:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
