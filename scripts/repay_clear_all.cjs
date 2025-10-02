const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Repay Clear All Debt (Overpay to ensure zero)");
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
        // Step 1: Get current debt
        console.log("\n📊 Current Debt Analysis:");
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const principalDebt = userReserve.borrow.principal;
        
        console.log("Principal Debt:", principalDebt.toString());
        console.log("Principal Debt (6 decimals):", ethers.formatUnits(principalDebt, 6), "USDC");
        
        if (principalDebt === BigInt(0)) {
            console.log("✅ No debt to repay!");
            return;
        }
        
        // Step 2: Use a generous amount to ensure complete clearance
        // Convert from 18 decimals to 6 decimals and add buffer
        const conversionFactor = BigInt(10**12); // 18 - 6 = 12
        
        // Calculate principal in 6 decimals with proper rounding
        const principalIn6Decimals = (principalDebt + conversionFactor / BigInt(2)) / conversionFactor;
        
        // If principal is 0 after conversion, use 1 as minimum
        const minPrincipal = principalIn6Decimals > BigInt(0) ? principalIn6Decimals : BigInt(1);
        
        // Add 50% buffer to ensure complete clearance
        const bufferAmount = minPrincipal / BigInt(2); // 50% buffer
        const repayAmount = minPrincipal + bufferAmount;
        
        console.log("\n💰 Repay Amount Calculation:");
        console.log("Principal (6 decimals):", principalIn6Decimals.toString());
        console.log("Min Principal:", minPrincipal.toString());
        console.log("Buffer (50%):", bufferAmount.toString());
        console.log("Total Repay Amount:", repayAmount.toString());
        console.log("Total Repay Amount (formatted):", ethers.formatUnits(repayAmount, 6), "USDC");
        
        // Step 3: Check balance and allowance
        console.log("\n💳 Balance & Allowance Check:");
        const balance = await usdc.balanceOf(userAddress);
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        
        console.log("USDC Balance:", ethers.formatUnits(balance, 6), "USDC");
        console.log("Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");
        
        if (balance < repayAmount) {
            console.log("❌ Insufficient balance for repayment");
            return;
        }
        
        // Step 4: Approve if needed
        if (allowance < repayAmount) {
            console.log("\n🔧 Approving USDC...");
            const approveTx = await usdc.approve(LendingPoolAddress, repayAmount);
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
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, repayAmount, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            console.log("🎉 Repay should work now!");
            
            // Step 6: Execute actual repay
            console.log("\n🚀 Executing Clear All Repay Transaction:");
            const repayTx = await pool.repay(USDCAddress, repayAmount, userAddress);
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
                console.log("This might be due to additional interest accrual during transaction");
                
                // Try one more time with even larger amount
                if (newPrincipalDebt < BigInt(1000)) { // If very small debt
                    console.log("\n🔄 Trying one more time with larger amount...");
                    const largerAmount = repayAmount * BigInt(2); // Double the amount
                    
                    try {
                        const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, largerAmount, userAddress);
                        console.log("✅ Gas estimate with larger amount successful:", gasEstimate2.toString());
                        
                        const repayTx2 = await pool.repay(USDCAddress, largerAmount, userAddress);
                        console.log("Transaction hash:", repayTx2.hash);
                        
                        const receipt2 = await repayTx2.wait();
                        console.log("✅ Second repay transaction confirmed!");
                        
                        // Final verification
                        const finalUserReserve = await pool.userReserves(userAddress, USDCAddress);
                        const finalPrincipalDebt = finalUserReserve.borrow.principal;
                        
                        console.log("\n📊 Final Verification:");
                        console.log("Final Borrow Principal:", finalPrincipalDebt.toString());
                        
                        if (finalPrincipalDebt === BigInt(0)) {
                            console.log("🎉 SUCCESS! Debt completely cleared to ZERO!");
                        } else {
                            console.log("⚠️ Debt still exists:", ethers.formatUnits(finalPrincipalDebt, 18), "USDC");
                        }
                        
                    } catch (error) {
                        console.log("❌ Second repay failed:", error.message);
                    }
                }
            }
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
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
