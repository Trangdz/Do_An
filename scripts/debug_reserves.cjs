const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging reserves for deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0xE4A60C536053F3C239d2FaEc7848D33A6d21Cdac";
    const wethAddress = "0xe9cec17E93a6f103be7D2306D8a1E498247a0F92";
    const usdcAddress = "0xBf1507936e8c0550437318dD594B49D731311b59";
    const daiAddress = "0x9c83ed7D0b86ee035A39BEA31B389a975b55146b";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
        "function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)"
    ], deployer);
    
    const tokens = [
        { symbol: "WETH", address: wethAddress, decimals: 18 },
        { symbol: "USDC", address: usdcAddress, decimals: 6 },
        { symbol: "DAI", address: daiAddress, decimals: 18 }
    ];
    
    console.log("\n=== Debugging Reserve Data ===");
    
    for (const token of tokens) {
        console.log(`\n--- ${token.symbol} ---`);
        try {
            const reserve = await lendingPool.reserves(token.address);
            console.log("Is Borrowable:", reserve.isBorrowable);
            console.log("Decimals:", reserve.decimals);
            console.log("Reserve Cash (raw):", reserve.reserveCash.toString());
            console.log("Reserve Cash (formatted):", ethers.formatUnits(reserve.reserveCash, reserve.decimals));
            console.log("Total Debt Principal:", ethers.formatUnits(reserve.totalDebtPrincipal, reserve.decimals));
            console.log("Liquidity Index:", ethers.formatUnits(reserve.liquidityIndex, 27));
            console.log("Variable Borrow Index:", ethers.formatUnits(reserve.variableBorrowIndex, 27));
            console.log("Liquidity Rate:", ethers.formatUnits(reserve.liquidityRateRayPerSec, 27));
            console.log("Variable Borrow Rate:", ethers.formatUnits(reserve.variableBorrowRateRayPerSec, 27));
            console.log("LTV:", reserve.ltvBps);
            console.log("Liquidation Threshold:", reserve.liqThresholdBps);
            console.log("Last Update:", reserve.lastUpdate);
        } catch (error) {
            console.log(`❌ Error getting ${token.symbol} reserve:`, error.message);
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
