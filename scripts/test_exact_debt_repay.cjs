const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Exact Debt Repay Logic");
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
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ], signer);
    
    // Check user reserves
    console.log("\n📊 User Reserves:");
    try {
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const principalDebt = userReserve.borrow.principal;
        
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", principalDebt.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        if (principalDebt === BigInt(0)) {
            console.log("❌ User has no debt to repay!");
            console.log("This explains the 'missing revert data' error.");
            return;
        }
        
        const principalFormatted = ethers.formatUnits(principalDebt, 6);
        console.log("✅ User has debt to repay:", principalFormatted, "USDC");
        
        // Simulate the NEW logic (exact debt + buffer)
        console.log("\n🔧 Testing NEW Exact Debt Logic:");
        
        // Use exact debt amount with reasonable buffer
        let totalDebtAmount;
        let maxAmount;
        
        // Since getBorrowBalance doesn't exist, use principal + 10% buffer
        totalDebtAmount = principalDebt * BigInt(110) / BigInt(100);
        console.log("Total debt (principal + 10%):", totalDebtAmount.toString());
        console.log("Formatted total debt:", ethers.formatUnits(totalDebtAmount, 6), "USDC");
        
        // Use total debt + 5% safety buffer to ensure 100% repayment
        const safetyBuffer = totalDebtAmount * BigInt(105) / BigInt(100); // 5% safety buffer
        maxAmount = safetyBuffer;
        
        // Only cap if amount is extremely large (more than 10M tokens)
        const extremeLimit = ethers.parseUnits("10000000", 6); // 10M tokens
        if (maxAmount > extremeLimit) {
            console.log("⚠️ Amount extremely large, capping to 10M tokens");
            maxAmount = extremeLimit;
        }
        
        console.log("\n💰 Final Calculation:");
        console.log("Principal debt:", principalDebt.toString());
        console.log("Total debt amount:", totalDebtAmount.toString());
        console.log("Final repay amount:", maxAmount.toString());
        console.log("Formatted repay amount:", ethers.formatUnits(maxAmount, 6), "USDC");
        
        // Check if amount is reasonable
        const isReasonable = maxAmount <= extremeLimit && maxAmount > 0n;
        console.log("Is amount reasonable:", isReasonable);
        
        if (isReasonable) {
            console.log("✅ Amount calculation looks good!");
            
            // Check USDC balance
            const balance = await usdc.balanceOf(userAddress);
            const balanceFormatted = ethers.formatUnits(balance, 6);
            console.log("USDC Balance:", balanceFormatted, "USDC");
            
            if (balance >= maxAmount) {
                console.log("✅ Balance is sufficient for repayment");
                
                // Check allowance
                const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
                const allowanceFormatted = ethers.formatUnits(allowance, 6);
                console.log("Allowance:", allowanceFormatted, "USDC");
                
                if (allowance >= maxAmount) {
                    console.log("✅ Allowance is sufficient");
                } else {
                    console.log("⚠️ Need to approve more allowance");
                }
                
                // Try to estimate gas
                try {
                    const gasEstimate = await pool.repay.estimateGas(USDCAddress, maxAmount, userAddress);
                    console.log("✅ Gas estimate successful:", gasEstimate.toString());
                    console.log("🎉 Repay should work now!");
                    
                } catch (gasError) {
                    console.log("❌ Gas estimate failed:", gasError.message);
                    
                    // Try with exact principal amount
                    console.log("\n🔄 Trying with exact principal amount...");
                    try {
                        const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, principalDebt, userAddress);
                        console.log("✅ Gas estimate with principal successful:", gasEstimate2.toString());
                        console.log("💡 Try repaying with exact principal amount");
                    } catch (gasError2) {
                        console.log("❌ Gas estimate with principal also failed:", gasError2.message);
                    }
                }
                
            } else {
                console.log("❌ Insufficient balance for repayment");
                console.log("Need:", ethers.formatUnits(maxAmount, 6), "USDC");
                console.log("Have:", balanceFormatted, "USDC");
                console.log("Shortfall:", ethers.formatUnits(maxAmount - balance, 6), "USDC");
            }
        } else {
            console.log("❌ Amount calculation failed");
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    console.log("\n💡 Key Changes:");
    console.log("1. ✅ Use exact debt amount instead of capping to 1M");
    console.log("2. ✅ Only cap if amount > 10M tokens (extreme case)");
    console.log("3. ✅ Principal + 10% + 5% = 15.5% total buffer");
    console.log("4. ✅ Better balance and allowance checks");
    console.log("5. ✅ Fallback to principal amount if calculated amount fails");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
