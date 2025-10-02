const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Repay Exact Debt (Principal + Interest)");
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
    
    try {
        // Step 1: Get current debt with interest
        console.log("\n📊 Current Debt Analysis:");
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const principalDebt = userReserve.borrow.principal;
        const borrowIndex = userReserve.borrow.index;
        const initialIndex = BigInt(1e27); // RAY = 1e27
        
        console.log("Principal Debt:", principalDebt.toString());
        console.log("Borrow Index:", borrowIndex.toString());
        console.log("Initial Index:", initialIndex.toString());
        
        // Calculate total debt with interest
        const totalDebtWithInterest = (principalDebt * borrowIndex) / initialIndex;
        console.log("Total Debt (with interest):", totalDebtWithInterest.toString());
        console.log("Total Debt (formatted):", ethers.formatUnits(totalDebtWithInterest, 18), "USDC (18 decimals)");
        console.log("Total Debt (6 decimals):", ethers.formatUnits(totalDebtWithInterest, 6), "USDC (6 decimals)");
        
        // Step 2: Convert to 6 decimals for USDC (with proper rounding)
        const conversionFactor = BigInt(10**12); // 18 - 6 = 12
        const repayAmount6Decimals = (totalDebtWithInterest + conversionFactor / BigInt(2)) / conversionFactor; // Round to nearest
        console.log("\n💰 Repay Amount (6 decimals):", repayAmount6Decimals.toString());
        console.log("Repay Amount (formatted):", ethers.formatUnits(repayAmount6Decimals, 6), "USDC");
        
        // Step 3: Check balance and allowance
        console.log("\n💳 Balance & Allowance Check:");
        const balance = await usdc.balanceOf(userAddress);
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        
        console.log("USDC Balance:", ethers.formatUnits(balance, 6), "USDC");
        console.log("Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");
        
        if (balance < repayAmount6Decimals) {
            console.log("❌ Insufficient balance for repayment");
            return;
        }
        
        // Step 4: Approve if needed
        if (allowance < repayAmount6Decimals) {
            console.log("\n🔧 Approving USDC...");
            const approveTx = await usdc.approve(LendingPoolAddress, repayAmount6Decimals);
            await approveTx.wait();
            console.log("✅ USDC approved");
            
            // Check new allowance
            const newAllowance = await usdc.allowance(userAddress, LendingPoolAddress);
            console.log("New Allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
        } else {
            console.log("✅ Allowance is sufficient");
        }
        
        // Step 5: Test gas estimation
        console.log("\n⛽ Gas Estimation Test:");
        try {
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, repayAmount6Decimals, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            console.log("🎉 Repay should work now!");
            
            // Step 6: Execute actual repay
            console.log("\n🚀 Executing Exact Repay Transaction:");
            const repayTx = await pool.repay(USDCAddress, repayAmount6Decimals, userAddress);
            console.log("Transaction hash:", repayTx.hash);
            
            const receipt = await repayTx.wait();
            console.log("✅ Repay transaction confirmed!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Step 7: Verify debt is completely cleared
            console.log("\n📊 Post-Repay Verification:");
            const newUserReserve = await pool.userReserves(userAddress, USDCAddress);
            const newPrincipalDebt = newUserReserve.borrow.principal;
            
            console.log("New Borrow Principal:", newPrincipalDebt.toString());
            console.log("New Borrow Principal (formatted):", ethers.formatUnits(newPrincipalDebt, 18), "USDC (18 decimals)");
            console.log("New Borrow Principal (6 decimals):", ethers.formatUnits(newPrincipalDebt, 6), "USDC (6 decimals)");
            
            if (newPrincipalDebt === BigInt(0)) {
                console.log("🎉 SUCCESS! Debt completely cleared to ZERO!");
            } else {
                console.log("⚠️ Debt still exists:", ethers.formatUnits(newPrincipalDebt, 18), "USDC");
                console.log("This might be due to rounding or additional interest accrual");
            }
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
            
            // Try with slightly larger amount to account for rounding
            console.log("\n🔄 Trying with slightly larger amount...");
            const largerAmount = repayAmount6Decimals + BigInt(1); // Add 1 wei
            console.log("Larger amount:", largerAmount.toString());
            console.log("Larger amount (formatted):", ethers.formatUnits(largerAmount, 6), "USDC");
            
            try {
                const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, largerAmount, userAddress);
                console.log("✅ Gas estimate with larger amount successful:", gasEstimate2.toString());
                
                // Execute with larger amount
                console.log("\n🚀 Executing Repay with Larger Amount:");
                const repayTx2 = await pool.repay(USDCAddress, largerAmount, userAddress);
                console.log("Transaction hash:", repayTx2.hash);
                
                const receipt2 = await repayTx2.wait();
                console.log("✅ Repay transaction confirmed!");
                console.log("Gas used:", receipt2.gasUsed.toString());
                
                // Verify debt is cleared
                const finalUserReserve = await pool.userReserves(userAddress, USDCAddress);
                const finalPrincipalDebt = finalUserReserve.borrow.principal;
                
                console.log("\n📊 Final Verification:");
                console.log("Final Borrow Principal:", finalPrincipalDebt.toString());
                
                if (finalPrincipalDebt === BigInt(0)) {
                    console.log("🎉 SUCCESS! Debt completely cleared to ZERO!");
                } else {
                    console.log("⚠️ Debt still exists:", ethers.formatUnits(finalPrincipalDebt, 18), "USDC");
                }
                
            } catch (gasError2) {
                console.log("❌ Gas estimate with larger amount also failed:", gasError2.message);
            }
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
