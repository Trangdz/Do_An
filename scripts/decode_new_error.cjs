const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Analyzing New Repay Error");
    console.log("=" .repeat(50));
    
    // New transaction data from error
    const txData = "0x5ceae9c4000000000000000000000000fc6a1358b663e41d2332e4496243f38fa043b056000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000d3cadfdfcba5d1a98e5cb0f531165375b2ea5e6c";
    
    console.log("Transaction Data:", txData);
    
    // Decode function selector
    const functionSelector = txData.slice(0, 10);
    console.log("Function Selector:", functionSelector);
    
    // Decode parameters
    const paramData = txData.slice(10);
    const asset = "0x" + paramData.slice(0, 64);
    const amount = "0x" + paramData.slice(64, 128);
    const onBehalfOf = "0x" + paramData.slice(128, 192);
    
    console.log("\nDecoded Parameters:");
    console.log("Asset (USDC):", asset);
    console.log("Amount (hex):", amount);
    console.log("Amount (decimal):", BigInt(amount).toString());
    console.log("OnBehalfOf:", onBehalfOf);
    
    // Format amount in USDC (6 decimals)
    const amountFormatted = ethers.formatUnits(amount, 6);
    console.log("Amount (USDC):", amountFormatted);
    
    // This looks like 1000 USDC - much more reasonable!
    console.log("\n✅ Amount looks reasonable now:", amountFormatted, "USDC");
    
    // Connect to network to check contract state
    console.log("\n🔍 Checking Contract State...");
    
    try {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const signer = await provider.getSigner(0);
        
        const LendingPoolAddress = "0xc5D908AA6315579d7f4B81D34E9A0f43c312076C";
        const USDCAddress = "0xFC6A1358B663E41D2332e4496243f38FA043b056";
        
        // Check if contracts exist
        const poolCode = await provider.getCode(LendingPoolAddress);
        const usdcCode = await provider.getCode(USDCAddress);
        
        console.log("LendingPool exists:", poolCode !== "0x");
        console.log("USDC exists:", usdcCode !== "0x");
        
        if (poolCode === "0x" || usdcCode === "0x") {
            console.log("❌ Contract not found! This is the root cause.");
            return;
        }
        
        // Check user reserves
        const pool = new ethers.Contract(LendingPoolAddress, [
            "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
        ], signer);
        
        const userAddress = "0xd3CadFdfCbA5D1A98E5cb0F531165375b2EA5e6C";
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        
        console.log("\nUser Reserve Data:");
        console.log("Supply Principal:", userReserve.supply.principal.toString());
        console.log("Borrow Principal:", userReserve.borrow.principal.toString());
        console.log("Use As Collateral:", userReserve.useAsCollateral);
        
        // Check if user has debt
        if (userReserve.borrow.principal === BigInt(0)) {
            console.log("❌ User has no debt to repay!");
            console.log("This explains the 'missing revert data' error.");
            console.log("The contract reverts because there's nothing to repay.");
            return;
        }
        
        const principalFormatted = ethers.formatUnits(userReserve.borrow.principal, 6);
        console.log("Principal debt:", principalFormatted, "USDC");
        
        // Check USDC balance
        const usdc = new ethers.Contract(USDCAddress, [
            "function balanceOf(address account) external view returns (uint256)"
        ], signer);
        
        const balance = await usdc.balanceOf(userAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        
        console.log("\nUser USDC Balance:");
        console.log("Balance:", balanceFormatted, "USDC");
        
        // Check if balance is sufficient
        const amountBN = BigInt(amount);
        if (balance < amountBN) {
            console.log("❌ Insufficient balance!");
            console.log("Need:", amountFormatted, "USDC");
            console.log("Have:", balanceFormatted, "USDC");
            console.log("Shortfall:", ethers.formatUnits(amountBN - balance, 6), "USDC");
        } else {
            console.log("✅ Balance is sufficient");
        }
        
        // Check allowance
        const allowance = await usdc.allowance(userAddress, LendingPoolAddress);
        const allowanceFormatted = ethers.formatUnits(allowance, 6);
        
        console.log("\nAllowance:");
        console.log("Allowance:", allowanceFormatted, "USDC");
        
        if (allowance < amountBN) {
            console.log("❌ Insufficient allowance!");
            console.log("Need:", amountFormatted, "USDC");
            console.log("Have:", allowanceFormatted, "USDC");
        } else {
            console.log("✅ Allowance is sufficient");
        }
        
        // Try to estimate gas manually
        console.log("\n🔍 Testing Gas Estimation...");
        
        try {
            const poolContract = new ethers.Contract(LendingPoolAddress, [
                "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)"
            ], signer);
            
            const gasEstimate = await poolContract.repay.estimateGas(USDCAddress, amountBN, userAddress);
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            
        } catch (gasError) {
            console.log("❌ Gas estimate failed:", gasError.message);
            console.log("This confirms the 'missing revert data' error");
            
            // Check if it's a specific revert reason
            if (gasError.message.includes("execution reverted")) {
                console.log("Contract reverted during execution");
            }
        }
        
    } catch (error) {
        console.log("❌ Error checking contract state:", error.message);
    }
    
    console.log("\n💡 Possible Causes of 'Missing Revert Data':");
    console.log("1. ❌ User has no debt to repay (most likely)");
    console.log("2. ❌ Insufficient balance");
    console.log("3. ❌ Insufficient allowance");
    console.log("4. ❌ Contract state issue");
    console.log("5. ❌ User trying to repay more than they owe");
    
    console.log("\n🔧 Recommended Fixes:");
    console.log("1. Check if user actually has debt before attempting repay");
    console.log("2. Add better error handling in frontend");
    console.log("3. Show appropriate message when no debt exists");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
