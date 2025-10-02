const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Phân tích hệ thống tính lãi suất LendHub v2");
    console.log("=" .repeat(60));
    
    const [deployer] = await ethers.getSigners();
    
    // Contract addresses
    const lendingPoolAddress = "0x9342B401e862bBbEe7EC4Cca268ef6A39CEa68Cc";
    const interestRateModelAddress = "0xb0648feFB2a48B4b478aBCF634Ecfb3b6A8B77Fb";
    const usdcAddress = "0x08ae23E02EB8dB6517a55241164F610c7E8b519d";
    const wethAddress = "0xD0472345d3C565Ff3f43d5D91dD01a073fE3536e";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function accruePublic(address asset) external"
    ], deployer);
    
    const interestRateModel = new ethers.Contract(interestRateModelAddress, [
        "function getRates(uint256 cash, uint256 debtNow, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external pure returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec)"
    ], deployer);
    
    console.log("\n📊 1. THÔNG TIN RESERVE HIỆN TẠI");
    console.log("-".repeat(40));
    
    // Check USDC reserve
    const usdcReserve = await lendingPool.reserves(usdcAddress);
    console.log("USDC Reserve:");
    console.log("  Reserve Cash:", ethers.formatEther(usdcReserve.reserveCash), "USDC");
    console.log("  Total Debt:", ethers.formatEther(usdcReserve.totalDebtPrincipal), "USDC");
    console.log("  Liquidity Index:", ethers.formatEther(usdcReserve.liquidityIndex));
    console.log("  Borrow Index:", ethers.formatEther(usdcReserve.variableBorrowIndex));
    console.log("  Liquidity Rate:", ethers.formatEther(usdcReserve.liquidityRateRayPerSec), "RAY/sec");
    console.log("  Borrow Rate:", ethers.formatEther(usdcReserve.variableBorrowRateRayPerSec), "RAY/sec");
    console.log("  Reserve Factor:", usdcReserve.reserveFactorBps.toString(), "bps");
    console.log("  Optimal U:", usdcReserve.optimalUBps.toString(), "bps");
    console.log("  Base Rate:", ethers.formatEther(usdcReserve.baseRateRayPerSec), "RAY/sec");
    console.log("  Slope 1:", ethers.formatEther(usdcReserve.slope1RayPerSec), "RAY/sec");
    console.log("  Slope 2:", ethers.formatEther(usdcReserve.slope2RayPerSec), "RAY/sec");
    console.log("  Last Update:", new Date(Number(usdcReserve.lastUpdate) * 1000).toLocaleString());
    
    console.log("\n📊 2. TÍNH TOÁN UTILIZATION RATE");
    console.log("-".repeat(40));
    
    const cash = usdcReserve.reserveCash;
    const debt = usdcReserve.totalDebtPrincipal;
    const utilization = debt == 0n ? 0 : (debt * ethers.parseEther("1")) / (cash + debt);
    
    console.log("Cash:", ethers.formatEther(cash));
    console.log("Debt:", ethers.formatEther(debt));
    console.log("Utilization Rate:", ethers.formatEther(utilization), "(" + (Number(ethers.formatEther(utilization)) * 100).toFixed(2) + "%)");
    
    console.log("\n📊 3. TÍNH TOÁN LÃI SUẤT THEO MÔ HÌNH 2-SLOPE");
    console.log("-".repeat(40));
    
    // Get rates from interest rate model
    const rates = await interestRateModel.getRates(
        cash,
        debt,
        usdcReserve.reserveFactorBps,
        usdcReserve.optimalUBps,
        usdcReserve.baseRateRayPerSec,
        usdcReserve.slope1RayPerSec,
        usdcReserve.slope2RayPerSec
    );
    
    console.log("Borrow Rate (RAY/sec):", ethers.formatEther(rates[0]));
    console.log("Supply Rate (RAY/sec):", ethers.formatEther(rates[1]));
    
    // Convert to APR
    const borrowRateAPR = Number(ethers.formatEther(rates[0])) * 365 * 24 * 3600;
    const supplyRateAPR = Number(ethers.formatEther(rates[1])) * 365 * 24 * 3600;
    
    console.log("Borrow Rate (APR):", (borrowRateAPR * 100).toFixed(4) + "%");
    console.log("Supply Rate (APR):", (supplyRateAPR * 100).toFixed(4) + "%");
    
    console.log("\n📊 4. PHÂN TÍCH MÔ HÌNH 2-SLOPE");
    console.log("-".repeat(40));
    
    const optimalU = Number(usdcReserve.optimalUBps) / 10000; // Convert bps to decimal
    const currentU = Number(ethers.formatEther(utilization));
    
    console.log("Optimal Utilization:", (optimalU * 100).toFixed(2) + "%");
    console.log("Current Utilization:", (currentU * 100).toFixed(2) + "%");
    
    if (currentU <= optimalU) {
        console.log("📈 Đang ở vùng Slope 1 (tăng trưởng tuyến tính)");
        const ratio = currentU / optimalU;
        console.log("Ratio U/U*:", ratio.toFixed(4));
    } else {
        console.log("📈 Đang ở vùng Slope 2 (tăng trưởng nhanh)");
        const ratio = (currentU - optimalU) / (1 - optimalU);
        console.log("Ratio (U-U*)/(1-U*):", ratio.toFixed(4));
    }
    
    console.log("\n📊 5. TÍNH TOÁN LÃI KÉP (COMPOUND INTEREST)");
    console.log("-".repeat(40));
    
    // Calculate time since last update
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = Number(usdcReserve.lastUpdate);
    const timeElapsed = now - lastUpdate;
    
    console.log("Time since last update:", timeElapsed, "seconds");
    console.log("Liquidity Index:", ethers.formatEther(usdcReserve.liquidityIndex));
    console.log("Borrow Index:", ethers.formatEther(usdcReserve.variableBorrowIndex));
    
    // Calculate new indices
    const RAY = ethers.parseEther("1000000000000000000000000000"); // 1e27
    const newLiquidityIndex = (usdcReserve.liquidityIndex * (RAY + rates[1] * BigInt(timeElapsed))) / RAY;
    const newBorrowIndex = (usdcReserve.variableBorrowIndex * (RAY + rates[0] * BigInt(timeElapsed))) / RAY;
    
    console.log("New Liquidity Index:", ethers.formatEther(newLiquidityIndex));
    console.log("New Borrow Index:", ethers.formatEther(newBorrowIndex));
    
    console.log("\n📊 6. KIỂM TRA USER POSITIONS");
    console.log("-".repeat(40));
    
    const userReserves = await lendingPool.userReserves(deployer.address, usdcAddress);
    console.log("User USDC Supply Principal:", ethers.formatEther(userReserves.supply.principal));
    console.log("User USDC Supply Index:", ethers.formatEther(userReserves.supply.index));
    console.log("User USDC Borrow Principal:", ethers.formatEther(userReserves.borrow.principal));
    console.log("User USDC Borrow Index:", ethers.formatEther(userReserves.borrow.index));
    
    // Calculate current supply and debt values
    if (userReserves.supply.principal > 0) {
        const currentSupply = (userReserves.supply.principal * usdcReserve.liquidityIndex) / userReserves.supply.index;
        console.log("Current Supply Value:", ethers.formatEther(currentSupply));
    }
    
    if (userReserves.borrow.principal > 0) {
        const currentDebt = (userReserves.borrow.principal * usdcReserve.variableBorrowIndex) / userReserves.borrow.index;
        console.log("Current Debt Value:", ethers.formatEther(currentDebt));
    }
    
    console.log("\n📊 7. TÓM TẮT HỆ THỐNG LÃI SUẤT");
    console.log("-".repeat(40));
    
    console.log("✅ Mô hình 2-slope: Tăng trưởng tuyến tính đến U*, sau đó tăng nhanh");
    console.log("✅ Lãi kép: Sử dụng index để tính lãi tích lũy theo thời gian");
    console.log("✅ Tự động cập nhật: Mỗi khi có giao dịch, rates được tính lại");
    console.log("✅ Reserve factor: Phần trăm lãi suất dành cho protocol");
    console.log("✅ Ray precision: Sử dụng RAY (1e27) để tính toán chính xác cao");
    
    console.log("\n🎯 KẾT LUẬN:");
    console.log("- Utilization hiện tại:", (currentU * 100).toFixed(2) + "%");
    console.log("- Lãi suất vay:", (borrowRateAPR * 100).toFixed(4) + "%");
    console.log("- Lãi suất cho vay:", (supplyRateAPR * 100).toFixed(4) + "%");
    console.log("- Chênh lệch (spread):", ((borrowRateAPR - supplyRateAPR) * 100).toFixed(4) + "%");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
