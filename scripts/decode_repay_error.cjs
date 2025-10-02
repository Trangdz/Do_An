const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Analyzing Repay Error - Missing Revert Data");
    console.log("=" .repeat(60));
    
    // Transaction data from error
    const txData = "0x5ceae9c4000000000000000000000000fc6a1358b663e41d2332e4496243f38fa043b056000000000000000000000000000000000000000000000000000005f0f96267bd000000000000000000000000d3cadfdfcba5d1a98e5cb0f531165375b2ea5e6c";
    
    console.log("Transaction Data:", txData);
    console.log("Data Length:", txData.length);
    
    // Decode function selector
    const functionSelector = txData.slice(0, 10);
    console.log("\nFunction Selector:", functionSelector);
    
    // Check if it's repay function
    const repaySelector = ethers.id("repay(address,uint256,address)").slice(0, 10);
    console.log("Expected Repay Selector:", repaySelector);
    console.log("Is Repay Function:", functionSelector === repaySelector);
    
    // Decode parameters
    const paramData = txData.slice(10);
    console.log("\nParameter Data:", paramData);
    console.log("Parameter Data Length:", paramData.length);
    
    // Decode each parameter (32 bytes each)
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
    
    // Check if amount is reasonable
    const amountBN = BigInt(amount);
    const oneMillionUSDC = ethers.parseUnits("1000000", 6);
    const oneHundredUSDC = ethers.parseUnits("100", 6);
    
    console.log("\nAmount Analysis:");
    console.log("Amount:", amountBN.toString());
    console.log("1M USDC:", oneMillionUSDC.toString());
    console.log("100 USDC:", oneHundredUSDC.toString());
    console.log("Is reasonable amount:", amountBN < oneMillionUSDC && amountBN > BigInt(0));
    
    // Check contract addresses
    const LendingPoolAddress = "0xc5D908AA6315579d7f4B81D34E9A0f43c312076C";
    const USDCAddress = "0xFC6A1358B663E41D2332e4496243f38FA043b056";
    
    console.log("\nContract Addresses:");
    console.log("Expected LendingPool:", LendingPoolAddress);
    console.log("Expected USDC:", USDCAddress);
    console.log("Asset matches USDC:", asset.toLowerCase() === USDCAddress.toLowerCase());
    
    // Connect to network to check contract state
    console.log("\n🔍 Checking Contract State...");
    
    try {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const signer = await provider.getSigner(0);
        
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
            return;
        }
        
        // Check USDC balance
        const usdc = new ethers.Contract(USDCAddress, [
            "function balanceOf(address account) external view returns (uint256)"
        ], signer);
        
        const balance = await usdc.balanceOf(userAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        
        console.log("\nUser USDC Balance:");
        console.log("Balance:", balance.toString());
        console.log("Balance (USDC):", balanceFormatted);
        
        // Check if balance is sufficient
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
        console.log("Allowance:", allowance.toString());
        console.log("Allowance (USDC):", allowanceFormatted);
        
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
        }
        
    } catch (error) {
        console.log("❌ Error checking contract state:", error.message);
    }
    
    console.log("\n💡 Possible Causes of 'Missing Revert Data':");
    console.log("1. ❌ User has no debt to repay");
    console.log("2. ❌ Insufficient balance");
    console.log("3. ❌ Insufficient allowance");
    console.log("4. ❌ Contract not found");
    console.log("5. ❌ Invalid function parameters");
    console.log("6. ❌ Contract state issue");
    
    console.log("\n🔧 Recommended Fixes:");
    console.log("1. Check if user actually has debt");
    console.log("2. Ensure sufficient balance and allowance");
    console.log("3. Verify contract addresses are correct");
    console.log("4. Add better error handling in frontend");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
