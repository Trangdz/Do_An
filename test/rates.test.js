const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Interest Rate Tests", function () {
    let owner, user1, user2;
    let mockOracle, riskManager, lendingPool, interestRateModel;
    let weth, dai, usdc;
    
    const WAD = ethers.utils.parseEther("1"); // 1e18
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000 in 1e8 format
    const PRICE_DAI = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    const PRICE_USDC = ethers.utils.parseUnits("1", 8); // $1 in 1e8 format
    
    // Interest rate parameters
    const BASE_RATE = ethers.utils.parseEther("0.01"); // 1%
    const SLOPE_1 = ethers.utils.parseEther("0.10");   // 10%
    const SLOPE_2 = ethers.utils.parseEther("0.60");   // 60%
    const KINK = ethers.utils.parseEther("0.80");      // 80%
    const RESERVE_FACTOR = ethers.utils.parseEther("0.10"); // 10%

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy mock tokens first
        const MockToken = await ethers.getContractFactory("MockToken");
        weth = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
        usdc = await MockToken.deploy("USD Coin", "USDC", 6);
        
        // Deploy MockOracle
        const MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();
        
        // Deploy RiskManager
        const RiskManager = await ethers.getContractFactory("RiskManager");
        riskManager = await RiskManager.deploy(mockOracle.address);
        await riskManager.deployed();
        
        // Deploy LendingPoolV2 (will create InterestRateModel internally)
        const LendingPoolV2 = await ethers.getContractFactory("LendingPoolV2");
        lendingPool = await LendingPoolV2.deploy(riskManager.address);
        await lendingPool.deployed();
        
        // Get InterestRateModel address
        const interestRateModelAddress = await lendingPool.getInterestRateModel();
        interestRateModel = await ethers.getContractAt("InterestRateModel", interestRateModelAddress);
        
        // Add tokens to lending pool first
        await lendingPool.addToken(weth.address);
        await lendingPool.addToken(dai.address);
        await lendingPool.addToken(usdc.address);
        
        // Add tokens to risk manager
        await riskManager.addToken(weth.address, true, 8000, 8250, 500);
        await riskManager.addToken(dai.address, true, 8000, 8500, 500);
        await riskManager.addToken(usdc.address, false, 0, 0, 0);
        
        // Add tokens to oracle with initial prices
        await mockOracle.addToken(weth.address, PRICE_WETH);
        await mockOracle.addToken(dai.address, PRICE_DAI);
        await mockOracle.addToken(usdc.address, PRICE_USDC);
        
        // Mint tokens to users
        const mintAmount = ethers.utils.parseEther("1000");
        await weth.connect(owner).mint(user1.address, mintAmount);
        await weth.connect(owner).mint(user2.address, mintAmount);
        await dai.connect(owner).mint(user1.address, mintAmount);
        await dai.connect(owner).mint(user2.address, mintAmount);
        await usdc.connect(owner).mint(user1.address, ethers.utils.parseUnits("1000000", 6));
        await usdc.connect(owner).mint(user2.address, ethers.utils.parseUnits("1000000", 6));
        
        // Approve tokens for user1
        await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await dai.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        await usdc.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
        
        // Approve tokens for user2
        await weth.connect(user2).approve(lendingPool.address, ethers.constants.MaxUint256);
        await dai.connect(user2).approve(lendingPool.address, ethers.constants.MaxUint256);
        await usdc.connect(user2).approve(lendingPool.address, ethers.constants.MaxUint256);
    });

    describe("Interest Rate Model", function () {
        it("Should return correct parameters", async function () {
            const [baseRate, slope1, slope2, kink, maxRate] = await interestRateModel.getParameters();
            
            expect(baseRate).to.equal(BASE_RATE);
            expect(slope1).to.equal(SLOPE_1);
            expect(slope2).to.equal(SLOPE_2);
            expect(kink).to.equal(KINK);
            expect(maxRate).to.equal(ethers.utils.parseEther("1.0"));
        });

        it("Should calculate rates correctly at 0% utilization", async function () {
            const utilization = ethers.utils.parseEther("0");
            const [borrowRate, supplyRate] = await interestRateModel.rates(utilization, RESERVE_FACTOR);
            
            // At 0% utilization: borrowRate = BASE_RATE = 1%
            expect(borrowRate).to.equal(BASE_RATE);
            // supplyRate should be 0 (no utilization)
            expect(supplyRate).to.equal(0);
        });

        it("Should calculate rates correctly at 50% utilization", async function () {
            const utilization = ethers.utils.parseEther("0.5");
            const [borrowRate, supplyRate] = await interestRateModel.rates(utilization, RESERVE_FACTOR);
            
            // At 50% utilization: borrowRate = BASE + SLOPE1 * (0.5 / 0.8) = 1% + 10% * 0.625 = 7.25%
            const expectedBorrowRate = BASE_RATE.add(SLOPE_1.mul(utilization).div(KINK));
            expect(borrowRate).to.be.closeTo(expectedBorrowRate, ethers.utils.parseEther("0.001"));
            
            // supplyRate = borrowRate * utilization * (1 - reserveFactor)
            const expectedSupplyRate = borrowRate.mul(utilization).mul(WAD.sub(RESERVE_FACTOR)).div(WAD);
            expect(supplyRate).to.be.closeTo(expectedSupplyRate, ethers.utils.parseEther("0.001"));
        });

        it("Should calculate rates correctly at kink point (80%)", async function () {
            const utilization = KINK;
            const [borrowRate, supplyRate] = await interestRateModel.rates(utilization, RESERVE_FACTOR);
            
            // At kink: borrowRate = BASE + SLOPE1 = 1% + 10% = 11%
            const expectedBorrowRate = BASE_RATE.add(SLOPE_1);
            expect(borrowRate).to.equal(expectedBorrowRate);
            
            // supplyRate = 11% * 80% * 90% = 7.92%
            const expectedSupplyRate = borrowRate.mul(utilization).mul(WAD.sub(RESERVE_FACTOR)).div(WAD);
            expect(supplyRate).to.be.closeTo(expectedSupplyRate, ethers.utils.parseEther("0.001"));
        });

        it("Should calculate rates correctly above kink (90%)", async function () {
            const utilization = ethers.utils.parseEther("0.9");
            const [borrowRate, supplyRate] = await interestRateModel.rates(utilization, RESERVE_FACTOR);
            
            // Above kink: borrowRate = BASE + SLOPE1 + SLOPE2 * ((0.9 - 0.8) / (1 - 0.8))
            // = 1% + 10% + 60% * (0.1 / 0.2) = 1% + 10% + 30% = 41%
            const excessUtilization = utilization.sub(KINK);
            const excessSlope = SLOPE_2.mul(excessUtilization).div(WAD.sub(KINK));
            const expectedBorrowRate = BASE_RATE.add(SLOPE_1).add(excessSlope);
            expect(borrowRate).to.be.closeTo(expectedBorrowRate, ethers.utils.parseEther("0.001"));
            
            // supplyRate = borrowRate * utilization * (1 - reserveFactor)
            const expectedSupplyRate = borrowRate.mul(utilization).mul(WAD.sub(RESERVE_FACTOR)).div(WAD);
            expect(supplyRate).to.be.closeTo(expectedSupplyRate, ethers.utils.parseEther("0.001"));
        });

        it("Should cap rates at maximum", async function () {
            const utilization = WAD; // 100%
            const [borrowRate, supplyRate] = await interestRateModel.rates(utilization, RESERVE_FACTOR);
            
            // Should be capped at 100%
            expect(borrowRate).to.equal(ethers.utils.parseEther("1.0"));
            expect(supplyRate).to.be.lte(borrowRate);
        });
    });

    describe("Pool Interest Rates", function () {
        it("Should return 0% rates when no deposits", async function () {
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            
            expect(utilizationRate).to.equal(0);
            expect(borrowAPR).to.equal(BASE_RATE);
            expect(supplyAPR).to.equal(0);
        });

        it("Should calculate rates correctly with deposits only", async function () {
            // Deposit 100 WETH
            const depositAmount = ethers.utils.parseEther("100");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            
            expect(utilizationRate).to.equal(0);
            expect(borrowAPR).to.equal(BASE_RATE);
            expect(supplyAPR).to.equal(0);
        });

        it("Should calculate rates correctly at 80% utilization", async function () {
            // Deposit 100 WETH
            const depositAmount = ethers.utils.parseEther("100");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 80 WETH (80% utilization)
            const borrowAmount = ethers.utils.parseEther("80");
            await lendingPool.connect(user2).borrow(weth.address, borrowAmount);
            
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            
            expect(utilizationRate).to.be.closeTo(ethers.utils.parseEther("0.8"), ethers.utils.parseEther("0.001"));
            
            // At kink: borrowAPR = 1% + 10% = 11%
            const expectedBorrowAPR = BASE_RATE.add(SLOPE_1);
            expect(borrowAPR).to.be.closeTo(expectedBorrowAPR, ethers.utils.parseEther("0.001"));
            
            // supplyAPR = 11% * 80% * 90% = 7.92%
            const expectedSupplyAPR = borrowAPR.mul(utilizationRate).mul(WAD.sub(RESERVE_FACTOR)).div(WAD);
            expect(supplyAPR).to.be.closeTo(expectedSupplyAPR, ethers.utils.parseEther("0.001"));
        });

        it("Should calculate rates correctly at 90% utilization", async function () {
            // Deposit 100 WETH
            const depositAmount = ethers.utils.parseEther("100");
            await lendingPool.connect(user1).supply(weth.address, depositAmount);
            
            // Borrow 90 WETH (90% utilization)
            const borrowAmount = ethers.utils.parseEther("90");
            await lendingPool.connect(user2).borrow(weth.address, borrowAmount);
            
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            
            expect(utilizationRate).to.be.closeTo(ethers.utils.parseEther("0.9"), ethers.utils.parseEther("0.001"));
            
            // Above kink: borrowAPR = 1% + 10% + 60% * (0.1 / 0.2) = 41%
            const excessUtilization = utilizationRate.sub(KINK);
            const excessSlope = SLOPE_2.mul(excessUtilization).div(WAD.sub(KINK));
            const expectedBorrowAPR = BASE_RATE.add(SLOPE_1).add(excessSlope);
            expect(borrowAPR).to.be.closeTo(expectedBorrowAPR, ethers.utils.parseEther("0.001"));
            
            // supplyAPR = borrowAPR * 90% * 90%
            const expectedSupplyAPR = borrowAPR.mul(utilizationRate).mul(WAD.sub(RESERVE_FACTOR)).div(WAD);
            expect(supplyAPR).to.be.closeTo(expectedSupplyAPR, ethers.utils.parseEther("0.001"));
        });

        it("Should handle different reserve factors", async function () {
            // Set reserve factor to 20%
            const newReserveFactor = ethers.utils.parseEther("0.20");
            await lendingPool.setReserveFactor(weth.address, newReserveFactor);
            
            // Deposit and borrow
            await lendingPool.connect(user1).supply(weth.address, ethers.utils.parseEther("100"));
            await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("80"));
            
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            
            // supplyAPR should be lower due to higher reserve factor
            const expectedSupplyAPR = borrowAPR.mul(utilizationRate).mul(WAD.sub(newReserveFactor)).div(WAD);
            expect(supplyAPR).to.be.closeTo(expectedSupplyAPR, ethers.utils.parseEther("0.001"));
        });
    });

    describe("Utilization Calculation", function () {
        it("Should calculate utilization correctly", async function () {
            // Deposit 100 WETH
            await lendingPool.connect(user1).supply(weth.address, ethers.utils.parseEther("100"));
            
            // Check utilization at different borrow levels
            let utilization = await lendingPool.utilization(weth.address);
            expect(utilization).to.equal(0);
            
            // Borrow 50 WETH
            await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("50"));
            utilization = await lendingPool.utilization(weth.address);
            expect(utilization).to.be.closeTo(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.001"));
            
            // Borrow more to reach 80%
            await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("30"));
            utilization = await lendingPool.utilization(weth.address);
            expect(utilization).to.be.closeTo(ethers.utils.parseEther("0.8"), ethers.utils.parseEther("0.001"));
        });

        it("Should cap utilization at 100%", async function () {
            // Deposit 100 WETH
            await lendingPool.connect(user1).supply(weth.address, ethers.utils.parseEther("100"));
            
            // Try to borrow more than deposited (should be limited by available liquidity)
            await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("100"));
            
            const utilization = await lendingPool.utilization(weth.address);
            expect(utilization).to.be.closeTo(ethers.utils.parseEther("1.0"), ethers.utils.parseEther("0.001"));
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero deposits gracefully", async function () {
            const utilization = await lendingPool.utilization(weth.address);
            expect(utilization).to.equal(0);
            
            const [borrowAPR, supplyAPR, utilizationRate] = await lendingPool.currentRates(weth.address);
            expect(utilizationRate).to.equal(0);
            expect(borrowAPR).to.equal(BASE_RATE);
            expect(supplyAPR).to.equal(0);
        });

        it("Should prevent setting invalid reserve factor", async function () {
            await expect(
                lendingPool.setReserveFactor(weth.address, ethers.utils.parseEther("1.1"))
            ).to.be.revertedWith("Reserve factor cannot exceed 100%");
        });

        it("Should prevent setting reserve factor for unsupported token", async function () {
            const unsupportedToken = ethers.Wallet.createRandom().address;
            await expect(
                lendingPool.setReserveFactor(unsupportedToken, ethers.utils.parseEther("0.1"))
            ).to.be.revertedWith("Token not supported");
        });
    });
});
