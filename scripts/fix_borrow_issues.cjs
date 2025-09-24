const { ethers } = require("ethers");

async function main() {
    console.log("🔧 Fix Borrow Issues");
    console.log("====================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
        'function lend(address asset, uint256 amount) external',
        'function borrow(address asset, uint256 amount) external'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Step 1: Check Current State");
        console.log("==============================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        const reserveData = await pool.reserves(wethAddress);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Reserve Cash:", ethers.formatEther(reserveData.reserveCash));
        console.log("Is Borrowable:", reserveData.isBorrowable);
        
        // Step 2: Supply WETH to create liquidity and collateral
        console.log("\n📊 Step 2: Supply WETH for Liquidity and Collateral");
        console.log("==================================================");
        
        if (parseFloat(ethers.formatEther(wethBalance)) >= 5) {
            console.log("Supplying 5 WETH to create liquidity...");
            
            // Approve WETH
            const approveTx = await weth.approve(lendingPoolAddress, ethers.parseEther("5.0"));
            await approveTx.wait();
            console.log("✅ WETH approved");
            
            // Supply WETH
            const lendTx = await pool.lend(wethAddress, ethers.parseEther("5.0"));
            const lendReceipt = await lendTx.wait();
            console.log("✅ Supply successful:", lendReceipt.transactionHash);
            
            // Check new state
            const newWethBalance = await weth.balanceOf(deployer.address);
            const newUserReserve = await pool.userReserves(deployer.address, wethAddress);
            const newAccountData = await pool.getAccountData(deployer.address);
            const newReserveData = await pool.reserves(wethAddress);
            
            console.log("\n📊 State After Supply:");
            console.log("======================");
            console.log("WETH Balance:", ethers.formatEther(newWethBalance));
            console.log("Supply Balance:", ethers.formatUnits(newUserReserve.supplyBalance1e18, 18));
            console.log("Borrow Balance:", ethers.formatUnits(newUserReserve.borrowBalance1e18, 18));
            console.log("Collateral Value:", ethers.formatEther(newAccountData.collateralValue1e18));
            console.log("Reserve Cash:", ethers.formatEther(newReserveData.reserveCash));
            console.log("Is Collateral:", newUserReserve.isCollateral);
            
            // Step 3: Try to borrow
            console.log("\n📊 Step 3: Test Borrow");
            console.log("======================");
            
            if (parseFloat(ethers.formatEther(newAccountData.collateralValue1e18)) > 0) {
                console.log("✅ Collateral found! Trying to borrow...");
                
                try {
                    const borrowAmount = ethers.parseEther("1.0"); // 1 WETH
                    console.log("Attempting to borrow 1 WETH...");
                    
                    const borrowTx = await pool.borrow(wethAddress, borrowAmount);
                    const borrowReceipt = await borrowTx.wait();
                    console.log("✅ Borrow successful:", borrowReceipt.transactionHash);
                    
                    // Check final state
                    const finalUserReserve = await pool.userReserves(deployer.address, wethAddress);
                    const finalAccountData = await pool.getAccountData(deployer.address);
                    
                    console.log("\n📊 Final State:");
                    console.log("================");
                    console.log("Supply Balance:", ethers.formatUnits(finalUserReserve.supplyBalance1e18, 18));
                    console.log("Borrow Balance:", ethers.formatUnits(finalUserReserve.borrowBalance1e18, 18));
                    console.log("Collateral Value:", ethers.formatEther(finalAccountData.collateralValue1e18));
                    console.log("Debt Value:", ethers.formatEther(finalAccountData.debtValue1e18));
                    
                    console.log("\n✅ Borrow is now working!");
                    console.log("Frontend should now show borrowable assets.");
                    
                } catch (borrowError) {
                    console.log("❌ Borrow failed:", borrowError.message);
                    console.log("💡 This indicates a contract issue.");
                }
                
            } else {
                console.log("❌ Still no collateral value after supply.");
                console.log("💡 This indicates a contract configuration issue.");
            }
            
        } else {
            console.log("❌ Insufficient WETH balance for supply");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
