const { ethers } = require("ethers");

async function main() {
    console.log("🔄 Check Cross-Collateral Support");
    console.log("=================================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const daiAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const usdcAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
    // ABI
    const poolABI = [
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)'
    ];
    
    const tokenABI = [
        'function balanceOf(address) view returns (uint256)',
        'function symbol() view returns (string)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, tokenABI, deployer);
    const dai = new ethers.Contract(daiAddress, tokenABI, deployer);
    const usdc = new ethers.Contract(usdcAddress, tokenABI, deployer);
    
    try {
        console.log("📊 Step 1: Check Asset Balances");
        console.log("===============================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const daiBalance = await dai.balanceOf(deployer.address);
        const usdcBalance = await usdc.balanceOf(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("DAI Balance:", ethers.formatEther(daiBalance));
        console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
        
        console.log("\n📊 Step 2: Check Reserve Configuration");
        console.log("=====================================");
        
        const wethReserve = await pool.reserves(wethAddress);
        const daiReserve = await pool.reserves(daiAddress);
        const usdcReserve = await pool.reserves(usdcAddress);
        
        console.log("WETH Reserve:");
        console.log("- Is Borrowable:", wethReserve.isBorrowable);
        console.log("- LTV:", wethReserve.ltv.toString(), "(", Number(wethReserve.ltv) / 100, "%)");
        console.log("- Liquidation Threshold:", wethReserve.liquidationThreshold.toString());
        
        console.log("\nDAI Reserve:");
        console.log("- Is Borrowable:", daiReserve.isBorrowable);
        console.log("- LTV:", daiReserve.ltv.toString(), "(", Number(daiReserve.ltv) / 100, "%)");
        console.log("- Liquidation Threshold:", daiReserve.liquidationThreshold.toString());
        
        console.log("\nUSDC Reserve:");
        console.log("- Is Borrowable:", usdcReserve.isBorrowable);
        console.log("- LTV:", usdcReserve.ltv.toString(), "(", Number(usdcReserve.ltv) / 100, "%)");
        console.log("- Liquidation Threshold:", usdcReserve.liquidationThreshold.toString());
        
        console.log("\n📊 Step 3: Check Current Account State");
        console.log("======================================");
        
        const accountData = await pool.getAccountData(deployer.address);
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
        
        console.log("\n🔍 Cross-Collateral Analysis:");
        console.log("=============================");
        
        // Check if cross-collateral is supported
        const allAssetsBorrowable = wethReserve.isBorrowable && daiReserve.isBorrowable && usdcReserve.isBorrowable;
        const allAssetsHaveLTV = Number(wethReserve.ltv) > 0 && Number(daiReserve.ltv) > 0 && Number(usdcReserve.ltv) > 0;
        
        console.log("All assets are borrowable:", allAssetsBorrowable);
        console.log("All assets have LTV:", allAssetsHaveLTV);
        
        if (allAssetsBorrowable && allAssetsHaveLTV) {
            console.log("✅ Cross-collateral lending is supported!");
            console.log("💡 You can supply DAI + WETH and borrow USDC");
            
            // Calculate theoretical max borrow
            const wethValue = parseFloat(ethers.formatEther(wethBalance)) * 1600; // Assuming $1600/WETH
            const daiValue = parseFloat(ethers.formatEther(daiBalance)) * 1; // Assuming $1/DAI
            const totalCollateralValue = wethValue + daiValue;
            
            console.log("\n💰 Theoretical Cross-Collateral Calculation:");
            console.log("===========================================");
            console.log("WETH Value:", wethValue, "USD");
            console.log("DAI Value:", daiValue, "USD");
            console.log("Total Collateral Value:", totalCollateralValue, "USD");
            
            const maxBorrowWETH = wethValue * (Number(wethReserve.ltv) / 10000);
            const maxBorrowDAI = daiValue * (Number(daiReserve.ltv) / 10000);
            const maxBorrowUSDC = Math.min(maxBorrowWETH, maxBorrowDAI) * 0.8; // 80% of max
            
            console.log("Max borrow from WETH:", maxBorrowWETH, "USD");
            console.log("Max borrow from DAI:", maxBorrowDAI, "USD");
            console.log("Max borrow USDC:", maxBorrowUSDC, "USD");
            console.log("Max borrow USDC:", maxBorrowUSDC, "USDC");
            
        } else {
            console.log("❌ Cross-collateral lending may not be fully supported");
            console.log("💡 Some assets may not be configured properly");
        }
        
        console.log("\n📱 Frontend Implementation:");
        console.log("==========================");
        console.log("1. Supply DAI (as collateral)");
        console.log("2. Supply WETH (as collateral)");
        console.log("3. Enable both as collateral");
        console.log("4. Borrow USDC (using combined collateral)");
        console.log("5. Health factor should be calculated across all assets");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
