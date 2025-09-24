const { ethers } = require("ethers");

async function main() {
    console.log("🧪 Simple Ganache Test");
    console.log("=======================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Simple ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Account:", deployer.address);
    console.log("Network:", await provider.getNetwork());
    
    try {
        // Check balances
        const wethBalance = await weth.balanceOf(deployer.address);
        console.log("WETH Balance:", ethers.formatEther(wethBalance));
        
        // Check user reserves
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        console.log("User Reserve Data:");
        console.log("- Supply:", ethers.formatEther(userReserve.supplyBalance1e18));
        console.log("- Borrow:", ethers.formatEther(userReserve.borrowBalance1e18));
        console.log("- Is Collateral:", userReserve.isCollateral);
        
        // This is what frontend should show
        console.log("\n📱 Frontend Display:");
        console.log("Wallet:", ethers.formatEther(wethBalance), "WETH");
        console.log("Supplied:", ethers.formatEther(userReserve.supplyBalance1e18), "WETH");
        console.log("Borrowed:", ethers.formatEther(userReserve.borrowBalance1e18), "WETH");
        
        if (parseFloat(ethers.formatEther(userReserve.supplyBalance1e18)) > 0) {
            console.log("✅ Frontend should show supplied amount!");
        } else {
            console.log("❌ Frontend will show 0 supplied");
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);
