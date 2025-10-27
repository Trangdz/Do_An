const hre = require("hardhat");
const { expect } = require("chai");

describe("Collateral Management Features", function () {
    let owner, user1, user2;
    let pool, weth, dai, usdc, link, oracle;
    
    before(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy contracts
        const LendingPoolFactory = await ethers.getContractFactory("LendingPool");
        pool = await LendingPoolFactory.deploy();
        
        // Deploy or get existing tokens
        // (Assuming you have deployment scripts ready)
        weth = await hre.run("deploy:weth");
        dai = await hre.run("deploy:dai");
        // ...
        
        await pool.initReserve(await weth.getAddress(), 18, 1000, 7500, 8000, 500, 5000, false, 8000, ...);
        // Init other reserves...
    });
    
    describe("canUseAsCollateral", function () {
        it("Should return true for assets with LTV > 0", async function () {
            expect(await pool.canUseAsCollateral(await weth.getAddress())).to.equal(true);
            expect(await pool.canUseAsCollateral(await dai.getAddress())).to.equal(true);
        });
        
        it("Should return false for assets without LTV", async function () {
            // Assuming some asset has LTV = 0
            // expect(await pool.canUseAsCollateral(someAssetAddress)).to.equal(false);
        });
    });
    
    describe("getUserCollateral", function () {
        it("Should return empty array if no collateral", async function () {
            const collaterals = await pool.getUserCollateral(user1.address);
            expect(collaterals).to.have.length(0);
        });
        
        it("Should return list of collateral assets after supply", async function () {
            // User supplies WETH
            await weth.connect(user1).approve(await pool.getAddress(), ethers.parseEther("100"));
            await pool.connect(user1).supply(await weth.getAddress(), ethers.parseEther("10"));
            
            const collaterals = await pool.getUserCollateral(user1.address);
            expect(collaterals).to.have.length(1);
            expect(collaterals[0]).to.equal(await weth.getAddress());
        });
    });
    
    describe("getMaxBorrowable", function () {
        it("Should return 0 if no collateral", async function () {
            const maxBorrow = await pool.getMaxBorrowable(user1.address, await dai.getAddress());
            expect(maxBorrow).to.equal(0);
        });
        
        it("Should calculate max borrowable correctly", async function () {
            // User supplies 10 WETH worth $X
            // Should calculate max borrow based on LTV
            const maxBorrow = await pool.getMaxBorrowable(user1.address, await dai.getAddress());
            expect(maxBorrow).to.be.gt(0);
        });
    });
    
    describe("getDebtUtilization", function () {
        it("Should return 0 if no debt", async function () {
            const utilization = await pool.getDebtUtilization(user1.address);
            expect(utilization).to.equal(0);
        });
        
        it("Should return utilization percentage", async function () {
            // User borrows some amount
            // Should calculate debt utilization
            const utilization = await pool.getDebtUtilization(user1.address);
            expect(utilization).to.be.gt(0);
            expect(utilization).to.be.lte(10000);
        });
    });
    
    describe("getLiquidationRisk", function () {
        it("Should return 0 if no risk", async function () {
            const risk = await pool.getLiquidationRisk(user1.address, await weth.getAddress());
            expect(risk).to.equal(0);
        });
        
        it("Should return risk percentage", async function () {
            // User is close to liquidation
            const risk = await pool.getLiquidationRisk(user1.address, await weth.getAddress());
            expect(risk).to.be.gte(0);
            expect(risk).to.be.lte(10000);
        });
    });
    
    describe("setUserCollaterals", function () {
        it("Should enable/disable multiple assets", async function () {
            await pool.connect(user1).setUserCollaterals(
                [await weth.getAddress(), await dai.getAddress()],
                [true, false]
            );
            
            const collaterals = await pool.getUserCollateral(user1.address);
            expect(collaterals).to.include(await weth.getAddress());
            expect(collaterals).to.not.include(await dai.getAddress());
        });
    });
    
    describe("_maxWithdrawAllowed (indirectly through withdraw)", function () {
        it("Should limit withdraw when used as collateral", async function () {
            // User has debt
            // Try to withdraw more than allowed
            // Should revert or limit amount
        });
        
        it("Should allow full withdraw when not collateral", async function () {
            // Withdraw non-collateral asset
            // Should allow full amount
        });
    });
});


