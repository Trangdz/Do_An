const { ethers } = require("hardhat");

async function main() {
    console.log("Decoding transaction data...");
    
    // Transaction data from error
    const data = "0x4b8a3529000000000000000000000000f09cd31aecb6b86661e10dd7308b9ff183346a7d0000000000000000000000000000000000000000000000008ac7230489e80000";
    const to = "0xf4c1c75d3b446b3baa6d3f8259e3a20cf0825100";
    
    console.log("Transaction To:", to);
    console.log("Transaction Data:", data);
    
    // Decode function selector
    const selector = data.substring(0, 10);
    console.log("Function Selector:", selector);
    
    // Check if it's borrow function
    const borrowSelector = ethers.id('borrow(address,uint256)').substring(0, 10);
    console.log("Borrow Selector:", borrowSelector);
    console.log("Is Borrow Function:", selector === borrowSelector);
    
    if (selector === borrowSelector) {
        // Decode parameters
        const iface = new ethers.Interface([
            "function borrow(address asset, uint256 amount) external"
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
            
            // The amount 0x8ac7230489e80000 = 10000000000000000000 = 10 USDC (18 decimals)
            // But USDC should use 6 decimals, so this should be 0x989680 = 10000000 = 10 USDC (6 decimals)
            
            const correctAmount = ethers.parseUnits("10", 6); // 10 USDC in 6 decimals
            console.log("Correct amount (6 decimals):", correctAmount.toString());
            console.log("Correct amount (hex):", "0x" + correctAmount.toString(16));
            
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
