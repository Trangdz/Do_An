const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging user reserves for deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xE4A60C536053F3C239d2FaEc7848D33A6d21Cdac";
    const wethAddress = "0xe9cec17E93a6f103be7D2306D8a1E498247a0F92";
    const usdcAddress = "0xBf1507936e8c0550437318dD594B49D731311b59";
    const daiAddress = "0x9c83ed7D0b86ee035A39BEA31B389a975b55146b";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)",
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)"
    ], deployer);
    
    const tokens = [
        { symbol: "WETH", address: wethAddress, decimals: 18 },
        { symbol: "USDC", address: usdcAddress, decimals: 6 },
        { symbol: "DAI", address: daiAddress, decimals: 18 }
    ];
    
    console.log("\n=== User Reserve Data ===");
    
    for (const token of tokens) {
        console.log(`\n--- ${token.symbol} ---`);
        try {
            const userReserve = await lendingPool.userReserves(deployer.address, token.address);
            console.log("Supply Balance (raw):", userReserve.supplyBalance1e18.toString());
            console.log("Supply Balance (formatted 18):", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
            console.log("Supply Balance (formatted token decimals):", ethers.formatUnits(userReserve.supplyBalance1e18, token.decimals));
            console.log("Borrow Balance (raw):", userReserve.borrowBalance1e18.toString());
            console.log("Borrow Balance (formatted 18):", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
            console.log("Borrow Balance (formatted token decimals):", ethers.formatUnits(userReserve.borrowBalance1e18, token.decimals));
            console.log("Is Collateral:", userReserve.isCollateral);
        } catch (error) {
            console.log(`❌ Error getting ${token.symbol} user reserve:`, error.message);
        }
    }
    
    console.log("\n=== Account Data ===");
    try {
        const accountData = await lendingPool.getAccountData(deployer.address);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
    } catch (error) {
        console.log("❌ Error getting account data:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

