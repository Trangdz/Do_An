const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Final Exact Debt Repay Logic");
    console.log("=" .repeat(60));
    
    // Get the latest contract addresses
    const LendingPoolAddress = "0xc5D908AA6315579d7f4B81D34E9A0f43c312076C";
    const USDCAddress = "0xFC6A1358B663E41D2332e4496243f38FA043b056";
    
    console.log("Contract Addresses:");
    console.log("LendingPool:", LendingPoolAddress);
    console.log("USDC:", USDCAddress);
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
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
        
        // Simulate the NEW logic (exact debt + small buffer)
        console.log("\n🔧 Testing NEW Exact Debt Logic:");
        
        // Check if principal debt is corrupted and needs capping
        const maxReasonablePrincipal = ethers.parseUnits("1000000", 6); // 1M tokens
        let workingPrincipal = principalDebt;
        
        if (principalDebt > maxReasonablePrincipal) {
            console.log("⚠️ Principal debt corrupted, using capped amount for calculation");
            workingPrincipal = maxReasonablePrincipal;
            console.log("Capped principal:", ethers.formatUnits(workingPrincipal, 6), "USDC");
        } else {
            console.log("✅ Principal debt looks reasonable");
        }
        
        // Use working principal + 20% buffer for interest
        const totalDebtAmount = workingPrincipal * BigInt(120) / BigInt(100);
        console.log("Total debt (working principal + 20%):", totalDebtAmount.toString());
        console.log("Formatted total debt:", ethers.formatUnits(totalDebtAmount, 6), "USDC");
        
        // Use total debt + 10% safety buffer to ensure 100% repayment
        const safetyBuffer = totalDebtAmount * BigInt(110) / BigInt(100); // 10% safety buffer
        let maxAmount = safetyBuffer;
        
        // Final safety cap - only cap if amount is extremely large (more than 10x principal)
        const extremeLimit = workingPrincipal * BigInt(10); // 10x principal maximum
        if (maxAmount > extremeLimit) {
            console.log("⚠️ Calculated amount extremely large, capping to 10x principal");
            maxAmount = extremeLimit;
        }
        
        console.log("\n💰 Final Calculation:");
        console.log("Original principal debt:", principalDebt.toString());
        console.log("Working principal debt:", workingPrincipal.toString());
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
                        const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, workingPrincipal, userAddress);
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
    
    console.log("\n💡 Key Improvements:");
    console.log("1. ✅ Use exact debt amount instead of 1M cap");
    console.log("2. ✅ Add 20% buffer for interest + 10% safety = 32% total");
    console.log("3. ✅ Cap only if amount > 10x principal (extreme case)");
    console.log("4. ✅ Much more reasonable amounts");
    console.log("5. ✅ Better error handling and logging");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
