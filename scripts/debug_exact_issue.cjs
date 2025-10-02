const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Exact Issue - Step by Step");
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
        
        console.log("\n6. Test Different Repay Amounts:");
        
        // Test 1: Exact principal amount
        console.log("\nTest 1: Exact Principal Amount");
        try {
            const gasEstimate1 = await pool.repay.estimateGas(USDCAddress, principalDebt, userAddress);
            console.log("✅ Gas estimate with principal successful:", gasEstimate1.toString());
        } catch (gasError1) {
            console.log("❌ Gas estimate with principal failed:", gasError1.message);
        }
        
        // Test 2: Principal + 10%
        console.log("\nTest 2: Principal + 10%");
        const principalPlus10 = principalDebt * BigInt(110) / BigInt(100);
        try {
            const gasEstimate2 = await pool.repay.estimateGas(USDCAddress, principalPlus10, userAddress);
            console.log("✅ Gas estimate with principal+10% successful:", gasEstimate2.toString());
        } catch (gasError2) {
            console.log("❌ Gas estimate with principal+10% failed:", gasError2.message);
        }
        
        // Test 3: Principal + 20%
        console.log("\nTest 3: Principal + 20%");
        const principalPlus20 = principalDebt * BigInt(120) / BigInt(100);
        try {
            const gasEstimate3 = await pool.repay.estimateGas(USDCAddress, principalPlus20, userAddress);
            console.log("✅ Gas estimate with principal+20% successful:", gasEstimate3.toString());
        } catch (gasError3) {
            console.log("❌ Gas estimate with principal+20% failed:", gasError3.message);
        }
        
        // Test 4: Principal + 50%
        console.log("\nTest 4: Principal + 50%");
        const principalPlus50 = principalDebt * BigInt(150) / BigInt(100);
        try {
            const gasEstimate4 = await pool.repay.estimateGas(USDCAddress, principalPlus50, userAddress);
            console.log("✅ Gas estimate with principal+50% successful:", gasEstimate4.toString());
        } catch (gasError4) {
            console.log("❌ Gas estimate with principal+50% failed:", gasError4.message);
        }
        
        // Test 5: 1 USDC
        console.log("\nTest 5: 1 USDC");
        const oneUSDC = ethers.parseUnits("1", 6);
        try {
            const gasEstimate5 = await pool.repay.estimateGas(USDCAddress, oneUSDC, userAddress);
            console.log("✅ Gas estimate with 1 USDC successful:", gasEstimate5.toString());
        } catch (gasError5) {
            console.log("❌ Gas estimate with 1 USDC failed:", gasError5.message);
        }
        
        // Test 6: 0.1 USDC
        console.log("\nTest 6: 0.1 USDC");
        const pointOneUSDC = ethers.parseUnits("0.1", 6);
        try {
            const gasEstimate6 = await pool.repay.estimateGas(USDCAddress, pointOneUSDC, userAddress);
            console.log("✅ Gas estimate with 0.1 USDC successful:", gasEstimate6.toString());
        } catch (gasError6) {
            console.log("❌ Gas estimate with 0.1 USDC failed:", gasError6.message);
        }
        
    } catch (error) {
        console.log("❌ Error during analysis:", error.message);
    }
    
    console.log("\n💡 Analysis Summary:");
    console.log("1. Check if user actually has debt");
    console.log("2. Check if reserve is properly initialized");
    console.log("3. Check if user has sufficient balance");
    console.log("4. Test different repay amounts to find the sweet spot");
    console.log("5. The issue might be that we're trying to repay too much");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
