const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Analyzing Complete Repay Flow");
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
    
    console.log("\n1. Contract Existence Check:");
    console.log("LendingPool exists:", poolCode !== "0x");
    console.log("USDC exists:", usdcCode !== "0x");
    
    if (poolCode === "0x" || usdcCode === "0x") {
        console.log("❌ Contract not found! This is the root cause.");
        return;
    }
    
    // Create contract instances
    const pool = new ethers.Contract(LendingPoolAddress, [
        "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (tuple(bool isInitialized, bool isPaused, uint8 decimals, uint256 reserveFactor, uint256 baseLTV, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveCash, uint256 reserveDebt, uint256 totalSupply, uint256 totalBorrow, uint256 supplyAPR, uint256 borrowAPR, uint256 utilization, uint256 liquidityIndex, uint256 borrowIndex, address interestRateModel, address priceOracle, bool isSupported, bool isBorrowable)"
    ], signer);
    
    const usdc = new ethers.Contract(USDCAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ], signer);
    
    console.log("\n2. User Reserve Data Check:");
    try {
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const principalDebt = userReserve.borrow.principal;
        
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", principalDebt.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        if (principalDebt === BigInt(0)) {
            console.log("❌ User has no debt to repay!");
            console.log("This is why 'missing revert data' occurs.");
            console.log("The contract reverts because there's nothing to repay.");
            return;
        }
        
        const principalFormatted = ethers.formatUnits(principalDebt, 6);
        console.log("✅ User has debt to repay:", principalFormatted, "USDC");
        
        console.log("\n3. Reserve Data Check:");
        const reserveData = await pool.reserves(USDCAddress);
        console.log("Is Initialized:", reserveData.isInitialized);
        console.log("Is Paused:", reserveData.isPaused);
        console.log("Is Supported:", reserveData.isSupported);
        console.log("Is Borrowable:", reserveData.isBorrowable);
        console.log("Reserve Cash:", ethers.formatUnits(reserveData.reserveCash, 6), "USDC");
        console.log("Reserve Debt:", ethers.formatUnits(reserveData.reserveDebt, 6), "USDC");
        
        if (!reserveData.isInitialized) {
            console.log("❌ Reserve not initialized!");
            return;
        }
        
        if (reserveData.isPaused) {
            console.log("❌ Reserve is paused!");
            return;
        }
        
        if (!reserveData.isSupported) {
            console.log("❌ Reserve not supported!");
            return;
        }
        
        console.log("\n4. User Balance Check:");
        const balance = await usdc.balanceOf(userAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        console.log("User USDC Balance:", balanceFormatted, "USDC");
        
        if (balance === BigInt(0)) {
            console.log("❌ User has no USDC balance!");
            return;
        }
        
        console.log("\n5. Allowance Check:");
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        const allowanceFormatted = ethers.formatUnits(allowance, 6);
        console.log("Allowance:", allowanceFormatted, "USDC");
        
        console.log("\n6. Calculate Repay Amount:");
        // Simulate the frontend logic
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
        
        console.log("Final repay amount:", maxAmount.toString());
        console.log("Formatted repay amount:", ethers.formatUnits(maxAmount, 6), "USDC");
        
        console.log("\n7. Pre-flight Validation:");
        
        // Check if balance is sufficient
        if (balance < maxAmount) {
            console.log("❌ Insufficient balance!");
            console.log("Need:", ethers.formatUnits(maxAmount, 6), "USDC");
            console.log("Have:", balanceFormatted, "USDC");
            console.log("Shortfall:", ethers.formatUnits(maxAmount - balance, 6), "USDC");
            return;
        } else {
            console.log("✅ Balance is sufficient");
        }
        
        // Check if allowance is sufficient
        if (allowance < maxAmount) {
            console.log("⚠️ Insufficient allowance, need to approve");
            console.log("Need:", ethers.formatUnits(maxAmount, 6), "USDC");
            console.log("Have:", allowanceFormatted, "USDC");
        } else {
            console.log("✅ Allowance is sufficient");
        }
        
        console.log("\n8. Gas Estimation Test:");
        
        try {
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, maxAmount, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            console.log("🎉 Repay should work!");
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
            console.log("This confirms the 'missing revert data' error");
            
            // Try with smaller amount
            console.log("\n9. Trying with smaller amount:");
            const smallerAmount = principalDebt; // Just the principal
            console.log("Trying with principal amount:", ethers.formatUnits(smallerAmount, 6), "USDC");
            
            try {
                const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, smallerAmount, userAddress);
                console.log("✅ Gas estimate with smaller amount successful:", gasEstimate2.toString());
                console.log("💡 Try repaying with exact principal amount instead of calculated amount");
            } catch (gasError2) {
                console.log("❌ Gas estimate with smaller amount also failed:", gasError2.message);
                console.log("This suggests a deeper contract issue");
            }
        }
        
    } catch (error) {
        console.log("❌ Error during analysis:", error.message);
    }
    
    console.log("\n💡 Summary of Possible Issues:");
    console.log("1. User has no debt to repay");
    console.log("2. Reserve not initialized or paused");
    console.log("3. Insufficient balance");
    console.log("4. Calculated amount too large");
    console.log("5. Contract state corruption");
    console.log("6. Frontend showing modal for user without debt");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
