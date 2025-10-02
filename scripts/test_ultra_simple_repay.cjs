const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Ultra Simple Repay Logic");
    console.log("=" .repeat(50));
    
    // Get the latest contract addresses
    const LendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const USDCAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
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
        
        // ULTRA SIMPLE LOGIC: Use exact principal debt only
        console.log("\n🔧 Testing ULTRA SIMPLE Logic:");
        
        // Check if principal debt is corrupted and needs capping
        const maxReasonablePrincipal = ethers.parseUnits("1000000", 6); // 1M tokens
        let workingPrincipal = principalDebt;
        
        // Check if the debt is in 18 decimals (corrupted) vs 6 decimals (correct)
        const debtIn6Decimals = ethers.formatUnits(principalDebt, 6);
        const debtIn18Decimals = ethers.formatUnits(principalDebt, 18);
        
        console.log("Debt in 6 decimals:", debtIn6Decimals, "USDC");
        console.log("Debt in 18 decimals:", debtIn18Decimals, "USDC");
        
        // If debt in 6 decimals is > 1M, it's corrupted
        if (principalDebt > maxReasonablePrincipal) {
            console.log("⚠️ Principal debt corrupted, using 100 USDC for calculation");
            workingPrincipal = ethers.parseUnits("100", 6); // Use 100 USDC as reasonable amount
            console.log("Capped principal:", ethers.formatUnits(workingPrincipal, 6), "USDC");
        } else {
            console.log("✅ Principal debt looks reasonable");
        }
        
        // ULTRA SIMPLE: Use exact principal debt only (no buffer)
        const maxAmount = workingPrincipal;
        
        console.log("\n💰 Ultra Simple Calculation:");
        console.log("Principal debt:", ethers.formatUnits(workingPrincipal, 6), "USDC");
        console.log("Repay amount (exact principal):", ethers.formatUnits(maxAmount, 6), "USDC");
        
        // Check if amount is reasonable
        const isReasonable = maxAmount <= maxReasonablePrincipal && maxAmount > 0n;
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
                    
                    // Try with smaller amount
                    console.log("\n🔄 Trying with smaller amount...");
                    const smallerAmount = maxAmount / BigInt(2);
                    try {
                        const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, smallerAmount, userAddress);
                        console.log("✅ Gas estimate with smaller amount successful:", gasEstimate2.toString());
                        console.log("💡 Try repaying with smaller amount");
                    } catch (gasError2) {
                        console.log("❌ Gas estimate with smaller amount also failed:", gasError2.message);
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
    
    console.log("\n💡 Ultra Simple Solution Benefits:");
    console.log("1. ✅ No calculations at all");
    console.log("2. ✅ Use exact principal debt");
    console.log("3. ✅ No buffer, no complex logic");
    console.log("4. ✅ Minimal amount possible");
    console.log("5. ✅ Should work with gas estimation");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
