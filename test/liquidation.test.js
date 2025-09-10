const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Liquidation Tests", function () {
    let owner, user1, liquidator;
    let mockOracle, riskManager, lendingPool;
    let weth, dai, usdc;
    
    const WAD = ethers.utils.parseEther("1"); // 1e18
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000 in 1e8 format
    const PRICE_DAI = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    const PRICE_USDC = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    
    // Risk parameters (in basis points)
    const LTV_WETH = 8000; // 80% LTV
    const LT_WETH = 8250;  // 82.5% LT
    const BONUS_WETH = 500; // 5% bonus
    
    const LTV_DAI = 8000; // 80% LTV
    const LT_DAI = 8500;  // 85% LT
    const BONUS_DAI = 500; // 5% bonus

    beforeEach(async function () {
        [owner, user1, liquidator] = await ethers.getSigners();
        
        // Deploy MockOracle
        const MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();
        
        // Set initial prices
        await mockOracle.setPrice(weth.address, PRICE_WETH);
        await mockOracle.setPrice(dai.address, PRICE_DAI);
        await mockOracle.setPrice(usdc.address, PRICE_USDC);
        
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
        dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
        usdc = await MockToken.deploy("USD Coin", "USDC", 6);
        
        // Add tokens to risk manager
        await riskManager.addToken(weth.address, true, LTV_WETH, LT_WETH, BONUS_WETH);
        await riskManager.addToken(dai.address, true, LTV_DAI, LT_DAI, BONUS_DAI);
        await riskManager.addToken(usdc.address, false, 0, 0, 0); // Not collateral
        
        // Add tokens to lending pool
        await lendingPool.addToken(weth.address);
        await lendingPool.addToken(dai.address);
        await lendingPool.addToken(usdc.address);
        
        // Mint tokens to users
        const mintAmount = ethers.utils.parseEther("1000");
        await weth.mint(user1.address, mintAmount);
        await weth.mint(liquidator.address, mintAmount);
        await dai.mint(user1.address, mintAmount);
        await dai.mint(liquidator.address, mintAmount);
        await usdc.mint(user1.address, ethers.utils.parseUnits("1000000", 6));
        await usdc.mint(liquidator.address, ethers.utils.parseUnits("1000000", 6));
        
        // Approve tokens
        await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await dai.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await usdc.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        
        await weth.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
        await dai.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
        await usdc.connect(liquidator).approve(lendingPool.address, ethers.constants.MaxUint256);
    });

    describe("Liquidation Setup", function () {
        it("Should set up user with unhealthy position", async function () {
            // Deposit 10 WETH (worth $20,000)
            const depositAmount = ethers.utils.parseEther("10");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 9000 DAI (worth $9000) - should be close to limit
            const borrowAmount = ethers.utils.parseEther("9000");
            await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
            
            // Check initial health factor
            let hf = await lendingPool.healthFactor(user1.address);
            console.log("Initial HF:", ethers.utils.formatEther(hf));
            
            // Reduce WETH price by 30% to make position unhealthy
            const newPrice = ethers.utils.parseUnits("1400", 8); // $1400
            await mockOracle.setPrice(weth.address, newPrice);
            
            // Check health factor after price drop
            hf = await lendingPool.healthFactor(user1.address);
            console.log("HF after price drop:", ethers.utils.formatEther(hf));
            
            // Should be liquidatable now
            const isLiquidatable = await lendingPool.isLiquidatable(user1.address);
            expect(isLiquidatable).to.be.true;
        });
    });

    describe("Liquidation Execution", function () {
        beforeEach(async function () {
            // Set up unhealthy position
            const depositAmount = ethers.utils.parseEther("10");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            const borrowAmount = ethers.utils.parseEther("9000");
            await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
            
            // Reduce WETH price to make position unhealthy
            const newPrice = ethers.utils.parseUnits("1400", 8); // $1400
            await mockOracle.setPrice(weth.address, newPrice);
        });

        it("Should execute liquidation correctly", async function () {
            const repayAmount = ethers.utils.parseEther("1000"); // 1000 DAI
            
            // Check liquidation amounts before execution
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
            
            // Get balances before liquidation
            const wethBalanceBefore = await weth.balanceOf(liquidator.address);
            const daiBalanceBefore = await dai.balanceOf(liquidator.address);
            const userDebtBefore = await lendingPool.getUserBorrow(user1.address, dai.address);
            const userCollateralBefore = await lendingPool.getUserSupply(user1.address, weth.address);
            
            // Execute liquidation
            await lendingPool.connect(liquidator).liquidate(
                user1.address,
                dai.address,
                weth.address,
                repayAmount
            );
            
            // Check balances after liquidation
            const wethBalanceAfter = await weth.balanceOf(liquidator.address);
            const daiBalanceAfter = await dai.balanceOf(liquidator.address);
            const userDebtAfter = await lendingPool.getUserBorrow(user1.address, dai.address);
            const userCollateralAfter = await lendingPool.getUserSupply(user1.address, weth.address);
            
            // Verify liquidation results
            expect(wethBalanceAfter).to.be.gt(wethBalanceBefore); // Liquidator received WETH
            expect(daiBalanceAfter).to.be.lt(daiBalanceBefore); // Liquidator spent DAI
            expect(userDebtAfter).to.be.lt(userDebtBefore); // User debt reduced
            expect(userCollateralAfter).to.be.lt(userCollateralBefore); // User collateral reduced
            
            // Check health factor improved
            const hfAfter = await lendingPool.healthFactor(user1.address);
            console.log("HF after liquidation:", ethers.utils.formatEther(hfAfter));
            expect(hfAfter).to.be.gt(ethers.utils.parseEther("1.0"));
        });

        it("Should prevent liquidation when user is healthy", async function () {
            // Restore WETH price to make position healthy
            await mockOracle.setPrice(weth.address, PRICE_WETH);
            
            const repayAmount = ethers.utils.parseEther("1000");
            
            await expect(
                lendingPool.connect(liquidator).liquidate(
                    user1.address,
                    dai.address,
                    weth.address,
                    repayAmount
                )
            ).to.be.revertedWith("User is not liquidatable");
        });

        it("Should prevent self-liquidation", async function () {
            const repayAmount = ethers.utils.parseEther("1000");
            
            await expect(
                lendingPool.connect(user1).liquidate(
                    user1.address,
                    dai.address,
                    weth.address,
                    repayAmount
                )
            ).to.be.revertedWith("Cannot liquidate yourself");
        });

        it("Should handle partial liquidation correctly", async function () {
            const repayAmount = ethers.utils.parseEther("500"); // Partial liquidation
            
            const userDebtBefore = await lendingPool.getUserBorrow(user1.address, dai.address);
            const userCollateralBefore = await lendingPool.getUserSupply(user1.address, weth.address);
            
            await lendingPool.connect(liquidator).liquidate(
                user1.address,
                dai.address,
                weth.address,
                repayAmount
            );
            
            const userDebtAfter = await lendingPool.getUserBorrow(user1.address, dai.address);
            const userCollateralAfter = await lendingPool.getUserSupply(user1.address, weth.address);
            
            // Should reduce debt and collateral proportionally
            expect(userDebtAfter).to.be.lt(userDebtBefore);
            expect(userCollateralAfter).to.be.lt(userCollateralBefore);
            expect(userDebtAfter).to.be.gt(0); // Still has some debt
        });

        it("Should cap repay amount to outstanding debt", async function () {
            const userDebt = await lendingPool.getUserBorrow(user1.address, dai.address);
            const excessiveRepay = userDebt.add(ethers.utils.parseEther("1000")); // More than debt
            
            const [actualRepay, collateralAmount, bonusBP] = await lendingPool.calculateLiquidationAmounts(
                user1.address,
                dai.address,
                weth.address,
                excessiveRepay
            );
            
            // Should cap to actual debt
            expect(actualRepay).to.equal(userDebt);
        });
    });

    describe("Liquidation Edge Cases", function () {
        it("Should revert when user has no debt", async function () {
            // Deposit but don't borrow
            const depositAmount = ethers.utils.parseEther("10");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            const repayAmount = ethers.utils.parseEther("1000");
            
            await expect(
                lendingPool.connect(liquidator).liquidate(
                    user1.address,
                    dai.address,
                    weth.address,
                    repayAmount
                )
            ).to.be.revertedWith("User has no debt in this asset");
        });

        it("Should revert when user has no collateral", async function () {
            // Borrow but don't deposit collateral
            const borrowAmount = ethers.utils.parseEther("1000");
            await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
            
            const repayAmount = ethers.utils.parseEther("500");
            
            await expect(
                lendingPool.connect(liquidator).liquidate(
                    user1.address,
                    dai.address,
                    weth.address,
                    repayAmount
                )
            ).to.be.revertedWith("User has no collateral in this asset");
        });

        it("Should revert when collateral asset is not supported", async function () {
            // Set up position with WETH collateral and DAI debt
            const depositAmount = ethers.utils.parseEther("10");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            const borrowAmount = ethers.utils.parseEther("9000");
            await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
            
            // Reduce price to make liquidatable
            await mockOracle.setPrice(weth.address, ethers.utils.parseUnits("1400", 8));
            
            const repayAmount = ethers.utils.parseEther("1000");
            
            // Try to liquidate with USDC as collateral (not supported as collateral)
            await expect(
                lendingPool.connect(liquidator).liquidate(
                    user1.address,
                    dai.address,
                    usdc.address,
                    repayAmount
                )
            ).to.be.revertedWith("Asset is not collateral");
        });
    });

    describe("Liquidation Math", function () {
        it("Should calculate liquidation amounts correctly", async function () {
            // Set up position
            const depositAmount = ethers.utils.parseEther("10");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            const borrowAmount = ethers.utils.parseEther("9000");
            await lendingPool.connect(user1).borrow(dai.address, borrowAmount);
            
            // Reduce price
            await mockOracle.setPrice(weth.address, ethers.utils.parseUnits("1400", 8));
            
            const repayAmount = ethers.utils.parseEther("1000");
            
            const [actualRepay, collateralAmount, bonusBP] = await lendingPool.calculateLiquidationAmounts(
                user1.address,
                dai.address,
                weth.address,
                repayAmount
            );
            
            // Manual calculation
            // repayUSD = 1000 DAI * $1 = $1000
            // collateralUSD_withBonus = $1000 * (1 + 5%) = $1050
            // collateralAmount = $1050 / $1400 = 0.75 WETH
            const expectedCollateralAmount = ethers.utils.parseEther("0.75");
            
            expect(actualRepay).to.equal(repayAmount);
            expect(collateralAmount).to.be.closeTo(expectedCollateralAmount, ethers.utils.parseEther("0.01"));
            expect(bonusBP).to.equal(BONUS_WETH);
        });
    });
});
