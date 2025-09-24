const { ethers } = require("ethers");

async function main() {
    console.log("🔄 Reset and Test Supply");
    console.log("=========================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function withdraw(address asset, uint256 amount) external returns (uint256)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Account:", deployer.address);
    
    try {
        // Check current state
        console.log("\n📊 Current State:");
        console.log("=================");
        
        const wethBalance = await weth.balanceOf(deployer.address);
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        const accountData = await pool.getAccountData(deployer.address);
        
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        console.log("Supply Balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Collateral Value:", ethers.formatEther(accountData.collateralValue1e18));
        
        // Withdraw all supplied amount to reset
        if (parseFloat(ethers.formatUnits(userReserve.supplyBalance1e18, 18)) > 0) {
            console.log("\n🔄 Withdrawing all supplied amount to reset...");
            
            const withdrawAmount = userReserve.supplyBalance1e18;
            console.log("Withdrawing amount:", ethers.formatUnits(withdrawAmount, 18), "WETH");
            
            const withdrawTx = await pool.withdraw(wethAddress, withdrawAmount);
            const withdrawReceipt = await withdrawTx.wait();
            console.log("✅ Withdraw successful:", withdrawReceipt.transactionHash);
            
            // Check state after withdraw
            const newWethBalance = await weth.balanceOf(deployer.address);
            const newUserReserve = await pool.userReserves(deployer.address, wethAddress);
            const newAccountData = await pool.getAccountData(deployer.address);
            
            console.log("\n📊 State After Withdraw:");
            console.log("========================");
            console.log("WETH Balance:", ethers.formatEther(newWethBalance));
            console.log("Supply Balance:", ethers.formatUnits(newUserReserve.supplyBalance1e18, 18));
            console.log("Collateral Value:", ethers.formatEther(newAccountData.collateralValue1e18));
            
            console.log("\n✅ Reset complete! Now you can test with exact amounts.");
            console.log("Try supplying exactly 2 WETH and check the result.");
            
        } else {
            console.log("\n✅ No supply to withdraw. State is already clean.");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
