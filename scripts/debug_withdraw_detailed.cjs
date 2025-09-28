const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging withdraw in detail, deployer:", deployer.address);
    
    // User address from error message
    const userAddress = "0xd9b7fc43b964a38f1683d6a84e9e027f3b3a4494";
    
    // Contract addresses
    const lendingPoolAddress = "0xF4C1C75D3B446b3Baa6D3F8259e3A20cf0825100";
    const usdcAddress = "0xf09Cd31aECB6B86661e10Dd7308b9fF183346A7d";
    const withdrawAmount = ethers.parseUnits("10", 6); // 10 USDC
    
    // Create contracts
    const lendingPool = new ethers.Contract(lendingPoolAddress, [
        "function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)",
        "function _currentSupply(address user, address asset) external view returns (uint256)",
        "function _maxWithdrawAllowed(address user, address asset) external view returns (uint256)"
    ], deployer);
    
    console.log("\n=== Debug Withdraw Parameters ===");
    console.log("User:", userAddress);
    console.log("Asset:", usdcAddress);
    console.log("Requested Amount:", ethers.formatUnits(withdrawAmount, 6), "USDC");
    console.log("Requested Amount (1e18):", ethers.formatEther(withdrawAmount), "USDC");
    
    try {
        // Check user reserves
        const usdcUserReserve = await lendingPool.userReserves(userAddress, usdcAddress);
        console.log("\n=== User Reserve Data ===");
        console.log("Supply Principal:", ethers.formatEther(usdcUserReserve.supply.principal));
        console.log("Supply Index:", ethers.formatEther(usdcUserReserve.supply.index));
        console.log("Borrow Principal:", ethers.formatEther(usdcUserReserve.borrow.principal));
        console.log("Borrow Index:", ethers.formatEther(usdcUserReserve.borrow.index));
        console.log("Use As Collateral:", usdcUserReserve.useAsCollateral);
        
        // Check reserve data
        const usdcReserve = await lendingPool.reserves(usdcAddress);
        console.log("\n=== Reserve Data ===");
        console.log("Reserve Cash:", ethers.formatEther(usdcReserve.reserveCash));
        console.log("Total Debt Principal:", ethers.formatEther(usdcReserve.totalDebtPrincipal));
        console.log("Liquidity Index:", ethers.formatEther(usdcReserve.liquidityIndex));
        console.log("Decimals:", usdcReserve.decimals);
        
        // Check current supply
        const currentSupply = await lendingPool._currentSupply(userAddress, usdcAddress);
        console.log("\n=== Current Supply ===");
        console.log("Current Supply:", ethers.formatEther(currentSupply));
        
        // Check max withdraw allowed
        const maxWithdraw = await lendingPool._maxWithdrawAllowed(userAddress, usdcAddress);
        console.log("\n=== Max Withdraw Allowed ===");
        console.log("Max Withdraw:", ethers.formatEther(maxWithdraw));
        
        // Calculate what should happen
        console.log("\n=== Withdraw Calculation ===");
        const req1e18 = withdrawAmount; // Already in 1e18 format
        const balNow = currentSupply;
        const available = usdcReserve.reserveCash;
        const xMax = maxWithdraw;
        
        console.log("req1e18:", ethers.formatEther(req1e18));
        console.log("balNow:", ethers.formatEther(balNow));
        console.log("available:", ethers.formatEther(available));
        console.log("xMax:", ethers.formatEther(xMax));
        
        // Calculate amt
        let amt = req1e18;
        if (amt > balNow) amt = balNow;
        if (amt > available) amt = available;
        if (amt > xMax) amt = xMax;
        
        console.log("Final amt:", ethers.formatEther(amt));
        console.log("amt == 0:", amt == 0n);
        
        if (amt == 0n) {
            console.log("❌ amt == 0, will revert HealthFactorTooLow()");
        } else {
            console.log("✅ amt > 0, should succeed");
        }
        
    } catch (error) {
        console.log("❌ Error in debug:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
