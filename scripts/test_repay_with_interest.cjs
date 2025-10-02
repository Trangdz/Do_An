const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay with Interest");
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
        "function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
    ], signer);
    
    const usdc = new ethers.Contract(USDCAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ], signer);
    
    // Check user reserves
    console.log("\nUser Reserves (USDC):");
    try {
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", userReserve.borrow.principal.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        if (userReserve.borrow.principal > 0n) {
            const debtFormatted = ethers.formatUnits(userReserve.borrow.principal, 6);
            console.log("✅ User has debt to repay:", debtFormatted, "USDC");
            
            // Check USDC balance
            const balance = await usdc.balanceOf(userAddress);
            const balanceFormatted = ethers.formatUnits(balance, 6);
            console.log("USDC Balance:", balanceFormatted, "USDC");
            
            // Check if balance is sufficient
            if (balance >= userReserve.borrow.principal) {
                console.log("✅ Balance is sufficient for full repayment");
                
                // Try to repay the exact debt amount
                console.log("\nAttempting to repay exact debt amount...");
                
                // Check allowance
                const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
                if (allowance < userReserve.borrow.principal) {
                    console.log("Approving exact debt amount...");
                    const approveTx = await usdc.approve(LendingPoolAddress, userReserve.borrow.principal);
                    await approveTx.wait();
                    console.log("✅ Approval successful");
                }
                
                // Try to estimate gas
                try {
                    const gasEstimate = await pool.repay.estimateGas(USDCAddress, userReserve.borrow.principal, userAddress);
                    console.log("✅ Gas estimate successful:", gasEstimate.toString());
                    
                    // Try actual repay
                    console.log("Attempting repay with exact debt amount...");
                    const repayTx = await pool.repay(USDCAddress, userReserve.borrow.principal, userAddress);
                    console.log("✅ Repay transaction sent:", repayTx.hash);
                    
                    const receipt = await repayTx.wait();
                    console.log("✅ Repay successful! Gas used:", receipt.gasUsed.toString());
                    
                    // Check new debt
                    const newUserReserve = await pool.userReserves(userAddress, USDCAddress);
                    console.log("New Borrow Principal:", newUserReserve.borrow.principal.toString());
                    
                    if (newUserReserve.borrow.principal === 0n) {
                        console.log("🎉 Repay successful! Debt cleared!");
                    } else {
                        console.log("⚠️ Debt still exists:", ethers.formatUnits(newUserReserve.borrow.principal, 6), "USDC");
                    }
                    
                } catch (gasError) {
                    console.log("❌ Gas estimate failed:", gasError.message);
                }
                
            } else {
                console.log("❌ Insufficient balance for full repayment");
                console.log("Need:", ethers.formatUnits(userReserve.borrow.principal, 6), "USDC");
                console.log("Have:", balanceFormatted, "USDC");
            }
            
        } else {
            console.log("⚠️ User has no debt to repay");
        }
    } catch (error) {
        console.log("❌ Error getting user reserves:", error.message);
    }
    
    console.log("\n💡 Key Points:");
    console.log("1. Always use exact debt amount from contract");
    console.log("2. Debt includes accrued interest");
    console.log("3. Check balance before attempting repay");
    console.log("4. Use userReserves.borrow.principal for exact amount");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
