const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging reserve cash with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x3a2200d9A1502a42a21675639148760a1a4B5A7a";
    const usdcAddress = "0x350E815Fb645165F1623b986D684a414220ac2FB";
    const daiAddress = "0xd9F21575429e82a69bC5CA820038ac4382544169";
    const wethAddress = "0x5EBc47af258F41a074893545af9d5c834e14cbc2";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    console.log("\n=== Debugging Reserve Cash ===");
    
    const tokens = [
        { address: usdcAddress, symbol: "USDC", decimals: 6 },
        { address: daiAddress, symbol: "DAI", decimals: 18 },
        { address: wethAddress, symbol: "WETH", decimals: 18 }
    ];
    
    for (const token of tokens) {
        try {
            console.log(`\n--- ${token.symbol} ---`);
            const reserve = await lendingPool.reserves(token.address);
            
            console.log("Contract decimals:", reserve.decimals);
            console.log("Config decimals:", token.decimals);
            console.log("Reserve Cash (raw):", reserve.reserveCash.toString());
            
            // Format with contract decimals
            const reserveCashContract = ethers.formatUnits(reserve.reserveCash, reserve.decimals);
            console.log("Reserve Cash (contract decimals):", reserveCashContract);
            
            // Format with config decimals
            const reserveCashConfig = ethers.formatUnits(reserve.reserveCash, token.decimals);
            console.log("Reserve Cash (config decimals):", reserveCashConfig);
            
            // Check if they're different
            if (reserveCashContract !== reserveCashConfig) {
                console.log("❌ MISMATCH: Contract and config decimals differ!");
            } else {
                console.log("✅ MATCH: Contract and config decimals are the same");
            }
            
        } catch (error) {
            console.log(`❌ Error getting reserve for ${token.symbol}:`, error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
