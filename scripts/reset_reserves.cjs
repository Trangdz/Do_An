const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Resetting reserves for deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x69D16FAF50A11e1Da4dc12caC48f88C1062A793D";
    const wethAddress = "0x78328F2954A1760d15c32BEEAcCf165d57d98c31";
    const usdcAddress = "0x894A963813f5A2Abb30c80896138ACc10B7FE52B";
    const daiAddress = "0xD499e39f05eBECb25F1176C92a7680c9199246bF";
    const linkAddress = "0xE194bA78797AFb4F0995C00CC2A292D17CbBD811";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function initReserve(address asset, uint8 decimals, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external",
        "function reserves(address asset) external view returns (tuple(address asset, uint256 reserveCash, uint256 totalDebt, uint256 utilization, uint256 borrowRate, uint256 supplyRate, bool isBorrowable, bool isActive))"
    ], deployer);
    
    // Check current reserves
    console.log("\n=== Current Reserve Status ===");
    const tokens = [
        { symbol: "WETH", address: wethAddress, decimals: 18 },
        { symbol: "USDC", address: usdcAddress, decimals: 6 },
        { symbol: "DAI", address: daiAddress, decimals: 18 },
        { symbol: "LINK", address: linkAddress, decimals: 18 }
    ];
    
    for (const token of tokens) {
        try {
            const reserve = await lendingPool.reserves(token.address);
            console.log(`${token.symbol}: Active=${reserve.isActive}, Borrowable=${reserve.isBorrowable}, Cash=${ethers.formatUnits(reserve.reserveCash, token.decimals)}`);
        } catch (error) {
            console.log(`${token.symbol}: Error - ${error.message}`);
        }
    }
    
    console.log("\n=== Re-initializing Reserves ===");
    
    // Re-initialize reserves with correct parameters
    const SECONDS_PER_YEAR = 365 * 24 * 3600;
    const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
    
    const base = toRayPerSec(0.001);
    const s1 = toRayPerSec(0.002);
    const s2 = toRayPerSec(0.01);
    
    try {
        // Re-init WETH (collateral only)
        console.log("Re-initializing WETH...");
        await (await lendingPool.initReserve(
            wethAddress, 18,
            1000, 7500, 8000, 500, 5000,
            false, // isBorrowable = false
            8000, base, s1, s2
        )).wait();
        console.log("✅ WETH re-initialized");
        
        // Re-init DAI (borrowable)
        console.log("Re-initializing DAI...");
        await (await lendingPool.initReserve(
            daiAddress, 18,
            1000, 7500, 8000, 500, 5000,
            true, // isBorrowable = true
            8000, base, s1, s2
        )).wait();
        console.log("✅ DAI re-initialized");
        
        // Re-init USDC (borrowable)
        console.log("Re-initializing USDC...");
        await (await lendingPool.initReserve(
            usdcAddress, 6,
            1000, 7500, 8000, 500, 5000,
            true, // isBorrowable = true
            8000, base, s1, s2
        )).wait();
        console.log("✅ USDC re-initialized");
        
        // Re-init LINK (borrowable)
        console.log("Re-initializing LINK...");
        await (await lendingPool.initReserve(
            linkAddress, 18,
            1000, 7500, 8000, 500, 5000,
            true, // isBorrowable = true
            8000, base, s1, s2
        )).wait();
        console.log("✅ LINK re-initialized");
        
    } catch (error) {
        console.log("❌ Error re-initializing reserves:", error.message);
    }
    
    console.log("\n=== Final Reserve Status ===");
    for (const token of tokens) {
        try {
            const reserve = await lendingPool.reserves(token.address);
            console.log(`${token.symbol}: Active=${reserve.isActive}, Borrowable=${reserve.isBorrowable}, Cash=${ethers.formatUnits(reserve.reserveCash, token.decimals)}`);
        } catch (error) {
            console.log(`${token.symbol}: Error - ${error.message}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

