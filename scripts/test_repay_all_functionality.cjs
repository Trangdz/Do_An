const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay All Functionality");
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
    
    // Check user data
    console.log("\nUser Account Data:");
    try {
        const accountData = await pool.getUserAccountData(userAddress);
        console.log("Total Collateral ETH:", ethers.formatEther(accountData[0]));
        console.log("Total Debt ETH:", ethers.formatEther(accountData[1]));
        console.log("Available Borrows ETH:", ethers.formatEther(accountData[2]));
        console.log("Health Factor:", ethers.formatEther(accountData[5]));
        
        if (accountData[1] === 0n) {
            console.log("⚠️ User has no debt to repay!");
            console.log("💡 Need to borrow first to test repay all");
        }
    } catch (error) {
        console.log("❌ Error getting account data:", error.message);
    }
    
    // Check USDC balance
    console.log("\nUSDC Balance:");
    try {
        const balance = await usdc.balanceOf(userAddress);
        console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");
        console.log("Balance (raw):", balance.toString());
    } catch (error) {
        console.log("❌ Error getting USDC balance:", error.message);
    }
    
    // Check user reserves
    console.log("\nUser Reserves (USDC):");
    try {
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", userReserve.borrow.principal.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        if (userReserve.borrow.principal > 0n) {
            console.log("✅ User has debt to repay:", ethers.formatUnits(userReserve.borrow.principal, 6), "USDC");
        } else {
            console.log("⚠️ User has no debt to repay");
        }
    } catch (error) {
        console.log("❌ Error getting user reserves:", error.message);
    }
    
    // Test Repay All with large amount
    console.log("\nTesting Repay All:");
    try {
        const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        console.log("Large amount:", largeAmount.toString());
        
        // Check allowance
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        console.log("Current allowance:", ethers.formatUnits(allowance, 6), "USDC");
        
        if (allowance < largeAmount) {
            console.log("Approving large amount...");
            const approveTx = await usdc.approve(LendingPoolAddress, largeAmount);
            await approveTx.wait();
            console.log("✅ Approval successful");
        }
        
        // Try to estimate gas
        try {
            const gasEstimate = await pool.repay.estimateGas(USDCAddress, largeAmount, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            
            // Try actual repay
            console.log("Attempting repay all...");
            const repayTx = await pool.repay(USDCAddress, largeAmount, userAddress);
            console.log("✅ Repay transaction sent:", repayTx.hash);
            
            const receipt = await repayTx.wait();
            console.log("✅ Repay successful! Gas used:", receipt.gasUsed.toString());
            
            // Check new debt
            const newUserReserve = await pool.userReserves(userAddress, USDCAddress);
            console.log("New Borrow Principal:", newUserReserve.borrow.principal.toString());
            
            if (newUserReserve.borrow.principal === 0n) {
                console.log("🎉 Repay All successful! Debt cleared!");
            } else {
                console.log("⚠️ Debt still exists:", ethers.formatUnits(newUserReserve.borrow.principal, 6), "USDC");
            }
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
        }
        
    } catch (error) {
        console.log("❌ Repay All failed:", error.message);
    }
    
    console.log("\n🔍 Debugging Tips:");
    console.log("1. Make sure user has debt to repay");
    console.log("2. Make sure user has enough USDC balance");
    console.log("3. Make sure user has approved the pool");
    console.log("4. Check contract state and health factor");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
