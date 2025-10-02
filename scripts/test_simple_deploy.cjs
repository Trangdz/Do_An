const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Simple Deploy");
    console.log("=" .repeat(50));
    
    try {
        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log("Deployer:", await deployer.getAddress());
        
        // Deploy a simple contract
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const token = await ERC20Mock.deploy("Test Token", "TEST", 18);
        await token.waitForDeployment();
        
        const address = await token.getAddress();
        console.log("Token deployed at:", address);
        
        // Check if contract exists
        const code = await ethers.provider.getCode(address);
        console.log("Contract code exists:", code !== "0x");
        console.log("Code length:", code.length);
        
        // Test a simple call
        const name = await token.name();
        console.log("Token name:", name);
        
        console.log("✅ Simple deploy test successful!");
        
    } catch (error) {
        console.log("❌ Deploy test failed:", error.message);
        console.log("Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
