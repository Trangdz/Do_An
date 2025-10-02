const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Repay Using 18 Decimals (No Conversion)");
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
        console.log("Principal Debt (18 decimals):", ethers.formatUnits(principalDebt, 18), "USDC");
        console.log("Principal Debt (6 decimals):", ethers.formatUnits(principalDebt, 6), "USDC");
        
        if (principalDebt === BigInt(0)) {
            console.log("✅ No debt to repay!");
            return;
        }
        
        // Step 2: Use the exact principal debt in 18 decimals (no conversion)
        const repayAmount = principalDebt;
        
        console.log("\n💰 Repay Amount (18 decimals):");
        console.log("Repay Amount:", repayAmount.toString());
        console.log("Repay Amount (18 decimals):", ethers.formatUnits(repayAmount, 18), "USDC");
        console.log("Repay Amount (6 decimals):", ethers.formatUnits(repayAmount, 6), "USDC");
        
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
            console.log("\n🚀 Executing Repay Transaction (18 decimals):");
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
            console.log("New Borrow Principal (18 decimals):", ethers.formatUnits(newPrincipalDebt, 18), "USDC");
            console.log("New Borrow Principal (6 decimals):", ethers.formatUnits(newPrincipalDebt, 6), "USDC");
            
            if (newPrincipalDebt === BigInt(0)) {
                console.log("🎉 SUCCESS! Debt completely cleared to ZERO!");
            } else {
                console.log("⚠️ Debt still exists:", ethers.formatUnits(newPrincipalDebt, 18), "USDC");
                console.log("This might be due to additional interest accrual during transaction");
                
                // Try one more time with slightly larger amount
                console.log("\n🔄 Trying one more time with slightly larger amount...");
                const largerAmount = repayAmount + BigInt(1); // Add 1 wei
                
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
                    console.log("Final Borrow Principal (18 decimals):", ethers.formatUnits(finalPrincipalDebt, 18), "USDC");
                    console.log("Final Borrow Principal (6 decimals):", ethers.formatUnits(finalPrincipalDebt, 6), "USDC");
                    
                    if (finalPrincipalDebt === BigInt(0)) {
                        console.log("🎉 SUCCESS! Debt completely cleared to ZERO!");
                    } else {
                        console.log("⚠️ Debt still exists:", ethers.formatUnits(finalPrincipalDebt, 18), "USDC");
                        console.log("This is likely due to continuous interest accrual");
                    }
                    
                } catch (error) {
                    console.log("❌ Second repay failed:", error.message);
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
