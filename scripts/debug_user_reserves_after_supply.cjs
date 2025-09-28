const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging user reserves after supply with deployer:", deployer.address);
    
    // Contract addresses
    const lendingPoolAddress = "0x3a2200d9A1502a42a21675639148760a1a4B5A7a";
    const usdcAddress = "0x350E815Fb645165F1623b986D684a414220ac2FB";
    const wethAddress = "0x5EBc47af258F41a074893545af9d5c834e14cbc2";
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function lend(address asset, uint256 amount) external",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
    ], deployer);
    
    console.log("\n=== BEFORE SUPPLY ===");
    
    // Check USDC user reserves before
    const usdcUserReserveBefore = await lendingPool.userReserves(deployer.address, usdcAddress);
    console.log("USDC User Reserve Before:");
    console.log("  Supply Principal (raw):", usdcUserReserveBefore.supply.principal.toString());
    console.log("  Supply Principal (formatted):", ethers.formatUnits(usdcUserReserveBefore.supply.principal, 18));
    console.log("  Supply Index (raw):", usdcUserReserveBefore.supply.index.toString());
    console.log("  Borrow Principal (raw):", usdcUserReserveBefore.borrow.principal.toString());
    console.log("  Borrow Principal (formatted):", ethers.formatUnits(usdcUserReserveBefore.borrow.principal, 18));
    console.log("  Borrow Index (raw):", usdcUserReserveBefore.borrow.index.toString());
    console.log("  Use As Collateral:", usdcUserReserveBefore.useAsCollateral);
    
    // Check WETH user reserves before
    const wethUserReserveBefore = await lendingPool.userReserves(deployer.address, wethAddress);
    console.log("\nWETH User Reserve Before:");
    console.log("  Supply Principal (raw):", wethUserReserveBefore.supply.principal.toString());
    console.log("  Supply Principal (formatted):", ethers.formatUnits(wethUserReserveBefore.supply.principal, 18));
    console.log("  Supply Index (raw):", wethUserReserveBefore.supply.index.toString());
    console.log("  Borrow Principal (raw):", wethUserReserveBefore.borrow.principal.toString());
    console.log("  Borrow Principal (formatted):", ethers.formatUnits(wethUserReserveBefore.borrow.principal, 18));
    console.log("  Borrow Index (raw):", wethUserReserveBefore.borrow.index.toString());
    console.log("  Use As Collateral:", wethUserReserveBefore.useAsCollateral);
    
    console.log("\n=== SUPPLYING USDC ===");
    
    const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], deployer);
    
    const supplyAmount = ethers.parseUnits("100", 6); // 100 USDC
    
    try {
        // Approve USDC
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(lendingPoolAddress, supplyAmount);
        await approveTx.wait();
        console.log("✅ USDC approved");
        
        // Supply USDC
        console.log("Supplying 100 USDC to pool...");
        const supplyTx = await lendingPool.lend(usdcAddress, supplyAmount);
        await supplyTx.wait();
        console.log("✅ USDC supplied to pool");
        
    } catch (error) {
        console.log("❌ Error supplying USDC:", error.message);
    }
    
    console.log("\n=== AFTER SUPPLY ===");
    
    // Check USDC user reserves after
    const usdcUserReserveAfter = await lendingPool.userReserves(deployer.address, usdcAddress);
    console.log("USDC User Reserve After:");
    console.log("  Supply Principal (raw):", usdcUserReserveAfter.supply.principal.toString());
    console.log("  Supply Principal (formatted):", ethers.formatUnits(usdcUserReserveAfter.supply.principal, 18));
    console.log("  Supply Index (raw):", usdcUserReserveAfter.supply.index.toString());
    console.log("  Borrow Principal (raw):", usdcUserReserveAfter.borrow.principal.toString());
    console.log("  Borrow Principal (formatted):", ethers.formatUnits(usdcUserReserveAfter.borrow.principal, 18));
    console.log("  Borrow Index (raw):", usdcUserReserveAfter.borrow.index.toString());
    console.log("  Use As Collateral:", usdcUserReserveAfter.useAsCollateral);
    
    // Check WETH user reserves after
    const wethUserReserveAfter = await lendingPool.userReserves(deployer.address, wethAddress);
    console.log("\nWETH User Reserve After:");
    console.log("  Supply Principal (raw):", wethUserReserveAfter.supply.principal.toString());
    console.log("  Supply Principal (formatted):", ethers.formatUnits(wethUserReserveAfter.supply.principal, 18));
    console.log("  Supply Index (raw):", wethUserReserveAfter.supply.index.toString());
    console.log("  Borrow Principal (raw):", wethUserReserveAfter.borrow.principal.toString());
    console.log("  Borrow Principal (formatted):", ethers.formatUnits(wethUserReserveAfter.borrow.principal, 18));
    console.log("  Borrow Index (raw):", wethUserReserveAfter.borrow.index.toString());
    console.log("  Use As Collateral:", wethUserReserveAfter.useAsCollateral);
    
    // Check if borrow balance changed
    const borrowBalanceChanged = usdcUserReserveBefore.borrow.principal.toString() !== usdcUserReserveAfter.borrow.principal.toString();
    console.log("\n🔍 Analysis:");
    console.log("  USDC Borrow Balance Changed:", borrowBalanceChanged);
    console.log("  WETH Borrow Balance Changed:", wethUserReserveBefore.borrow.principal.toString() !== wethUserReserveAfter.borrow.principal.toString());
    
    if (borrowBalanceChanged) {
        console.log("❌ PROBLEM: Borrow balance changed when it shouldn't!");
        console.log("  Before:", ethers.formatUnits(usdcUserReserveBefore.borrow.principal, 18));
        console.log("  After:", ethers.formatUnits(usdcUserReserveAfter.borrow.principal, 18));
    } else {
        console.log("✅ Borrow balance unchanged (as expected)");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
