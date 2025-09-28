const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking contract functions with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x4987cAeB6e491B03c35732990e98603701222B18";
    
    // Get contract code
    const code = await ethers.provider.getCode(lendingPoolAddress);
    console.log("Contract code length:", code.length);
    console.log("Contract exists:", code !== "0x");
    
    if (code === "0x") {
        console.log("❌ Contract does not exist at this address!");
        return;
    }
    
    // Try different function names
    const functions = [
        "userReserves(address,address)",
        "getUserReserveData(address,address)", 
        "getUserData(address,address)",
        "getUserBalance(address,address)",
        "getUserPosition(address,address)"
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, [
        "function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getUserData(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getUserBalance(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getUserPosition(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)"
    ], deployer);
    
    for (const funcName of functions) {
        try {
            console.log(`\n🔍 Testing function: ${funcName}`);
            const result = await pool[funcName.split('(')[0]](deployer.address, "0x0000000000000000000000000000000000000000");
            console.log(`✅ ${funcName} works!`);
            console.log("Result:", result);
            break;
        } catch (error) {
            console.log(`❌ ${funcName} failed:`, error.message);
        }
    }
    
    // Try to get contract ABI from etherscan or similar
    console.log("\n🔍 Trying to get contract info...");
    try {
        const network = await ethers.provider.getNetwork();
        console.log("Network:", network);
    } catch (error) {
        console.log("Error getting network:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
