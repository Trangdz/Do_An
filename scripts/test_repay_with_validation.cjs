const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay with Full Validation");
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
            console.log("The contract reverts because there's nothing to repay.");
            return;
        }
        
        const principalFormatted = ethers.formatUnits(principalDebt, 6);
        console.log("✅ User has debt to repay:", principalFormatted, "USDC");
        
        // Simulate the new logic with validation
        console.log("\n🔧 Testing New Repay Logic with Validation:");
        
        // Check if principal debt is reasonable (less than 1M tokens)
        const maxReasonableDebt = ethers.parseUnits("1000000", 6);
        let totalDebtAmount;
        let maxAmount;
        
        if (principalDebt > maxReasonableDebt) {
            console.log("⚠️ Principal debt seems too large, capping to reasonable amount");
            const cappedPrincipal = maxReasonableDebt;
            totalDebtAmount = cappedPrincipal * BigInt(110) / BigInt(100); // 10% buffer
            maxAmount = totalDebtAmount;
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
        
        // Pre-flight checks
        console.log("\n🔍 Pre-flight Checks:");
        
        // Check USDC balance
        const balance = await usdc.balanceOf(userAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        console.log("User balance:", balanceFormatted, "USDC");
        
        if (balance < maxAmount) {
            console.log("❌ Insufficient balance!");
            console.log("Need:", ethers.formatUnits(maxAmount, 6), "USDC");
            console.log("Have:", balanceFormatted, "USDC");
            console.log("Shortfall:", ethers.formatUnits(maxAmount - balance, 6), "USDC");
            return;
        } else {
            console.log("✅ Balance is sufficient");
        }
        
        // Check allowance
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        const allowanceFormatted = ethers.formatUnits(allowance, 6);
        console.log("Allowance:", allowanceFormatted, "USDC");
        
        if (allowance < maxAmount) {
            console.log("⚠️ Insufficient allowance, approving...");
            const approveTx = await usdc.approve(LendingPoolAddress, maxAmount);
            await approveTx.wait();
            console.log("✅ Approval successful");
        } else {
            console.log("✅ Allowance is sufficient");
        }
        
        // Try to estimate gas
        console.log("\n🔍 Testing Gas Estimation...");
        
        try {
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, maxAmount, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            console.log("🎉 Repay should work now!");
            
            // Try actual repay
            console.log("\n🔄 Attempting actual repay...");
            const repayTx = await pool.repay(USDCAddress, maxAmount, userAddress);
            console.log("✅ Repay transaction sent:", repayTx.hash);
            
            const receipt = await repayTx.wait();
            console.log("✅ Repay successful! Gas used:", receipt.gasUsed.toString());
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
            console.log("This confirms the 'missing revert data' error");
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    console.log("\n💡 Key Improvements:");
    console.log("1. ✅ Check if user has debt before attempting repay");
    console.log("2. ✅ Validate balance before repay");
    console.log("3. ✅ Check and approve allowance if needed");
    console.log("4. ✅ Cap amount to reasonable limits");
    console.log("5. ✅ Better error messages for user");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
