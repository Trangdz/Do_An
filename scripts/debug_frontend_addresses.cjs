const { ethers } = require("hardhat");

async function main() {
    console.log("Debugging frontend addresses...");
    
    // Read addresses from frontend
    const fs = require('fs');
    const path = require('path');
    
    try {
        const addressesPath = path.join(__dirname, '..', 'lendhub-frontend-nextjs', 'src', 'addresses.js');
        const addressesContent = fs.readFileSync(addressesPath, 'utf8');
        
        console.log("=== Frontend Addresses ===");
        console.log(addressesContent);
        
        // Extract addresses
        const lendingPoolMatch = addressesContent.match(/LendingPoolAddress = "([^"]+)"/);
        const usdcMatch = addressesContent.match(/USDCAddress = "([^"]+)"/);
        const wethMatch = addressesContent.match(/WETHAddress = "([^"]+)"/);
        
        if (lendingPoolMatch) {
            console.log("\nLendingPool Address:", lendingPoolMatch[1]);
        }
        if (usdcMatch) {
            console.log("USDC Address:", usdcMatch[1]);
        }
        if (wethMatch) {
            console.log("WETH Address:", wethMatch[1]);
        }
        
        // Check if addresses are valid
        const [deployer] = await ethers.getSigners();
        
        if (lendingPoolMatch) {
            const code = await ethers.provider.getCode(lendingPoolMatch[1]);
            console.log("\nLendingPool exists:", code !== "0x");
        }
        
        if (usdcMatch) {
            const code = await ethers.provider.getCode(usdcMatch[1]);
            console.log("USDC exists:", code !== "0x");
        }
        
        if (wethMatch) {
            const code = await ethers.provider.getCode(wethMatch[1]);
            console.log("WETH exists:", code !== "0x");
        }
        
    } catch (error) {
        console.log("❌ Error reading addresses:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
