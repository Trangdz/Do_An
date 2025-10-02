const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Complete debt setup for repay test");
    console.log("=" .repeat(50));
    
    // Get the latest contract addresses
    const LendingPoolAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
    const USDCAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const WETHAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    console.log("Contract Addresses:");
    console.log("LendingPool:", LendingPoolAddress);
    console.log("USDC:", USDCAddress);
    console.log("WETH:", WETHAddress);
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const signer = await provider.getSigner(0); // Use account 0
    const userAddress = await signer.getAddress();
    console.log("Using account:", userAddress);
    
    // Create contract instances
    const pool = new ethers.Contract(LendingPoolAddress, [
        "function lend(address asset, uint256 amount) external",
        "function borrow(address asset, uint256 amount) external",
        "function setAsCollateral(address asset, bool useAsCollateral) external",
        "function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)"
    ], signer);
    
    const usdc = new ethers.Contract(USDCAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], signer);
    
    const weth = new ethers.Contract(WETHAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ], signer);
    
    try {
        // Step 1: Supply USDC to pool (to provide liquidity)
        console.log("\n🔧 Step 1: Supplying USDC to pool for liquidity...");
        const usdcSupplyAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        
        // Approve USDC
        const usdcApproveTx = await usdc.approve(LendingPoolAddress, usdcSupplyAmount);
        await usdcApproveTx.wait();
        console.log("✅ USDC approved");
        
        // Supply USDC
        const usdcSupplyTx = await pool.lend(USDCAddress, usdcSupplyAmount);
        await usdcSupplyTx.wait();
        console.log("✅ USDC supplied:", ethers.formatUnits(usdcSupplyAmount, 6), "USDC");
        
        // Step 2: Supply WETH as collateral
        console.log("\n🔧 Step 2: Supplying WETH as collateral...");
        const wethSupplyAmount = ethers.parseUnits("1", 18); // 1 WETH
        
        // Approve WETH
        const wethApproveTx = await weth.approve(LendingPoolAddress, wethSupplyAmount);
        await wethApproveTx.wait();
        console.log("✅ WETH approved");
        
        // Supply WETH
        const wethSupplyTx = await pool.lend(WETHAddress, wethSupplyAmount);
        await wethSupplyTx.wait();
        console.log("✅ WETH supplied:", ethers.formatUnits(wethSupplyAmount, 18), "WETH");
        
        // Set WETH as collateral
        const collateralTx = await pool.setAsCollateral(WETHAddress, true);
        await collateralTx.wait();
        console.log("✅ WETH set as collateral");
        
        // Step 3: Borrow USDC
        console.log("\n🔧 Step 3: Borrowing USDC...");
        const borrowAmount = ethers.parseUnits("100", 6); // 100 USDC
        
        const borrowTx = await pool.borrow(USDCAddress, borrowAmount);
        await borrowTx.wait();
        console.log("✅ USDC borrowed:", ethers.formatUnits(borrowAmount, 6), "USDC");
        
        // Step 4: Verify final state
        console.log("\n📊 Final State:");
        const userUsdcReserve = await pool.userReserves(userAddress, USDCAddress);
        const userWethReserve = await pool.userReserves(userAddress, WETHAddress);
        const finalUsdcBalance = await usdc.balanceOf(userAddress);
        
        console.log("USDC Supply Principal:", userUsdcReserve.supply.principal.toString());
        console.log("USDC Borrow Principal:", userUsdcReserve.borrow.principal.toString());
        console.log("WETH Supply Principal:", userWethReserve.supply.principal.toString());
        console.log("WETH Use As Collateral:", userWethReserve.useAsCollateral);
        console.log("Final USDC Balance:", ethers.formatUnits(finalUsdcBalance, 6), "USDC");
        
        if (userUsdcReserve.borrow.principal > 0) {
            console.log("✅ Debt setup successful!");
            console.log("Debt amount:", ethers.formatUnits(userUsdcReserve.borrow.principal, 6), "USDC");
            console.log("Now you can test repay functionality!");
        } else {
            console.log("❌ Debt setup failed");
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
