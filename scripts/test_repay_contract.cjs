const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Repay Contract Functionality");
    console.log("=" .repeat(50));
    
    // Get the latest contract addresses
    const LendingPoolAddress = "0x8010A07493CF35631Fb478451aA1e51B49fBb44d";
    const USDCAddress = "0xBd642174B146fd79A6372c13a6b9bC92ee28BD48";
    const UserAddress = "0x18A442EC920Bcd4168e44b40ca70B233F44702D5";
    
    console.log("Contract Addresses:");
    console.log("LendingPool:", LendingPoolAddress);
    console.log("USDC:", USDCAddress);
    console.log("User:", UserAddress);
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const signer = await provider.getSigner(0); // Use account 0
    const actualUserAddress = await signer.getAddress();
    console.log("Using account:", actualUserAddress);
    
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
        "function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
    ], signer);
    
    const usdc = new ethers.Contract(USDCAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ], signer);
    
    // Check user data
    console.log("\nUser Account Data:");
    try {
        const accountData = await pool.getUserAccountData(actualUserAddress);
        console.log("Total Collateral ETH:", ethers.formatEther(accountData[0]));
        console.log("Total Debt ETH:", ethers.formatEther(accountData[1]));
        console.log("Available Borrows ETH:", ethers.formatEther(accountData[2]));
        console.log("Health Factor:", ethers.formatEther(accountData[5]));
        
        if (accountData[1] === 0n) {
            console.log("⚠️ User has no debt to repay!");
        }
    } catch (error) {
        console.log("❌ Error getting account data:", error.message);
    }
    
    // Check USDC balance
    console.log("\nUSDC Balance:");
    try {
        const balance = await usdc.balanceOf(actualUserAddress);
        console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");
        console.log("Balance (raw):", balance.toString());
    } catch (error) {
        console.log("❌ Error getting USDC balance:", error.message);
    }
    
    // Test different amounts
    console.log("\nTesting Different Amounts:");
    const testAmounts = [
        { amount: "0.000001", description: "1 unit (minimum)" },
        { amount: "0.000007", description: "7 units (from error)" },
        { amount: "0.001", description: "1000 units" },
        { amount: "1.0", description: "1 USDC" }
    ];
    
    for (const test of testAmounts) {
        console.log(`\nTesting: ${test.amount} (${test.description})`);
        
        try {
            const amountBN = ethers.parseUnits(test.amount, 6);
            console.log("Parsed amount:", amountBN.toString());
            
            // Check if amount is too small
            if (amountBN < 1n) {
                console.log("❌ Amount too small (< 1 unit)");
                continue;
            }
            
            // Try to estimate gas
            try {
                const gasEstimate = await pool.repay.estimateGas(USDCAddress, amountBN, actualUserAddress);
                console.log("✅ Gas estimate successful:", gasEstimate.toString());
            } catch (gasError) {
                console.log("❌ Gas estimate failed:", gasError.message);
                
                // Try to get more details
                if (gasError.data) {
                    console.log("Error data:", gasError.data);
                }
            }
            
        } catch (error) {
            console.log("❌ Parse error:", error.message);
        }
    }
    
    console.log("\n🔍 Debugging Tips:");
    console.log("1. Check if user has debt > 0");
    console.log("2. Check if user has USDC balance");
    console.log("3. Check if amount is >= 1 unit");
    console.log("4. Check contract state");
    console.log("5. Try with larger amount first");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
