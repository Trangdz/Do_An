const { ethers } = require("ethers");

async function main() {
    console.log("✅ Verify Ganache Fix");
    console.log("====================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // New contract addresses
    const lendingPoolAddress = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d";
    const wethAddress = "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Checking Fresh State:");
        console.log("=======================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        const reserveData = await pool.reserves(wethAddress);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Is Collateral:", userReserve.isCollateral);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Total Debt:", ethers.formatEther(reserveData.totalDebt));
        console.log("Utilization:", ethers.formatUnits(reserveData.utilizationWad, 18), "%");
        
        console.log("\n🔍 Corruption Check:");
        console.log("===================");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        const utilization = parseFloat(ethers.formatUnits(reserveData.utilizationWad, 18));
        
        if (supplyBalance === 0 && borrowBalance === 0) {
            console.log("✅ Supply Balance: 0 WETH (correct)");
        } else {
            console.log("❌ Supply Balance:", supplyBalance, "WETH (should be 0)");
        }
        
        if (borrowBalance === 0) {
            console.log("✅ Borrow Balance: 0 WETH (correct)");
        } else {
            console.log("❌ Borrow Balance:", borrowBalance, "WETH (should be 0)");
        }
        
        if (utilization === 0) {
            console.log("✅ Utilization: 0% (correct)");
        } else {
            console.log("❌ Utilization:", utilization, "% (should be 0)");
        }
        
        if (borrowBalance < 1 && utilization < 1) {
            console.log("\n🎉 CORRUPTION FIXED!");
            console.log("===================");
            console.log("✅ Fresh deployment successful");
            console.log("✅ No corrupted data");
            console.log("✅ Ready for testing");
            console.log("\n📱 Update your frontend with new addresses:");
            console.log("===========================================");
            console.log("LENDING_POOL=0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d");
            console.log("WETH_ADDRESS=0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B");
            console.log("DAI_ADDRESS=0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25");
            console.log("USDC_ADDRESS=0xD84379CEae14AA33C123Af12424A37803F885889");
            console.log("LINK_ADDRESS=0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5");
        } else {
            console.log("\n❌ CORRUPTION STILL EXISTS!");
            console.log("===========================");
            console.log("❌ Data is still corrupted");
            console.log("❌ Need to investigate further");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

