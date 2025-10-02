const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debug Interest Rate Calculation");
    console.log("=" .repeat(50));
    
    const [deployer] = await ethers.getSigners();
    
    // Contract addresses
    const lendingPoolAddress = "0x9342B401e862bBbEe7EC4Cca268ef6A39CEa68Cc";
    const interestRateModelAddress = "0xb0648feFB2a48B4b478aBCF634Ecfb3b6A8B77Fb";
    const usdcAddress = "0x08ae23E02EB8dB6517a55241164F610c7E8b519d";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    const interestRateModel = new ethers.Contract(interestRateModelAddress, [
        "function getRates(uint256 cash, uint256 debtNow, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external pure returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec)"
    ], deployer);
    
    // Get reserve data
    const usdcReserve = await lendingPool.reserves(usdcAddress);
    
    console.log("\n📊 RESERVE DATA:");
    console.log("Reserve Cash:", ethers.formatEther(usdcReserve.reserveCash));
    console.log("Total Debt:", ethers.formatEther(usdcReserve.totalDebtPrincipal));
    console.log("Reserve Factor:", usdcReserve.reserveFactorBps.toString(), "bps");
    console.log("Optimal U:", usdcReserve.optimalUBps.toString(), "bps");
    console.log("Base Rate:", ethers.formatEther(usdcReserve.baseRateRayPerSec));
    console.log("Slope 1:", ethers.formatEther(usdcReserve.slope1RayPerSec));
    console.log("Slope 2:", ethers.formatEther(usdcReserve.slope2RayPerSec));
    
    console.log("\n📊 MANUAL CALCULATION:");
    
    // Manual calculation
    const cash = usdcReserve.reserveCash;
    const debt = usdcReserve.totalDebtPrincipal;
    const utilization = debt == 0n ? 0 : (debt * ethers.parseEther("1")) / (cash + debt);
    
    console.log("Utilization:", ethers.formatEther(utilization));
    
    // Convert bps to WAD
    const optimalU = (BigInt(usdcReserve.optimalUBps) * BigInt(1e14)); // 10000 bps -> 1e18
    console.log("Optimal U (WAD):", ethers.formatEther(optimalU));
    
    const base = BigInt(usdcReserve.baseRateRayPerSec);
    const s1 = BigInt(usdcReserve.slope1RayPerSec);
    const s2 = BigInt(usdcReserve.slope2RayPerSec);
    
    console.log("Base Rate:", ethers.formatEther(base));
    console.log("Slope 1:", ethers.formatEther(s1));
    console.log("Slope 2:", ethers.formatEther(s2));
    
    let borrowRate;
    if (utilization <= optimalU) {
        console.log("Using Slope 1 formula");
        const ratioWAD = optimalU == 0n ? 0n : (utilization * BigInt(1e18)) / optimalU;
        console.log("Ratio U/U*:", ethers.formatEther(ratioWAD));
        borrowRate = base + (s1 * ratioWAD) / BigInt(1e18);
    } else {
        console.log("Using Slope 2 formula");
        const numer = utilization - optimalU;
        const denom = BigInt(1e18) - optimalU;
        const ratioWAD = denom == 0n ? 0n : (numer * BigInt(1e18)) / denom;
        console.log("Ratio (U-U*)/(1-U*):", ethers.formatEther(ratioWAD));
        borrowRate = base + s1 + (s2 * ratioWAD) / BigInt(1e18);
    }
    
    console.log("Calculated Borrow Rate:", ethers.formatEther(borrowRate));
    
    // Calculate supply rate
    const reserveFactor = usdcReserve.reserveFactorBps;
    const oneMinusRF = (BigInt(10000 - reserveFactor) * BigInt(1e14)); // 10000 bps -> 1e18
    console.log("One Minus Reserve Factor:", ethers.formatEther(oneMinusRF));
    
    const supplyRate = (borrowRate * utilization) / BigInt(1e18);
    const supplyRateFinal = (supplyRate * oneMinusRF) / BigInt(1e18);
    
    console.log("Supply Rate (before RF):", ethers.formatEther(supplyRate));
    console.log("Supply Rate (after RF):", ethers.formatEther(supplyRateFinal));
    
    console.log("\n📊 CONTRACT CALCULATION:");
    
    // Get rates from contract
    const rates = await interestRateModel.getRates(
        cash,
        debt,
        usdcReserve.reserveFactorBps,
        usdcReserve.optimalUBps,
        usdcReserve.baseRateRayPerSec,
        usdcReserve.slope1RayPerSec,
        usdcReserve.slope2RayPerSec
    );
    
    console.log("Contract Borrow Rate:", ethers.formatEther(rates[0]));
    console.log("Contract Supply Rate:", ethers.formatEther(rates[1]));
    
    console.log("\n📊 APR CONVERSION:");
    
    // Convert to APR (Annual Percentage Rate)
    const secondsPerYear = 365 * 24 * 3600; // 31,536,000 seconds
    const borrowAPR = Number(ethers.formatEther(rates[0])) * secondsPerYear;
    const supplyAPR = Number(ethers.formatEther(rates[1])) * secondsPerYear;
    
    console.log("Borrow APR:", (borrowAPR * 100).toFixed(6) + "%");
    console.log("Supply APR:", (supplyAPR * 100).toFixed(6) + "%");
    
    console.log("\n📊 ANALYSIS:");
    console.log("The issue is that the base rate is very high:");
    console.log("Base Rate:", ethers.formatEther(base), "RAY/sec");
    console.log("This means:", (Number(ethers.formatEther(base)) * secondsPerYear * 100).toFixed(2) + "% APR");
    
    console.log("\n💡 RECOMMENDATION:");
    console.log("The base rate should be much lower for a realistic lending protocol.");
    console.log("Typical base rates are around 0.01% to 1% APR, not 100%+ APR.");
    console.log("Consider adjusting the base rate in the deployment script.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
