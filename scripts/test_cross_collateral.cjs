const { ethers } = require("ethers");

async function main() {
    console.log("🔄 Test Cross-Collateral Lending");
    console.log("================================");
    
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
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
        'function lend(address asset, uint256 amount) external',
        'function borrow(address asset, uint256 amount) external'
    ];
    
    const tokenABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function symbol() view returns (string)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, tokenABI, deployer);
    const dai = new ethers.Contract(daiAddress, tokenABI, deployer);
    const usdc = new ethers.Contract(usdcAddress, tokenABI, deployer);
    
    try {
        console.log("📊 Step 1: Check Available Assets");
        console.log("=================================");
        
        // Check balances
        const wethBalance = await weth.balanceOf(deployer.address);
        const daiBalance = await dai.balanceOf(deployer.address);
        const usdcBalance = await usdc.balanceOf(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("DAI Balance:", ethers.formatEther(daiBalance));
        console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6)); // USDC has 6 decimals
        
        // Check reserve data for each asset
        console.log("\n📊 Step 2: Check Reserve Data");
        console.log("=============================");
        
        const wethReserve = await pool.reserves(wethAddress);
        const daiReserve = await pool.reserves(daiAddress);
        const usdcReserve = await pool.reserves(usdcAddress);
        
        console.log("WETH Reserve:");
        console.log("- Cash:", ethers.formatEther(wethReserve.reserveCash));
        console.log("- Is Borrowable:", wethReserve.isBorrowable);
        console.log("- LTV:", wethReserve.ltv.toString());
        
        console.log("\nDAI Reserve:");
        console.log("- Cash:", ethers.formatEther(daiReserve.reserveCash));
        console.log("- Is Borrowable:", daiReserve.isBorrowable);
        console.log("- LTV:", daiReserve.ltv.toString());
        
        console.log("\nUSDC Reserve:");
        console.log("- Cash:", ethers.formatUnits(usdcReserve.reserveCash, 6));
        console.log("- Is Borrowable:", usdcReserve.isBorrowable);
        console.log("- LTV:", usdcReserve.ltv.toString());
        
        // Step 3: Test cross-collateral scenario
        console.log("\n📊 Step 3: Test Cross-Collateral Scenario");
        console.log("========================================");
        
        console.log("Scenario: Supply DAI + WETH, then borrow USDC");
        
        // Check if we can supply DAI and WETH
        if (parseFloat(ethers.formatEther(daiBalance)) >= 1000 && parseFloat(ethers.formatEther(wethBalance)) >= 1) {
            console.log("✅ Sufficient DAI and WETH for supply");
            
            // Supply DAI
            console.log("\nSupplying 1000 DAI...");
            const daiApproveTx = await dai.approve(lendingPoolAddress, ethers.parseEther("1000"));
            await daiApproveTx.wait();
            const daiLendTx = await pool.lend(daiAddress, ethers.parseEther("1000"));
            await daiLendTx.wait();
            console.log("✅ DAI supplied");
            
            // Supply WETH
            console.log("Supplying 1 WETH...");
            const wethApproveTx = await weth.approve(lendingPoolAddress, ethers.parseEther("1"));
            await wethApproveTx.wait();
            const wethLendTx = await pool.lend(wethAddress, ethers.parseEther("1"));
            await wethLendTx.wait();
            console.log("✅ WETH supplied");
            
            // Check account data after supply
            const accountData = await pool.getAccountData(deployer.address);
            console.log("\n📊 Account Data After Supply:");
            console.log("=============================");
            console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
            console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
            console.log("Health Factor:", ethers.formatEther(accountData.healthFactor1e18));
            
            // Check if we can borrow USDC
            if (parseFloat(ethers.formatEther(accountData.collateralValue1e18)) > 0 && usdcReserve.isBorrowable) {
                console.log("\n📊 Step 4: Test USDC Borrow");
                console.log("===========================");
                
                try {
                    const usdcBorrowAmount = ethers.parseUnits("100", 6); // 100 USDC
                    console.log("Attempting to borrow 100 USDC...");
                    
                    const usdcBorrowTx = await pool.borrow(usdcAddress, usdcBorrowAmount);
                    const usdcBorrowReceipt = await usdcBorrowTx.wait();
                    console.log("✅ USDC borrow successful:", usdcBorrowReceipt.transactionHash);
                    
                    // Check final state
                    const finalAccountData = await pool.getAccountData(deployer.address);
                    const finalUsdcBalance = await usdc.balanceOf(deployer.address);
                    
                    console.log("\n📊 Final State:");
                    console.log("===============");
                    console.log("USDC Balance:", ethers.formatUnits(finalUsdcBalance, 6));
                    console.log("Total Debt Value:", ethers.formatEther(finalAccountData.debtValue1e18));
                    console.log("Health Factor:", ethers.formatEther(finalAccountData.healthFactor1e18));
                    
                    console.log("\n✅ Cross-collateral lending works!");
                    console.log("💡 You can supply DAI + WETH and borrow USDC");
                    
                } catch (borrowError) {
                    console.log("❌ USDC borrow failed:", borrowError.message);
                    console.log("💡 Cross-collateral may not be fully implemented");
                }
                
            } else {
                console.log("❌ Cannot borrow USDC:");
                console.log("- Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
                console.log("- USDC Is Borrowable:", usdcReserve.isBorrowable);
            }
            
        } else {
            console.log("❌ Insufficient DAI or WETH for test");
            console.log("DAI needed: 1000, available:", ethers.formatEther(daiBalance));
            console.log("WETH needed: 1, available:", ethers.formatEther(wethBalance));
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

