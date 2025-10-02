const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Decoding MaxUint256 Error");
    console.log("=" .repeat(50));
    
    // Transaction data from error
    const data = "0x5ceae9c4000000000000000000000000fc6a1358b663e41d2332e4496243f38fa043b056ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000d3cadfdfcba5d1a98e5cb0f531165375b2ea5e6c";
    const to = "0xc5D908AA6315579d7f4B81D34E9A0f43c312076C";
    const from = "0xd3CadFdfCbA5D1A98E5cb0F531165375b2EA5e6C";
    
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
            console.log("Amount (hex):", decoded.args[1].toString(16));
            console.log("Amount (is MaxUint256):", decoded.args[1] === ethers.MaxUint256);
            console.log("OnBehalfOf:", decoded.args[2]);
            
            // Check if amount is MaxUint256
            if (decoded.args[1] === ethers.MaxUint256) {
                console.log("\n⚠️ MaxUint256 detected!");
                console.log("This might cause gas estimation issues");
                console.log("Consider using a large but reasonable amount instead");
            }
            
        } catch (error) {
            console.log("❌ Error decoding:", error.message);
        }
    }
    
    console.log("\n🔍 Possible Causes:");
    console.log("1. MaxUint256 too large for gas estimation");
    console.log("2. Contract doesn't handle MaxUint256 properly");
    console.log("3. User has no debt to repay");
    console.log("4. Contract state issue");
    
    console.log("\n💡 Solutions:");
    console.log("1. Use a large but reasonable amount (e.g., 1M tokens)");
    console.log("2. Check if user has debt first");
    console.log("3. Use contract's getDebt function if available");
    console.log("4. Fallback to manual calculation");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
