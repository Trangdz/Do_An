const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Repay Massive Amount to Clear All Debt");
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
        
        // Step 2: Use a MASSIVE amount to ensure complete clearance
        // Use 1000x the principal debt to account for interest accrual
        const massiveAmount = principalDebt * BigInt(1000);
        
        console.log("\n💰 Massive Repay Amount:");
        console.log("Principal Debt:", principalDebt.toString());
        console.log("Massive Amount (1000x):", massiveAmount.toString());
        console.log("Massive Amount (18 decimals):", ethers.formatUnits(massiveAmount, 18), "USDC");
        console.log("Massive Amount (6 decimals):", ethers.formatUnits(massiveAmount, 6), "USDC");
        
        // Step 3: Check balance and allowance
        console.log("\n💳 Balance & Allowance Check:");
        const balance = await usdc.balanceOf(userAddress);
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        
        console.log("USDC Balance:", ethers.formatUnits(balance, 6), "USDC");
        console.log("Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");
        
        if (balance < massiveAmount) {
            console.log("❌ Insufficient balance for massive repayment");
            console.log("Need:", ethers.formatUnits(massiveAmount, 6), "USDC");
            console.log("Have:", ethers.formatUnits(balance, 6), "USDC");
            return;
        }
        
        // Step 4: Approve if needed
        if (allowance < massiveAmount) {
            console.log("\n🔧 Approving USDC for massive amount...");
            const approveTx = await usdc.approve(LendingPoolAddress, massiveAmount);
            await approveTx.wait();
            console.log("✅ USDC approved for massive amount");
            
            // Check new allowance
            const newAllowance = await usdc.allowance(userAddress, LendingPoolAddress);
            console.log("New Allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
        } else {
            console.log("✅ Allowance is sufficient");
        }
        
        // Step 5: Test gas estimation
        console.log("\n⛽ Gas Estimation Test:");
        try {
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, massiveAmount, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            console.log("🎉 Massive repay should work now!");
            
            // Step 6: Execute actual repay
            console.log("\n🚀 Executing MASSIVE Repay Transaction:");
            const repayTx = await pool.repay(USDCAddress, massiveAmount, userAddress);
            console.log("Transaction hash:", repayTx.hash);
            
            const receipt = await repayTx.wait();
            console.log("✅ Massive repay transaction confirmed!");
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
                console.log("The massive amount successfully cleared all debt including interest!");
            } else {
                console.log("⚠️ Debt still exists:", ethers.formatUnits(newPrincipalDebt, 18), "USDC");
                console.log("This is very unusual - the massive amount should have cleared everything");
            }
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
            console.log("This might be because the amount is too large for the contract to handle");
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
