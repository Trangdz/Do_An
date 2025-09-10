const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Health Factor Tests", function () {
    let owner, user1, user2;
    let mockOracle, riskManager, lendingPool;
    let weth, usdc, dai, link;
    
    const WAD = ethers.utils.parseEther("1"); // 1e18
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000 in 1e8 format
    const PRICE_USDC = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    const PRICE_DAI = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    const PRICE_LINK = ethers.utils.parseUnits("20", 8); // $20 in 1e8 format
    
    // Risk parameters (in basis points)
    const LTV_WETH = 8000; // 80% LTV
    const LT_WETH = 8250;  // 82.5% LT
    const BONUS_WETH = 500; // 5% bonus
    
    const LTV_USDC = 9000; // 90% LTV
    const LT_USDC = 9500;  // 95% LT
    const BONUS_USDC = 300; // 3% bonus

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy MockOracle
        const MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();
        
        // Set initial prices
        await mockOracle.setPrice(weth.address, PRICE_WETH);
        await mockOracle.setPrice(usdc.address, PRICE_USDC);
        await mockOracle.setPrice(dai.address, PRICE_DAI);
        await mockOracle.setPrice(link.address, PRICE_LINK);
        
        // Deploy RiskManager
        const RiskManager = await ethers.getContractFactory("RiskManager");
        riskManager = await RiskManager.deploy(mockOracle.address);
        await riskManager.deployed();
        
        // Deploy LendingPoolV2
        const LendingPoolV2 = await ethers.getContractFactory("LendingPoolV2");
        lendingPool = await LendingPoolV2.deploy(riskManager.address);
        await lendingPool.deployed();
        
        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockToken");
        weth = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        usdc = await MockToken.deploy("USD Coin", "USDC", 6);
        dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
        link = await MockToken.deploy("Chainlink Token", "LINK", 18);
        
        // Add tokens to risk manager
        await riskManager.addToken(weth.address, true, LTV_WETH, LT_WETH, BONUS_WETH);
        await riskManager.addToken(usdc.address, true, LTV_USDC, LT_USDC, BONUS_USDC);
        await riskManager.addToken(dai.address, false, 0, 0, 0); // Not collateral
        await riskManager.addToken(link.address, false, 0, 0, 0); // Not collateral
        
        // Add tokens to lending pool
        await lendingPool.addToken(weth.address);
        await lendingPool.addToken(usdc.address);
        await lendingPool.addToken(dai.address);
        await lendingPool.addToken(link.address);
        
        // Mint tokens to users
        const mintAmount = ethers.utils.parseEther("1000");
        await weth.mint(user1.address, mintAmount);
        await weth.mint(user2.address, mintAmount);
        await usdc.mint(user1.address, ethers.utils.parseUnits("1000000", 6));
        await usdc.mint(user2.address, ethers.utils.parseUnits("1000000", 6));
        await dai.mint(user1.address, mintAmount);
        await dai.mint(user2.address, mintAmount);
        await link.mint(user1.address, mintAmount);
        await link.mint(user2.address, mintAmount);
        
        // Approve tokens
        await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await usdc.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await dai.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await link.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    });

    describe("Health Factor Calculation", function () {
        it("Should calculate correct health factor for WETH collateral", async function () {
            // Deposit 5 WETH (worth $10,000)
            const depositAmount = ethers.utils.parseEther("5");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Check health factor (no debt = infinite)
            let hf = await lendingPool.healthFactor(user1.address);
            expect(hf).to.equal(ethers.constants.MaxUint256);
            
            // Borrow 6000 USDC (worth $6000)
            const borrowAmount = ethers.utils.parseUnits("6000", 6);
            await lendingPool.connect(user1).borrow(usdc.address, borrowAmount);
            
            // Calculate expected HF
            // Collateral value = 5 WETH * $2000 = $10,000
            // Collateral value for HF = $10,000 * 82.5% = $8,250
            // Borrow value = $6,000
            // HF = $8,250 / $6,000 = 1.375 = 1.375e18
            const expectedHF = ethers.utils.parseEther("1.375");
            hf = await lendingPool.healthFactor(user1.address);
            expect(hf).to.be.closeTo(expectedHF, ethers.utils.parseEther("0.01"));
        });

        it("Should prevent borrow when health factor would be too low", async function () {
            // Deposit 5 WETH
            const depositAmount = ethers.utils.parseEther("5");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Try to borrow too much (should fail)
            const borrowAmount = ethers.utils.parseUnits("9000", 6); // $9000
            await expect(
                lendingPool.connect(user1).borrow(usdc.address, borrowAmount)
            ).to.be.revertedWith("Health factor too low after borrow");
        });

        it("Should prevent withdraw when health factor would be too low", async function () {
            // Deposit 5 WETH
            const depositAmount = ethers.utils.parseEther("5");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 6000 USDC
            const borrowAmount = ethers.utils.parseUnits("6000", 6);
            await lendingPool.connect(user1).borrow(usdc.address, borrowAmount);
            
            // Try to withdraw too much WETH (should fail)
            const withdrawAmount = ethers.utils.parseEther("2"); // $4000 worth
            await expect(
                lendingPool.connect(user1).withdraw(weth.address, withdrawAmount)
            ).to.be.revertedWith("Health factor too low after withdraw");
        });

        it("Should handle price changes affecting health factor", async function () {
            // Deposit 5 WETH
            const depositAmount = ethers.utils.parseEther("5");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 6000 USDC
            const borrowAmount = ethers.utils.parseUnits("6000", 6);
            await lendingPool.connect(user1).borrow(usdc.address, borrowAmount);
            
            // Check initial HF
            let hf = await lendingPool.healthFactor(user1.address);
            console.log("Initial HF:", ethers.utils.formatEther(hf));
            
            // Reduce WETH price by 20% (from $2000 to $1600)
            const newPrice = ethers.utils.parseUnits("1600", 8);
            await mockOracle.setPrice(weth.address, newPrice);
            
            // Check new HF
            hf = await lendingPool.healthFactor(user1.address);
            console.log("HF after price drop:", ethers.utils.formatEther(hf));
            
            // HF should be around 1.1 (8,250 * 0.8 / 6,000 = 1.1)
            const expectedHF = ethers.utils.parseEther("1.1");
            expect(hf).to.be.closeTo(expectedHF, ethers.utils.parseEther("0.01"));
            
            // Now borrow/withdraw should be more restricted
            await expect(
                lendingPool.connect(user1).borrow(usdc.address, ethers.utils.parseUnits("1000", 6))
            ).to.be.revertedWith("Health factor too low after borrow");
        });

        it("Should allow operations when health factor is sufficient", async function () {
            // Deposit 5 WETH
            const depositAmount = ethers.utils.parseEther("5");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 6000 USDC
            const borrowAmount = ethers.utils.parseUnits("6000", 6);
            await lendingPool.connect(user1).borrow(usdc.address, borrowAmount);
            
            // Should be able to withdraw small amount
            const withdrawAmount = ethers.utils.parseEther("0.5"); // $1000 worth
            await lendingPool.connect(user1).withdraw(weth.address, withdrawAmount);
            
            // Should be able to borrow small amount
            const additionalBorrow = ethers.utils.parseUnits("500", 6); // $500
            await lendingPool.connect(user1).borrow(usdc.address, additionalBorrow);
        });
    });

    describe("Risk Manager Functions", function () {
        it("Should calculate borrowable value correctly", async function () {
            const collateralAmounts = [ethers.utils.parseEther("5")];
            const collateralTokens = [weth.address];
            
            const borrowableValue = await riskManager.calculateBorrowableValue(
                collateralTokens,
                collateralAmounts
            );
            
            // 5 WETH * $2000 * 80% = $8000
            const expectedValue = ethers.utils.parseEther("8000");
            expect(borrowableValue).to.be.closeTo(expectedValue, ethers.utils.parseEther("1"));
        });

        it("Should calculate collateral value for HF correctly", async function () {
            const collateralAmounts = [ethers.utils.parseEther("5")];
            const collateralTokens = [weth.address];
            
            const collateralValue = await riskManager.calculateCollateralValueForHF(
                collateralTokens,
                collateralAmounts
            );
            
            // 5 WETH * $2000 * 82.5% = $8250
            const expectedValue = ethers.utils.parseEther("8250");
            expect(collateralValue).to.be.closeTo(expectedValue, ethers.utils.parseEther("1"));
        });

        it("Should return infinite HF when no debt", async function () {
            const collateralAmounts = [ethers.utils.parseEther("5")];
            const collateralTokens = [weth.address];
            const borrowAmounts = [];
            const borrowTokens = [];
            
            const hf = await riskManager.calculateHealthFactorWAD(
                collateralTokens,
                collateralAmounts,
                borrowTokens,
                borrowAmounts
            );
            
            expect(hf).to.equal(ethers.constants.MaxUint256);
        });
    });
});
