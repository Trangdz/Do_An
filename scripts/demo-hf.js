const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Health Factor Demo...\n");
    
    const [owner, user1] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    
    // Deploy contracts
    console.log("\n📊 Deploying contracts...");
    
    // Deploy MockOracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const mockOracle = await MockOracle.deploy();
    await mockOracle.deployed();
    console.log("MockOracle deployed to:", mockOracle.address);
    
    // Deploy RiskManager
    const RiskManager = await ethers.getContractFactory("RiskManager");
    const riskManager = await RiskManager.deploy(mockOracle.address);
    await riskManager.deployed();
    console.log("RiskManager deployed to:", riskManager.address);
    
    // Deploy LendingPoolV2
    const LendingPoolV2 = await ethers.getContractFactory("LendingPoolV2");
    const lendingPool = await LendingPoolV2.deploy(riskManager.address);
    await lendingPool.deployed();
    console.log("LendingPoolV2 deployed to:", lendingPool.address);
    
    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockToken");
    const weth = await MockToken.deploy("Wrapped Ether", "WETH", 18);
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await weth.deployed();
    await usdc.deployed();
    console.log("WETH deployed to:", weth.address);
    console.log("USDC deployed to:", usdc.address);
    
    // Set up prices
    console.log("\n💰 Setting up prices...");
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000
    const PRICE_USDC = ethers.utils.parseUnits("1", 8); // $1
    await mockOracle.setPrice(weth.address, PRICE_WETH);
    await mockOracle.setPrice(usdc.address, PRICE_USDC);
    console.log("WETH price: $2000");
    console.log("USDC price: $1");
    
    // Configure tokens in RiskManager
    console.log("\n⚙️ Configuring tokens...");
    const LTV_WETH = 8000; // 80% LTV
    const LT_WETH = 8250;  // 82.5% LT
    const BONUS_WETH = 500; // 5% bonus
    
    const LTV_USDC = 9000; // 90% LTV
    const LT_USDC = 9500;  // 95% LT
    const BONUS_USDC = 300; // 3% bonus
    
    await riskManager.addToken(weth.address, true, LTV_WETH, LT_WETH, BONUS_WETH);
    await riskManager.addToken(usdc.address, true, LTV_USDC, LT_USDC, BONUS_USDC);
    console.log("WETH: LTV=80%, LT=82.5%, Bonus=5%");
    console.log("USDC: LTV=90%, LT=95%, Bonus=3%");
    
    // Add tokens to lending pool
    await lendingPool.addToken(weth.address);
    await lendingPool.addToken(usdc.address);
    console.log("Tokens added to lending pool");
    
    // Mint tokens to user1
    console.log("\n🪙 Minting tokens to user1...");
    const mintAmount = ethers.utils.parseEther("1000");
    await weth.mint(user1.address, mintAmount);
    await usdc.mint(user1.address, ethers.utils.parseUnits("1000000", 6));
    console.log("Minted 1000 WETH and 1M USDC to user1");
    
    // Approve tokens
    await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await usdc.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    console.log("Tokens approved");
    
    // Demo scenario
    console.log("\n🎯 Starting Health Factor Demo Scenario...");
    
    // Step 1: Deposit 5 WETH
    console.log("\n1️⃣ Depositing 5 WETH...");
    const depositAmount = ethers.utils.parseEther("5");
    await lendingPool.connect(user1).supply(weth.address, depositAmount);
    
    let hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after deposit:", hf.toString() === ethers.constants.MaxUint256.toString() ? "∞ (no debt)" : ethers.utils.formatEther(hf));
    
    // Step 2: Borrow 6000 USDC
    console.log("\n2️⃣ Borrowing 6000 USDC...");
    const borrowAmount = ethers.utils.parseUnits("6000", 6);
    await lendingPool.connect(user1).borrow(usdc.address, borrowAmount);
    
    hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after borrow:", ethers.utils.formatEther(hf));
    console.log("Expected HF: ~1.375 (8,250 / 6,000)");
    
    // Step 3: Try to borrow more (should fail)
    console.log("\n3️⃣ Trying to borrow additional 3000 USDC...");
    try {
        await lendingPool.connect(user1).borrow(usdc.address, ethers.utils.parseUnits("3000", 6));
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected: Health factor too low");
    }
    
    // Step 4: Try to withdraw WETH (should fail)
    console.log("\n4️⃣ Trying to withdraw 2 WETH...");
    try {
        await lendingPool.connect(user1).withdraw(weth.address, ethers.utils.parseEther("2"));
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected: Health factor too low");
    }
    
    // Step 5: Simulate price drop
    console.log("\n5️⃣ Simulating 20% WETH price drop...");
    const newPrice = ethers.utils.parseUnits("1600", 8); // $1600
    await mockOracle.setPrice(weth.address, newPrice);
    console.log("WETH price changed from $2000 to $1600");
    
    hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after price drop:", ethers.utils.formatEther(hf));
    console.log("Expected HF: ~1.1 (6,600 / 6,000)");
    
    // Step 6: Try operations after price drop
    console.log("\n6️⃣ Testing operations after price drop...");
    
    // Try to borrow small amount
    try {
        await lendingPool.connect(user1).borrow(usdc.address, ethers.utils.parseUnits("500", 6));
        console.log("❌ This should have failed after price drop!");
    } catch (error) {
        console.log("✅ Correctly rejected: Health factor too low after price drop");
    }
    
    // Try to withdraw small amount
    try {
        await lendingPool.connect(user1).withdraw(weth.address, ethers.utils.parseEther("0.5"));
        console.log("❌ This should have failed after price drop!");
    } catch (error) {
        console.log("✅ Correctly rejected: Health factor too low after price drop");
    }
    
    // Step 7: Repay some debt to improve HF
    console.log("\n7️⃣ Repaying 1000 USDC to improve health factor...");
    await lendingPool.connect(user1).repay(usdc.address, ethers.utils.parseUnits("1000", 6));
    
    hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after repay:", ethers.utils.formatEther(hf));
    
    // Now should be able to withdraw small amount
    console.log("\n8️⃣ Testing withdraw after repay...");
    try {
        await lendingPool.connect(user1).withdraw(weth.address, ethers.utils.parseEther("0.5"));
        console.log("✅ Successfully withdrew 0.5 WETH");
        
        hf = await lendingPool.healthFactor(user1.address);
        console.log("Health Factor after withdraw:", ethers.utils.formatEther(hf));
    } catch (error) {
        console.log("❌ Withdraw failed:", error.message);
    }
    
    console.log("\n🎉 Health Factor Demo completed!");
    console.log("\nSummary:");
    console.log("- Health Factor prevents unsafe borrows and withdrawals");
    console.log("- Price changes affect health factor in real-time");
    console.log("- Users must maintain HF >= 1.0 to perform operations");
    console.log("- System protects against liquidation by blocking risky operations");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
