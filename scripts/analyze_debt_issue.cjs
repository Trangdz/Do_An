const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Analyzing Debt Issue - Why Not Zero?");
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
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (tuple(uint128 totalSupply, uint128 totalBorrow, uint128 reserveCash, uint128 borrowIndex, uint128 supplyIndex, uint8 decimals, bool isSupported, bool isBorrowable, bool isPaused) memory)",
        "function getBorrowBalance(address user, address asset) external view returns (uint256)"
    ], signer);
    
    try {
        // Step 1: Check current debt details
        console.log("\n📊 Current Debt Analysis:");
        const userReserve = await pool.userReserves(userAddress, USDCAddress);
        const reserveData = await pool.reserves(USDCAddress);
        
        console.log("User Reserve Data:");
        console.log("  Supply Principal:", userReserve.supply.principal.toString());
        console.log("  Supply Index:", userReserve.supply.index.toString());
        console.log("  Borrow Principal:", userReserve.borrow.principal.toString());
        console.log("  Borrow Index:", userReserve.borrow.index.toString());
        console.log("  Use As Collateral:", userReserve.useAsCollateral);
        
        console.log("\nReserve Data:");
        console.log("  Total Supply:", reserveData.totalSupply.toString());
        console.log("  Total Borrow:", reserveData.totalBorrow.toString());
        console.log("  Reserve Cash:", reserveData.reserveCash.toString());
        console.log("  Borrow Index:", reserveData.borrowIndex.toString());
        console.log("  Supply Index:", reserveData.supplyIndex.toString());
        console.log("  Decimals:", reserveData.decimals);
        console.log("  Is Supported:", reserveData.isSupported);
        console.log("  Is Borrowable:", reserveData.isBorrowable);
        console.log("  Is Paused:", reserveData.isPaused);
        
        // Step 2: Calculate total debt including interest
        console.log("\n🧮 Debt Calculation:");
        
        // Method 1: Using principal and index
        const principalDebt = userReserve.borrow.principal;
        const borrowIndex = userReserve.borrow.index;
        const initialIndex = BigInt(1e27); // RAY = 1e27
        
        console.log("Principal Debt:", principalDebt.toString());
        console.log("Borrow Index:", borrowIndex.toString());
        console.log("Initial Index:", initialIndex.toString());
        
        // Calculate total debt with interest
        const totalDebtWithInterest = (principalDebt * borrowIndex) / initialIndex;
        console.log("Total Debt (with interest):", totalDebtWithInterest.toString());
        console.log("Total Debt (formatted):", ethers.formatUnits(totalDebtWithInterest, 18), "USDC (18 decimals)");
        console.log("Total Debt (6 decimals):", ethers.formatUnits(totalDebtWithInterest, 6), "USDC (6 decimals)");
        
        // Method 2: Using getBorrowBalance (if available)
        try {
            const borrowBalance = await pool.getBorrowBalance(userAddress, USDCAddress);
            console.log("Borrow Balance (contract):", borrowBalance.toString());
            console.log("Borrow Balance (formatted):", ethers.formatUnits(borrowBalance, 18), "USDC (18 decimals)");
            console.log("Borrow Balance (6 decimals):", ethers.formatUnits(borrowBalance, 6), "USDC (6 decimals)");
        } catch (error) {
            console.log("getBorrowBalance not available:", error.message);
        }
        
        // Step 3: Calculate interest accrued
        console.log("\n💰 Interest Analysis:");
        const interestAccrued = totalDebtWithInterest - principalDebt;
        console.log("Interest Accrued:", interestAccrued.toString());
        console.log("Interest Accrued (formatted):", ethers.formatUnits(interestAccrued, 18), "USDC (18 decimals)");
        console.log("Interest Accrued (6 decimals):", ethers.formatUnits(interestAccrued, 6), "USDC (6 decimals)");
        
        // Step 4: Show why debt can't be exactly zero
        console.log("\n❓ Why Debt Can't Be Exactly Zero:");
        console.log("1. Interest accrues continuously over time");
        console.log("2. Each block adds interest to the debt");
        console.log("3. Repay only pays the principal amount");
        console.log("4. Interest remains and continues to accrue");
        console.log("5. To clear completely, need to repay principal + interest");
        
        // Step 5: Calculate exact amount needed to clear debt
        console.log("\n🎯 Exact Amount to Clear Debt:");
        const exactRepayAmount = totalDebtWithInterest;
        console.log("Exact repay amount:", exactRepayAmount.toString());
        console.log("Exact repay amount (6 decimals):", ethers.formatUnits(exactRepayAmount, 6), "USDC");
        
        // Step 6: Show the difference
        console.log("\n📈 Difference Analysis:");
        const principalIn6Decimals = ethers.formatUnits(principalDebt, 6);
        const totalIn6Decimals = ethers.formatUnits(totalDebtWithInterest, 6);
        const difference = parseFloat(totalIn6Decimals) - parseFloat(principalIn6Decimals);
        
        console.log("Principal (what we repaid):", principalIn6Decimals, "USDC");
        console.log("Total debt (what we should repay):", totalIn6Decimals, "USDC");
        console.log("Difference (interest):", difference.toFixed(6), "USDC");
        
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
