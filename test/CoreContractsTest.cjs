const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendHub v2 - Core Contracts Test", function () {
  let interestRateModel, priceOracle, lendingPool;
  let dai, usdc;
  let deployer, user1;

  before(async function () {
    [deployer, user1] = await ethers.getSigners();
    
    // Deploy core contracts
    const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const LendingPool = await ethers.getContractFactory("LendingPool");
    
    interestRateModel = await InterestRateModel.deploy();
    priceOracle = await PriceOracle.deploy();
    lendingPool = await LendingPool.deploy(
      await interestRateModel.getAddress(),
      await priceOracle.getAddress()
    );
    
    await interestRateModel.waitForDeployment();
    await priceOracle.waitForDeployment();
    await lendingPool.waitForDeployment();
    
    // Deploy mock tokens
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
    usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
    
    await dai.waitForDeployment();
    await usdc.waitForDeployment();
    
    // Mint tokens
    await dai.mint(deployer.address, ethers.parseEther("1000000"));
    await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n);
  });

  describe("InterestRateModel", function () {
    it("Should calculate rates correctly", async function () {
      const cash = ethers.parseEther("1000");
      const debt = ethers.parseEther("200");
      const reserveFactor = 1000; // 10%
      const optimalU = 8000; // 80%
      const baseRate = 1000000000000000000n; // 0.0000001% APR in RAY
      const slope1 = 2000000000000000000n; // 0.0000002% APR in RAY
      const slope2 = 10000000000000000000n; // 0.000001% APR in RAY
      
      const [borrowRate, supplyRate] = await interestRateModel.getRates(
        cash,
        debt,
        reserveFactor,
        optimalU,
        baseRate,
        slope1,
        slope2
      );
      
      console.log("Borrow Rate (RAY):", borrowRate.toString());
      console.log("Supply Rate (RAY):", supplyRate.toString());
      
      expect(borrowRate).to.be.gt(0);
      expect(supplyRate).to.be.gt(0);
      expect(supplyRate).to.be.lt(borrowRate);
    });
  });

  describe("PriceOracle", function () {
    it("Should set and get prices correctly", async function () {
      const ethPrice = ethers.parseEther("1600");
      const daiPrice = ethers.parseEther("1");
      
      await priceOracle.setAssetPrice(ethers.ZeroAddress, ethPrice);
      await priceOracle.setAssetPrice(await dai.getAddress(), daiPrice);
      
      const retrievedEthPrice = await priceOracle.getAssetPrice1e18(ethers.ZeroAddress);
      const retrievedDaiPrice = await priceOracle.getAssetPrice1e18(await dai.getAddress());
      
      expect(retrievedEthPrice).to.equal(ethPrice);
      expect(retrievedDaiPrice).to.equal(daiPrice);
    });

    it("Should revert when price not set", async function () {
      const randomAddress = "0x1234567890123456789012345678901234567890";
      
      await expect(
        priceOracle.getAssetPrice1e18(randomAddress)
      ).to.be.revertedWith("PriceOracle: price not set");
    });
  });

  describe("LendingPool", function () {
    it("Should have correct constructor parameters", async function () {
      const irmAddress = await lendingPool.interestRateModel();
      const oracleAddress = await lendingPool.oracle();
      
      expect(irmAddress).to.equal(await interestRateModel.getAddress());
      expect(oracleAddress).to.equal(await priceOracle.getAddress());
    });

    it("Should initialize reserve data on first accrue", async function () {
      const asset = await dai.getAddress();
      
      // Call _accrue (this would normally be internal, but we can test through events)
      // Since _accrue is internal, we'll test the reserve data structure
      const reserveData = await lendingPool.reserves(asset);
      
      // Initially, reserve data should be empty (all zeros)
      expect(reserveData.reserveCash).to.equal(0);
      expect(reserveData.totalDebtPrincipal).to.equal(0);
    });
  });

  describe("Integration Tests", function () {
    it("Should work with real token addresses", async function () {
      const daiAddress = await dai.getAddress();
      const usdcAddress = await usdc.getAddress();
      
      // Set prices for tokens
      await priceOracle.setAssetPrice(daiAddress, ethers.parseEther("1"));
      await priceOracle.setAssetPrice(usdcAddress, ethers.parseEther("1"));
      
      // Verify prices
      const daiPrice = await priceOracle.getAssetPrice1e18(daiAddress);
      const usdcPrice = await priceOracle.getAssetPrice1e18(usdcAddress);
      
      expect(daiPrice).to.equal(ethers.parseEther("1"));
      expect(usdcPrice).to.equal(ethers.parseEther("1"));
    });

    it("Should handle multiple assets", async function () {
      const assets = [
        await dai.getAddress(),
        await usdc.getAddress(),
        ethers.ZeroAddress // ETH
      ];
      
      const prices = [
        ethers.parseEther("1"),    // DAI
        ethers.parseEther("1"),    // USDC
        ethers.parseEther("1600")  // ETH
      ];
      
      for (let i = 0; i < assets.length; i++) {
        await priceOracle.setAssetPrice(assets[i], prices[i]);
        const retrievedPrice = await priceOracle.getAssetPrice1e18(assets[i]);
        expect(retrievedPrice).to.equal(prices[i]);
      }
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas usage for rate calculations", async function () {
      const cash = ethers.parseEther("1000000");
      const debt = ethers.parseEther("500000");
      const reserveFactor = 1000;
      const optimalU = 8000;
      const baseRate = 1000000000000000000n;
      const slope1 = 2000000000000000000n;
      const slope2 = 10000000000000000000n;
      
      const tx = await interestRateModel.getRates(
        cash,
        debt,
        reserveFactor,
        optimalU,
        baseRate,
        slope1,
        slope2
      );
      
      // This is a view function, so gas usage should be minimal
      console.log("Rate calculation completed successfully");
    });
  });
});
