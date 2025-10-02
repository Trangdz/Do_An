const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Decoding Estimate Gas Error");
    console.log("=" .repeat(50));
    
    // Transaction data from error
    const data = "0x5ceae9c40000000000000000000000004c763c7552204844f595aae1c727698cf301b3f20000000000000000000000000000000000000000000000000000000000000007000000000000000000000000134a910078ea745ab0134c279504ec06abf8c70c";
    const to = "0xbd7291F534fb3fDABF398a1D29D89Df2fe980d19";
    const from = "0x134a910078EA745Ab0134C279504ec06ABF8C70C";
    
    console.log("Transaction Details:");
    console.log("To:", to);
    console.log("From:", from);
    console.log("Data:", data);
    
    // Decode function selector
    const selector = data.substring(0, 10);
    console.log("\nFunction Selector:", selector);
    
    // Check if it's repay function
    const repaySelector = ethers.id('repay(address,uint256,address)').substring(0, 10);
    console.log("Repay Selector:", repaySelector);
    console.log("Is Repay Function:", selector === repaySelector);
    
    if (selector === repaySelector) {
        // Decode parameters
        const iface = new ethers.Interface([
            "function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)"
        ]);
        
        try {
            const decoded = iface.parseTransaction({ data, to });
            console.log("\nDecoded Parameters:");
            console.log("Asset:", decoded.args[0]);
            console.log("Amount (raw):", decoded.args[1].toString());
            console.log("Amount (6 decimals):", ethers.formatUnits(decoded.args[1], 6));
            console.log("Amount (18 decimals):", ethers.formatEther(decoded.args[1]));
            console.log("OnBehalfOf:", decoded.args[2]);
            
            // Check if amount is reasonable
            const amount6 = ethers.formatUnits(decoded.args[1], 6);
            const amount18 = ethers.formatEther(decoded.args[1]);
            
            console.log("\nAmount Analysis:");
            console.log("As 6 decimals:", amount6, "USDC");
            console.log("As 18 decimals:", amount18, "USDC");
            
            // The amount 0x7 = 7 in decimal - This is very small!
            console.log("⚠️ Amount is very small: 7 units");
            console.log("This might be causing the estimate gas to fail");
            
        } catch (error) {
            console.log("❌ Error decoding:", error.message);
        }
    }
    
    console.log("\n🔍 Possible Causes:");
    console.log("1. Amount too small (7 units)");
    console.log("2. User has no debt to repay");
    console.log("3. Contract state issue");
    console.log("4. Gas estimation failure");
    
    console.log("\n💡 Solutions:");
    console.log("1. Check if user has debt > 0");
    console.log("2. Use minimum viable amount");
    console.log("3. Add better error handling");
    console.log("4. Check contract state");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
