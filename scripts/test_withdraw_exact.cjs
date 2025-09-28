const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing withdraw with exact parameters from error, deployer:", deployer.address);
    
    // Exact parameters from error message
    const userAddress = "0xd9b7fc43b964a38f1683d6a84e9e027f3b3a4494";
    const lendingPoolAddress = "0xf4c1c75d3b446b3baa6d3f8259e3a20cf0825100";
    const usdcAddress = "0xf09cd31aecb6b86661e10dd7308b9ff183346a7d";
    const withdrawAmount = "0x989680"; // 10000000 in hex = 10 USDC (6 decimals)
    
    console.log("User Address:", userAddress);
    console.log("LendingPool Address:", lendingPoolAddress);
    console.log("USDC Address:", usdcAddress);
    console.log("Withdraw Amount (hex):", withdrawAmount);
    console.log("Withdraw Amount (6 decimals):", ethers.formatUnits(withdrawAmount, 6));
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
    ], deployer);
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)"
    ], deployer);
    
    console.log("\n=== Check User State ===");
    
    try {
        // Check user reserves
        const usdcUserReserve = await lendingPool.userReserves(userAddress, usdcAddress);
        console.log("USDC Supply:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("USDC Use As Collateral:", usdcUserReserve.useAsCollateral);
        
        // Check USDC balance
        const usdcBalance = await usdc.balanceOf(userAddress);
        console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
        
    } catch (error) {
        console.log("❌ Error checking user state:", error.message);
        return;
    }
    
    console.log("\n=== Test Withdraw with Exact Parameters ===");
    
    try {
        const amountBN = BigInt(withdrawAmount);
        
        console.log("Withdrawing with exact parameters...");
        console.log("Amount (BigInt):", amountBN.toString());
        console.log("Amount (6 decimals):", ethers.formatUnits(amountBN, 6));
        
        // Try to estimate gas
        console.log("Estimating gas...");
        const gasEstimate = await lendingPool.withdraw.estimateGas(usdcAddress, amountBN);
        console.log("Gas Estimate:", gasEstimate.toString());
        
        // Try to call static
        console.log("Calling static...");
        const result = await lendingPool.withdraw.staticCall(usdcAddress, amountBN);
        console.log("Static call result:", result.toString());
        console.log("Static call result (6 decimals):", ethers.formatUnits(result, 6));
        
        // Try actual withdraw
        console.log("Attempting withdraw...");
        const withdrawTx = await lendingPool.withdraw(usdcAddress, amountBN);
        await withdrawTx.wait();
        console.log("✅ Withdraw successful!");
        
        // Check balances after withdraw
        const usdcBalanceAfter = await usdc.balanceOf(userAddress);
        console.log("USDC Balance after withdraw:", ethers.formatUnits(usdcBalanceAfter, 6));
        
    } catch (error) {
        console.log("❌ Withdraw failed:", error.message);
        
        // Try to decode revert reason
        if (error.data) {
            console.log("Error data:", error.data);
        }
        
        // Check if it's a specific revert
        if (error.message.includes("Health factor too low")) {
            console.log("❌ Health factor too low");
        } else if (error.message.includes("Insufficient balance")) {
            console.log("❌ Insufficient balance");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("❌ Invalid amount");
        } else {
            console.log("❌ Unknown error:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
