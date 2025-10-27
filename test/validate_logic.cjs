const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔍 VALIDATE LOGIC - Interest Rate & Borrowing", function () {
  let pool, usdc, dai, weth;
  let deployer, user1;
  
  before(async function () {
    [deployer, user1] = await ethers.getSigners();
    
    // Deploy contracts
    const TokenWithWithdraw = await ethers.getContractFactory("TokenWithWithdraw");
    usdc = await TokenWithWithdraw.deploy("USDC", "USDC", 6, 1000000);
    dai = await TokenWithWithdraw.deploy("DAI", "DAI", 18, 1000000);
    weth = await TokenWithWithdraw.deploy("WETH", "WETH", 18, 1000000);
    
    await usdc.waitForDeployment();
    await dai.waitForDeployment();
    await weth.waitForDeployment();
    
    // Deploy core
    const irm = await (await ethers.getContractFactory("InterestRateModel")).deploy();
    const oracle = await (await ethers.getContractFactory("PriceOracle")).deploy();
    pool = await (await ethers.getContractFactory("LendingPool")).deploy(
      await irm.getAddress(),
      await oracle.getAddress(),
      await weth.getAddress(),
      await dai.getAddress()
    );
    
    // Set prices
    await oracle.setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18));
    await oracle.setAssetPrice(await dai.getAddress(), ethers.parseUnits("1", 18));
    await oracle.setAssetPrice(await weth.getAddress(), ethers.parseUnits("1600", 18));
    
    // Init reserves
    const SECONDS_PER_YEAR = 365 * 24 * 3600;
    const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
    
    await pool.initReserve(
      await usdc.getAddress(), 6,
      1000, 8000, 8500, 500, 5000, true,
      8000, toRayPerSec(0.001), toRayPerSec(0.002), toRayPerSec(0.01)
    );
    
    await pool.initReserve(
      await dai.getAddress(), 18,
      1000, 8000, 8500, 500, 5000, true,
      8000, toRayPerSec(0.001), toRayPerSec(0.002), toRayPerSec(0.01)
    );
    
    await pool.initReserve(
      await weth.getAddress(), 18,
      1000, 8000, 8500, 500, 5000, false,
      8000, toRayPerSec(0.001), toRayPerSec(0.002), toRayPerSec(0.01)
    );
    
    // Mint tokens
    await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    await dai.mint(deployer.address, ethers.parseEther("1000000"));
    await weth.mint(user1.address, ethers.parseEther("100"));
  });
  
  describe("📊 Test 1: Interest Rate Calculation", function () {
    it("Should calculate rates correctly at 0% utilization", async function () {
      const reserve = await pool.reserves(await usdc.getAddress());
      
      const base = reserve.baseRateRayPerSec;
      const slope1 = reserve.slope1RayPerSec;
      
      console.log("Base Rate (RAY/sec):", base.toString());
      console.log("Slope1 (RAY/sec):", slope1.toString());
      
      // At 0% U, rate should be near base
      expect(reserve.variableBorrowRateRayPerSec).to.be.closeTo(base, base);
    });
    
    it("Should increase rate as utilization increases", async function () {
      // Supply 1000 USDC
      await usdc.approve(pool.target, ethers.parseUnits("1000", 6));
      await pool.lend(await usdc.getAddress(), ethers.parseUnits("1000", 6));
      
      const before = await pool.reserves(await usdc.getAddress());
      const rateBefore = before.variableBorrowRateRayPerSec;
      
      // Borrow 500 USDC (50% utilization)
      await usdc.approve(pool.target, ethers.parseUnits("500", 6));
      await pool.borrow(await usdc.getAddress(), ethers.parseUnits("500", 6));
      
      const after = await pool.reserves(await usdc.getAddress());
      const rateAfter = after.variableBorrowRateRayPerSec;
      
      console.log("Rate before:", rateBefore.toString());
      console.log("Rate after 50% U:", rateAfter.toString());
      
      // Rate should increase
      expect(rateAfter).to.be.gt(rateBefore);
    });
  });
  
  describe("💳 Test 2: Borrowing Mechanism", function () {
    it("Should borrow successfully with sufficient collateral", async function () {
      // User1 has WETH
      await weth.mint(user1.address, ethers.parseEther("1"));
      
      // Supply WETH as collateral
      await weth.connect(user1).approve(pool.target, ethers.MaxUint256);
      await pool.connect(user1).lend(await weth.getAddress(), ethers.parseEther("1"));
      
      // Try to borrow DAI
      const borrowAmount = ethers.parseEther("500");
      
      const balanceBefore = await dai.balanceOf(user1.address);
      await pool.connect(user1).borrow(await dai.getAddress(), borrowAmount);
      const balanceAfter = await dai.balanceOf(user1.address);
      
      const received = balanceAfter - balanceBefore;
      
      console.log("Expected:", ethers.formatEther(borrowAmount));
      console.log("Received:", ethers.formatEther(received));
      
      // Should receive close to borrow amount (minus some rounding)
      expect(received).to.be.closeTo(borrowAmount, ethers.parseEther("1"));
    });
    
    it("Should fail to borrow without collateral", async function () {
      const [user2] = await ethers.getSigners();
      
      // User2 has no collateral
      // Should fail
      await expect(
        pool.connect(user2).borrow(await dai.getAddress(), ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });
  
  describe("🏥 Test 3: Health Factor", function () {
    it("Should calculate health factor correctly", async function () {
      // Get user data
      const userData = await pool.getUserAccountData(user1.address);
      
      console.log("Collateral:", ethers.formatEther(userData.totalCollateral1e18));
      console.log("Debt:", ethers.formatEther(userData.totalDebt1e18));
      console.log("Health Factor:", ethers.formatEther(userData.healthFactor1e18));
      
      // Health factor should be > 1 if valid borrow
      expect(userData.healthFactor1e18).to.be.gt(ethers.parseEther("1"));
    });
  });
  
  describe("💰 Test 4: Interest Accrual", function () {
    it("Should accrue interest over time", async function () {
      const before = await pool.userReserves(user1.address, await dai.getAddress());
      const debtBefore = before.borrow.principal;
      
      console.log("Debt before:", ethers.formatEther(debtBefore));
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine");
      
      // Trigger accrue
      await pool._accrue(await dai.getAddress());
      
      const after = await pool.userReserves(user1.address, await dai.getAddress());
      const debtAfter = after.borrow.principal;
      
      console.log("Debt after 1 day:", ethers.formatEther(debtAfter));
      
      // Debt should increase (interest accrued)
      expect(debtAfter).to.be.gt(debtBefore);
    });
  });
});


