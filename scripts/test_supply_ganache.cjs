const { ethers } = require("ethers");

async function main() {
    console.log("🧪 Test Supply on Ganache");
    console.log("=========================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d";
    const wethAddress = "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
        'function lend(address asset, uint256 amount) external'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Step 1: Check Initial State");
        console.log("=============================");
        
        const initialWethBalance = await weth.balanceOf(deployer.address);
        const initialUserReserve = await pool.userReserves(deployer.address, wethAddress);
        const initialAccountData = await pool.getAccountData(deployer.address);
        
        console.log("Initial WETH Balance:", ethers.formatEther(initialWethBalance));
        console.log("Initial Supply Balance:", ethers.formatUnits(initialUserReserve.supplyBalance1e18, 18));
        console.log("Initial Borrow Balance:", ethers.formatUnits(initialUserReserve.borrowBalance1e18, 18));
        console.log("Initial Collateral Value:", ethers.formatEther(initialAccountData.collateralValue1e18));
        
        console.log("\n📊 Step 2: Test Supply 2 WETH");
        console.log("=============================");
        
        if (parseFloat(ethers.formatEther(initialWethBalance)) >= 2) {
            console.log("Supplying 2 WETH...");
            
            // Approve WETH
            const approveTx = await weth.approve(lendingPoolAddress, ethers.parseEther("2.0"));
            await approveTx.wait();
            console.log("✅ WETH approved");
            
            // Supply WETH
            const lendTx = await pool.lend(wethAddress, ethers.parseEther("2.0"));
            const lendReceipt = await lendTx.wait();
            console.log("✅ Supply successful:", lendReceipt.transactionHash);
            
            // Check state after supply
            const afterWethBalance = await weth.balanceOf(deployer.address);
            const afterUserReserve = await pool.userReserves(deployer.address, wethAddress);
            const afterAccountData = await pool.getAccountData(deployer.address);
            
            console.log("\n📊 Step 3: Check State After Supply");
            console.log("==================================");
            console.log("WETH Balance:", ethers.formatEther(afterWethBalance));
            console.log("Supply Balance:", ethers.formatUnits(afterUserReserve.supplyBalance1e18, 18));
            console.log("Borrow Balance:", ethers.formatUnits(afterUserReserve.borrowBalance1e18, 18));
            console.log("Collateral Value:", ethers.formatEther(afterAccountData.collateralValue1e18));
            console.log("Is Collateral:", afterUserReserve.isCollateral);
            
            // Analysis
            console.log("\n🔍 Analysis:");
            console.log("============");
            
            const supplyBalance = parseFloat(ethers.formatUnits(afterUserReserve.supplyBalance1e18, 18));
            const borrowBalance = parseFloat(ethers.formatUnits(afterUserReserve.borrowBalance1e18, 18));
            const collateralValue = parseFloat(ethers.formatEther(afterAccountData.collateralValue1e18));
            
            if (supplyBalance === 2.0) {
                console.log("✅ Supply Balance: 2.0 WETH (correct)");
            } else {
                console.log("❌ Supply Balance:", supplyBalance, "WETH (should be 2.0)");
            }
            
            if (borrowBalance === 0) {
                console.log("✅ Borrow Balance: 0 WETH (correct)");
            } else {
                console.log("❌ Borrow Balance:", borrowBalance, "WETH (should be 0)");
            }
            
            if (collateralValue > 0) {
                console.log("✅ Collateral Value:", collateralValue, "USD (correct)");
            } else {
                console.log("❌ Collateral Value: 0 USD (should be > 0)");
            }
            
            if (supplyBalance === 2.0 && borrowBalance === 0 && collateralValue > 0) {
                console.log("\n🎉 SUPPLY WORKS CORRECTLY!");
                console.log("=========================");
                console.log("✅ No corruption detected");
                console.log("✅ Supply increases supply balance");
                console.log("✅ Supply does NOT increase borrow balance");
                console.log("✅ Collateral value is calculated correctly");
            } else {
                console.log("\n❌ SUPPLY STILL HAS ISSUES!");
                console.log("==========================");
                console.log("❌ Corruption still exists");
                console.log("❌ Need to investigate further");
            }
            
        } else {
            console.log("❌ Insufficient WETH balance for test");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

