const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Fixed Repay Logic");
    console.log("=" .repeat(50));
    
    // Get the latest contract addresses
    const LendingPoolAddress = "0xc5D908AA6315579d7f4B81D34E9A0f43c312076C";
    const USDCAddress = "0xFC6A1358B663E41D2332e4496243f38FA043b056";
    
    console.log("Contract Addresses:");
    console.log("LendingPool:", LendingPoolAddress);
    console.log("USDC:", USDCAddress);
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    const signer = await provider.getSigner(0); // Use account 0
    const userAddress = await signer.getAddress();
    console.log("Using account:", userAddress);
    
    // Check if contracts exist
    const poolCode = await provider.getCode(LendingPoolAddress);
    const usdcCode = await provider.getCode(USDCAddress);
    
    console.log("\nContract Existence:");
    console.log("LendingPool exists:", poolCode !== "0x");
    console.log("USDC exists:", usdcCode !== "0x");
    
    if (poolCode === "0x" || usdcCode === "0x") {
        console.log("❌ Contract not found! Please redeploy.");
        return;
    }
    
    // Create contract instances
    const pool = new ethers.Contract(LendingPoolAddress, [
        "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
    ], signer);
    
    const usdc = new ethers.Contract(USDCAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], signer);
    
    // Check user reserves
    console.log("\n📊 User Reserves:");
    try {
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const principalDebt = userReserve.borrow.principal;
        
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", principalDebt.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        if (principalDebt > 0n) {
            const principalFormatted = ethers.formatUnits(principalDebt, 6);
            console.log("✅ User has debt to repay:", principalFormatted, "USDC");
            
            // Simulate the new logic
            console.log("\n🔧 Testing New Repay Logic:");
            
            // Check if principal debt is reasonable (less than 1M tokens)
            const maxReasonableDebt = ethers.parseUnits("1000000", 6);
            let totalDebtAmount;
            let maxAmount;
            
            if (principalDebt > maxReasonableDebt) {
                console.log("⚠️ Principal debt seems too large, capping to reasonable amount");
                const cappedPrincipal = maxReasonableDebt;
                totalDebtAmount = cappedPrincipal * BigInt(110) / BigInt(100); // 10% buffer
                maxAmount = totalDebtAmount;
                console.log("Capped principal:", cappedPrincipal.toString());
                console.log("Total debt (capped + 10%):", totalDebtAmount.toString());
            } else {
                // Use principal + 10% buffer for interest
                totalDebtAmount = principalDebt * BigInt(110) / BigInt(100);
                console.log("Total debt (principal + 10%):", totalDebtAmount.toString());
                
                // Use total debt + 5% safety buffer to ensure 100% repayment
                const safetyBuffer = totalDebtAmount * BigInt(105) / BigInt(100); // 5% safety buffer
                maxAmount = safetyBuffer;
            }
            
            // Final validation - ensure amount is reasonable
            const maxAllowedAmount = ethers.parseUnits("1000000", 6); // 1M tokens max
            if (maxAmount > maxAllowedAmount) {
                console.log("⚠️ Calculated amount too large, capping to 1M tokens");
                maxAmount = maxAllowedAmount;
            }
            
            console.log("\n💰 Final Calculation:");
            console.log("Principal debt:", principalDebt.toString());
            console.log("Total debt amount:", totalDebtAmount.toString());
            console.log("Final repay amount:", maxAmount.toString());
            console.log("Formatted repay amount:", ethers.formatUnits(maxAmount, 6), "USDC");
            
            // Check if amount is reasonable
            const isReasonable = maxAmount <= maxAllowedAmount && maxAmount > 0n;
            console.log("Is amount reasonable:", isReasonable);
            
            if (isReasonable) {
                console.log("✅ Amount calculation looks good!");
                
                // Check USDC balance
                const balance = await usdc.balanceOf(userAddress);
                const balanceFormatted = ethers.formatUnits(balance, 6);
                console.log("USDC Balance:", balanceFormatted, "USDC");
                
                if (balance >= maxAmount) {
                    console.log("✅ Balance is sufficient for repayment");
                    
                    // Try to estimate gas
                    try {
                        const gasEstimate = await pool.repay.estimateGas(USDCAddress, maxAmount, userAddress);
                        console.log("✅ Gas estimate successful:", gasEstimate.toString());
                        console.log("🎉 Repay should work now!");
                    } catch (gasError) {
                        console.log("❌ Gas estimate failed:", gasError.message);
                    }
                } else {
                    console.log("❌ Insufficient balance for repayment");
                    console.log("Need:", ethers.formatUnits(maxAmount, 6), "USDC");
                    console.log("Have:", balanceFormatted, "USDC");
                }
            } else {
                console.log("❌ Amount calculation failed");
            }
            
        } else {
            console.log("⚠️ User has no debt to repay");
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    console.log("\n💡 Key Improvements:");
    console.log("1. ✅ Check if principal debt is reasonable");
    console.log("2. ✅ Cap amount to 1M tokens maximum");
    console.log("3. ✅ Use 10% buffer instead of 20%");
    console.log("4. ✅ Add final validation before repay");
    console.log("5. ✅ Better error handling and logging");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
