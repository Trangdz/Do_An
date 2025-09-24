const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Debug Supply Balance");
    console.log("========================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // Contract addresses
    const lendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // ABI
    const poolABI = [
        'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    
    const wethABI = [
        'function balanceOf(address) view returns (uint256)',
        'function totalSupply() view returns (uint256)'
    ];
    
    const pool = new ethers.Contract(lendingPoolAddress, poolABI, deployer);
    const weth = new ethers.Contract(wethAddress, wethABI, deployer);
    
    console.log("Account:", deployer.address);
    console.log("WETH Address:", wethAddress);
    console.log("LendingPool Address:", lendingPoolAddress);
    
    try {
        // Check WETH balance
        const wethBalance = await weth.balanceOf(deployer.address);
        console.log("\n📊 WETH Balance:");
        console.log("Raw balance:", wethBalance.toString());
        console.log("Formatted balance:", ethers.formatEther(wethBalance));
        
        // Check total supply
        const totalSupply = await weth.totalSupply();
        console.log("\n📊 WETH Total Supply:");
        console.log("Raw total supply:", totalSupply.toString());
        console.log("Formatted total supply:", ethers.formatEther(totalSupply));
        
        // Check user reserves
        const userReserve = await pool.userReserves(deployer.address, wethAddress);
        console.log("\n📊 User Reserve Data:");
        console.log("Raw supply balance:", userReserve.supplyBalance1e18.toString());
        console.log("Formatted supply balance:", ethers.formatUnits(userReserve.supplyBalance1e18, 18));
        console.log("Raw borrow balance:", userReserve.borrowBalance1e18.toString());
        console.log("Formatted borrow balance:", ethers.formatUnits(userReserve.borrowBalance1e18, 18));
        console.log("Is collateral:", userReserve.isCollateral);
        
        // Check account data
        const accountData = await pool.getAccountData(deployer.address);
        console.log("\n📊 Account Data:");
        console.log("Raw collateral value:", accountData.collateralValue1e18.toString());
        console.log("Formatted collateral value:", ethers.formatEther(accountData.collateralValue1e18));
        console.log("Raw debt value:", accountData.debtValue1e18.toString());
        console.log("Formatted debt value:", ethers.formatEther(accountData.debtValue1e18));
        
        // Calculate what should be displayed
        console.log("\n📱 Frontend Display Calculation:");
        console.log("================================");
        
        // Wallet balance (should use formatWETHBalance)
        const initialSupply = ethers.parseEther("1000000"); // 1M initial supply
        const actualBalance = wethBalance - initialSupply;
        const formattedWalletBalance = ethers.formatEther(actualBalance);
        console.log("Wallet Balance (after subtracting 1M):", formattedWalletBalance);
        
        // Supplied amount (should be exact from userReserves)
        const suppliedAmount = ethers.formatUnits(userReserve.supplyBalance1e18, 18);
        console.log("Supplied Amount (exact):", suppliedAmount);
        
        // Check if there's a mismatch
        console.log("\n🔍 Analysis:");
        console.log("============");
        console.log("You said you supplied 2 WETH");
        console.log("Blockchain shows:", suppliedAmount, "WETH supplied");
        console.log("Difference:", (parseFloat(suppliedAmount) - 2).toFixed(6), "WETH");
        
        if (Math.abs(parseFloat(suppliedAmount) - 2) < 0.000001) {
            console.log("✅ Supply amount matches!");
        } else {
            console.log("❌ Supply amount mismatch!");
            console.log("Possible causes:");
            console.log("1. Multiple supply transactions");
            console.log("2. Frontend calculation error");
            console.log("3. Contract state issue");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
