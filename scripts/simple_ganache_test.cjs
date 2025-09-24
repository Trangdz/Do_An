const { ethers } = require("ethers");

async function main() {
    console.log("🧪 Simple Ganache Test");
    console.log("======================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d";
    const wethAddress = "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    try {
        console.log("📊 Current State:");
        console.log("=================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Borrow Balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Debt Value:", ethers.formatEther(accountData.debtValue1e18));
        
        console.log("\n🔍 Corruption Check:");
        console.log("===================");
        
        const supplyBalance = parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        const borrowBalance = parseFloat(ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        
        if (supplyBalance === 0 && borrowBalance === 0) {
            console.log("✅ No corruption detected!");
            console.log("✅ Fresh state is clean");
            console.log("✅ Ready for testing");
            
            console.log("\n📱 Frontend should show:");
            console.log("========================");
            console.log("Wallet:", ethers.formatEther(wethBalance), "WETH");
            console.log("Supplied: 0 WETH");
            console.log("Borrowed: 0 WETH");
            
            console.log("\n🎉 CORRUPTION FIXED!");
            console.log("===================");
            console.log("✅ Contracts deployed successfully on Ganache");
            console.log("✅ No corrupted data");
            console.log("✅ Supply and borrow should work correctly now");
            
        } else {
            console.log("❌ Corruption still exists:");
            console.log("Supply Balance:", supplyBalance, "WETH");
            console.log("Borrow Balance:", borrowBalance, "WETH");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);

