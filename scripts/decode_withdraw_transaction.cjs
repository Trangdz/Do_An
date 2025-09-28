const { ethers } = require("hardhat");

async function main() {
    console.log("Decoding withdraw transaction data...");
    
    // Transaction data from error
    const data = "0xf3fef3a3000000000000000000000000f09cd31aecb6b86661e10dd7308b9ff183346a7d0000000000000000000000000000000000000000000000000000000000989680";
    const to = "0xf4c1c75d3b446b3baa6d3f8259e3a20cf0825100";
    
    console.log("Transaction To:", to);
    console.log("Transaction Data:", data);
    
    // Decode function selector
    const selector = data.substring(0, 10);
    console.log("Function Selector:", selector);
    
    // Check if it's withdraw function
    const withdrawSelector = ethers.id('withdraw(address,uint256)').substring(0, 10);
    console.log("Withdraw Selector:", withdrawSelector);
    console.log("Is Withdraw Function:", selector === withdrawSelector);
    
    if (selector === withdrawSelector) {
        // Decode parameters
        const iface = new ethers.Interface([
            "function withdraw(address asset, uint256 amount) external"
        ]);
        
        try {
            const decoded = iface.parseTransaction({ data, to });
            console.log("\nDecoded Parameters:");
            console.log("Asset:", decoded.args[0]);
            console.log("Amount (raw):", decoded.args[1].toString());
            console.log("Amount (6 decimals):", ethers.formatUnits(decoded.args[1], 6));
            console.log("Amount (18 decimals):", ethers.formatEther(decoded.args[1]));
            
            // Check if amount is reasonable
            const amount6 = ethers.formatUnits(decoded.args[1], 6);
            const amount18 = ethers.formatEther(decoded.args[1]);
            
            console.log("\nAmount Analysis:");
            console.log("As 6 decimals:", amount6, "USDC");
            console.log("As 18 decimals:", amount18, "USDC");
            
            // The amount 0x989680 = 10000000 = 10 USDC (6 decimals) - This looks correct!
            console.log("✅ Amount looks correct for USDC (6 decimals)");
            
        } catch (error) {
            console.log("❌ Error decoding:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
