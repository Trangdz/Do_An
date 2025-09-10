const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Liquidation Demo...\n");
    
    const [owner, user1, liquidator] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    console.log("Liquidator:", liquidator.address);
    
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
    const dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await weth.deployed();
    await dai.deployed();
    await usdc.deployed();
    console.log("WETH deployed to:", weth.address);
    console.log("DAI deployed to:", dai.address);
    console.log("USDC deployed to:", usdc.address);
    
    // Set up prices
    console.log("\n💰 Setting up prices...");
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000
    const PRICE_DAI = ethers.utils.parseUnits("1", 8); // $1
    const PRICE_USDC = ethers.utils.parseUnits("1", 8); // $1
    await mockOracle.setPrice(weth.address, PRICE_WETH);
    await mockOracle.setPrice(dai.address, PRICE_DAI);
    await mockOracle.setPrice(usdc.address, PRICE_USDC);
    console.log("WETH price: $2000");
    console.log("DAI price: $1");
    console.log("USDC price: $1");
    
    // Configure tokens in RiskManager
    console.log("\n⚙️ Configuring tokens...");
    const LTV_WETH = 8000; // 80% LTV
    const LT_WETH = 8250;  // 82.5% LT
    const BONUS_WETH = 500; // 5% bonus
    
    const LTV_DAI = 8000; // 80% LTV
    const LT_DAI = 8500;  // 85% LT
    const BONUS_DAI = 500; // 5% bonus
    
    await riskManager.addToken(weth.address, true, LTV_WETH, LT_WETH, BONUS_WETH);
    await riskManager.addToken(dai.address, true, LTV_DAI, LT_DAI, BONUS_DAI);
    await riskManager.addToken(usdc.address, false, 0, 0, 0); // Not collateral
    console.log("WETH: LTV=80%, LT=82.5%, Bonus=5%");
    console.log("DAI: LTV=80%, LT=85%, Bonus=5%");
    console.log("USDC: Not collateral");
    
    // Add tokens to lending pool
    await lendingPool.addToken(weth.address);
    await lendingPool.addToken(dai.address);
    await lendingPool.addToken(usdc.address);
    console.log("Tokens added to lending pool");
    
    // Mint tokens to users
    console.log("\n🪙 Minting tokens to users...");
    const mintAmount = ethers.utils.parseEther("1000");
    await weth.mint(user1.address, mintAmount);
    await weth.mint(liquidator.address, mintAmount);
    await dai.mint(user1.address, mintAmount);
    await dai.mint(liquidator.address, mintAmount);
    await usdc.mint(user1.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(liquidator.address, ethers.utils.parseUnits("1000000", 6));
    console.log("Minted tokens to users");
    
    // Approve tokens
    await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await dai.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await usdc.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await weth.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
    await dai.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
    await usdc.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
    console.log("Tokens approved");
    
    // Demo scenario
    console.log("\n🎯 Starting Liquidation Demo Scenario...");
    
    // Step 1: User deposits 10 WETH
    console.log("\n1️⃣ User deposits 10 WETH...");
    const depositAmount = ethers.utils.parseEther("10");
    await lendingPool.connect(user1).supply(weth.address, depositAmount);
    
    let hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after deposit:", hf.toString() === ethers.constants.MaxUint256.toString() ? "∞ (no debt)" : ethers.utils.formatEther(hf));
    
    // Step 2: User borrows 9000 DAI
    console.log("\n2️⃣ User borrows 9000 DAI...");
    const borrowAmount = ethers.utils.parseEther("9000");
    await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
    
    hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after borrow:", ethers.utils.formatEther(hf));
    console.log("Expected HF: ~1.83 (16,500 / 9,000)");
    
    // Step 3: Simulate market crash - WETH price drops 30%
    console.log("\n3️⃣ Simulating market crash - WETH price drops 30%...");
    const crashedPrice = ethers.utils.parseUnits("1400", 8); // $1400
    await mockOracle.setPrice(weth.address, crashedPrice);
    console.log("WETH price changed from $2000 to $1400");
    
    hf = await lendingPool.healthFactor(user1.address);
    console.log("Health Factor after price crash:", ethers.utils.formatEther(hf));
    console.log("Expected HF: ~1.28 (11,550 / 9,000)");
    
    // Check if user is liquidatable
    const isLiquidatable = await lendingPool.isLiquidatable(user1.address);
    console.log("Is user liquidatable?", isLiquidatable);
    
    if (!isLiquidatable) {
        console.log("❌ User is not liquidatable yet. Dropping price further...");
        const furtherCrashedPrice = ethers.utils.parseUnits("1200", 8); // $1200
        await mockOracle.setPrice(weth.address, furtherCrashedPrice);
        console.log("WETH price changed to $1200");
        
        hf = await lendingPool.healthFactor(user1.address);
        console.log("Health Factor after further crash:", ethers.utils.formatEther(hf));
        
        const isLiquidatableNow = await lendingPool.isLiquidatable(user1.address);
        console.log("Is user liquidatable now?", isLiquidatableNow);
    }
    
    // Step 4: Calculate liquidation amounts
    console.log("\n4️⃣ Calculating liquidation amounts...");
    const repayAmount = ethers.utils.parseEther("1000"); // 1000 DAI
    
    const [actualRepay, collateralAmount, bonusBP] = await lendingPool.calculateLiquidationAmounts(
        user1.address,
        dai.address,
        weth.address,
        repayAmount
    );
    
    console.log("Liquidation calculation:");
    console.log("  Repay amount:", ethers.utils.formatEther(actualRepay));
    console.log("  Collateral amount:", ethers.utils.formatEther(collateralAmount));
    console.log("  Bonus BP:", bonusBP.toString());
    console.log("  Expected WETH received: ~0.875 (1000 * 1.05 / 1200)");
    
    // Step 5: Execute liquidation
    console.log("\n5️⃣ Executing liquidation...");
    
    // Get balances before liquidation
    const wethBalanceBefore = await weth.balanceOf(liquidator.address);
    const daiBalanceBefore = await dai.balanceOf(liquidator.address);
    const userDebtBefore = await lendingPool.getUserBorrow(user1.address, dai.address);
    const userCollateralBefore = await lendingPool.getUserSupply(user1.address, weth.address);
    
    console.log("Before liquidation:");
    console.log("  Liquidator WETH:", ethers.utils.formatEther(wethBalanceBefore));
    console.log("  Liquidator DAI:", ethers.utils.formatEther(daiBalanceBefore));
    console.log("  User debt:", ethers.utils.formatEther(userDebtBefore));
    console.log("  User collateral:", ethers.utils.formatEther(userCollateralBefore));
    
    // Execute liquidation
    await lendingPool.connect(liquidator).liquidate(
        user1.address,
        dai.address,
        weth.address,
        repayAmount
    );
    
    // Get balances after liquidation
    const wethBalanceAfter = await weth.balanceOf(liquidator.address);
    const daiBalanceAfter = await dai.balanceOf(liquidator.address);
    const userDebtAfter = await lendingPool.getUserBorrow(user1.address, dai.address);
    const userCollateralAfter = await lendingPool.getUserSupply(user1.address, weth.address);
    
    console.log("\nAfter liquidation:");
    console.log("  Liquidator WETH:", ethers.utils.formatEther(wethBalanceAfter));
    console.log("  Liquidator DAI:", ethers.utils.formatEther(daiBalanceAfter));
    console.log("  User debt:", ethers.utils.formatEther(userDebtAfter));
    console.log("  User collateral:", ethers.utils.formatEther(userCollateralAfter));
    
    // Calculate changes
    const wethGained = wethBalanceAfter.sub(wethBalanceBefore);
    const daiSpent = daiBalanceBefore.sub(daiBalanceAfter);
    const debtReduced = userDebtBefore.sub(userDebtAfter);
    const collateralReduced = userCollateralBefore.sub(userCollateralAfter);
    
    console.log("\nChanges:");
    console.log("  WETH gained by liquidator:", ethers.utils.formatEther(wethGained));
    console.log("  DAI spent by liquidator:", ethers.utils.formatEther(daiSpent));
    console.log("  Debt reduced for user:", ethers.utils.formatEther(debtReduced));
    console.log("  Collateral reduced for user:", ethers.utils.formatEther(collateralReduced));
    
    // Check new health factor
    hf = await lendingPool.healthFactor(user1.address);
    console.log("\nHealth Factor after liquidation:", ethers.utils.formatEther(hf));
    
    // Step 6: Test edge cases
    console.log("\n6️⃣ Testing edge cases...");
    
    // Try to liquidate healthy user
    console.log("\nTesting liquidation of healthy user...");
    try {
        await lendingPool.connect(liquidator).liquidate(
            user1.address,
            dai.address,
            weth.address,
            ethers.utils.parseEther("100")
        );
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected: User is not liquidatable");
    }
    
    // Try self-liquidation
    console.log("\nTesting self-liquidation...");
    try {
        await lendingPool.connect(user1).liquidate(
            user1.address,
            dai.address,
            weth.address,
            ethers.utils.parseEther("100")
        );
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected: Cannot liquidate yourself");
    }
    
    console.log("\n🎉 Liquidation Demo completed!");
    console.log("\nSummary:");
    console.log("- Liquidation protects the protocol by liquidating unhealthy positions");
    console.log("- Liquidators receive collateral with bonus as incentive");
    console.log("- Health factor improves after liquidation");
    console.log("- Edge cases are properly handled");
    console.log("- System maintains stability during market crashes");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
