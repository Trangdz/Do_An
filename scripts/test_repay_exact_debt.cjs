const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay with Exact Debt Amount");
    console.log("=" .repeat(50));
    
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
    
    // Check user reserves before repay
    console.log("\nUser Reserves BEFORE Repay:");
    try {
        const userReserveBefore = await pool.userReserves(userAddress, USDCAddress);
        console.log("Supply Principal:", userReserveBefore.supply.principal.toString());
        console.log("Borrow Principal:", userReserveBefore.borrow.principal.toString());
        console.log("Use As Collateral:", userReserveBefore.useAsCollateral);
        
        if (userReserveBefore.borrow.principal > 0n) {
            const debtFormatted = ethers.formatUnits(userReserveBefore.borrow.principal, 6);
            console.log("✅ User has debt to repay:", debtFormatted, "USDC");
            
            // Check USDC balance
            const balance = await usdc.balanceOf(userAddress);
            const balanceFormatted = ethers.formatUnits(balance, 6);
            console.log("USDC Balance:", balanceFormatted, "USDC");
            
            // Check if balance is sufficient
            if (balance >= userReserveBefore.borrow.principal) {
                console.log("✅ Balance is sufficient for full repayment");
                
                // Use exact debt amount + 10% buffer
                const actualDebtAmount = userReserveBefore.borrow.principal;
                const bufferAmount = actualDebtAmount * BigInt(110) / BigInt(100); // 10% buffer
                
                console.log("\nUsing exact debt amount + 10% buffer for repay all...");
                console.log("Actual debt:", actualDebtAmount.toString());
                console.log("Buffer amount:", bufferAmount.toString());
                console.log("Formatted debt:", ethers.formatUnits(actualDebtAmount, 6), "USDC");
                console.log("Formatted buffer:", ethers.formatUnits(bufferAmount, 6), "USDC");
                
                // Approve buffer amount
                console.log("\nApproving buffer amount...");
                const approveTx = await usdc.approve(LendingPoolAddress, bufferAmount);
                await approveTx.wait();
                console.log("✅ Approval successful");
                
                // Try to repay with buffer amount
                console.log("\nAttempting repay with buffer amount...");
                
                try {
                    const gasEstimate = await pool.repay.estimateGas(USDCAddress, bufferAmount, userAddress);
                    console.log("✅ Gas estimate successful:", gasEstimate.toString());
                    
                    // Try actual repay
                    const repayTx = await pool.repay(USDCAddress, bufferAmount, userAddress);
                    console.log("✅ Repay transaction sent:", repayTx.hash);
                    
                    const receipt = await repayTx.wait();
                    console.log("✅ Repay successful! Gas used:", receipt.gasUsed.toString());
                    
                    // Check user reserves after repay
                    console.log("\nUser Reserves AFTER Repay:");
                    const userReserveAfter = await pool.userReserves(userAddress, USDCAddress);
                    console.log("Supply Principal:", userReserveAfter.supply.principal.toString());
                    console.log("Borrow Principal:", userReserveAfter.borrow.principal.toString());
                    console.log("Use As Collateral:", userReserveAfter.useAsCollateral);
                    
                    if (userReserveAfter.borrow.principal === 0n) {
                        console.log("🎉 Repay successful! Debt cleared!");
                    } else {
                        const remainingDebt = ethers.formatUnits(userReserveAfter.borrow.principal, 6);
                        console.log("⚠️ Debt still exists:", remainingDebt, "USDC");
                        console.log("This might be due to interest accrual or contract logic");
                    }
                    
                } catch (gasError) {
                    console.log("❌ Gas estimate failed:", gasError.message);
                    console.log("This might be due to contract state or user having no debt");
                }
                
            } else {
                console.log("❌ Insufficient balance for full repayment");
                console.log("Need:", ethers.formatUnits(userReserveBefore.borrow.principal, 6), "USDC");
                console.log("Have:", balanceFormatted, "USDC");
            }
            
        } else {
            console.log("⚠️ User has no debt to repay");
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    console.log("\n💡 Key Points:");
    console.log("1. Use exact debt amount from contract");
    console.log("2. Add 10% buffer to cover interest");
    console.log("3. Check balance before attempting repay");
    console.log("4. Verify debt is cleared after repay");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
