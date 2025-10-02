const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Repay Dust Issue Tests", function () {
  let pool, usdc, priceFeed, rateModel, oracle;
  let user, admin;
  
  const USDC_DECIMALS = 6;
  const BORROW_AMOUNT = ethers.parseUnits("3", USDC_DECIMALS); // 3 USDC
  const BORROW_AMOUNT_HUMAN = "3"; // 3 USDC in human units

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();

    // Deploy contracts
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("USD Coin", "USDC", USDC_DECIMALS);
    
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    priceFeed = await MockV3Aggregator.deploy(8, ethers.parseUnits("1", 8)); // $1 price
    
    const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
    rateModel = await InterestRateModel.deploy();
    
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy();
    
    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(await oracle.getAddress(), await rateModel.getAddress());

    // Setup oracle
    await oracle.setAssetPrice(await usdc.getAddress(), await priceFeed.getAddress());

    // Setup pool
    await pool.initializeReserve(await usdc.getAddress(), USDC_DECIMALS, true, true);

    // Mint tokens
    await usdc.mint(admin.address, ethers.parseUnits("1000000", USDC_DECIMALS)); // 1M USDC
    await usdc.mint(user.address, ethers.parseUnits("100", USDC_DECIMALS)); // 100 USDC for user

    // Admin supplies liquidity
    await usdc.connect(admin).approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.connect(admin).lend(await usdc.getAddress(), ethers.parseUnits("100000", USDC_DECIMALS)); // 100K USDC

    // User supplies some USDC and borrows
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.connect(user).lend(await usdc.getAddress(), ethers.parseUnits("10", USDC_DECIMALS)); // 10 USDC
    
    // Borrow 3 USDC
    await pool.connect(user).borrow(await usdc.getAddress(), BORROW_AMOUNT);
  });

  it("Test A: Repay exact human amount (should leave dust)", async function () {
    console.log("=== Test A: Repay exact human amount (should leave dust) ===");
    
    // Get initial debt
    const initialDebt = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Initial debt (raw):", initialDebt.toString());
    console.log("Initial debt (human):", ethers.formatUnits(initialDebt, USDC_DECIMALS));
    
    // Advance time to accrue interest
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    // Get debt after interest accrual
    const debtAfterInterest = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after interest (raw):", debtAfterInterest.toString());
    console.log("Debt after interest (human):", ethers.formatUnits(debtAfterInterest, USDC_DECIMALS));
    console.log("Interest accrued:", (debtAfterInterest - initialDebt).toString());
    
    // User tries to repay exact human amount (3 USDC)
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    const repayAmount = BORROW_AMOUNT; // 3 USDC in raw units
    console.log("Attempting to repay (raw):", repayAmount.toString());
    console.log("Attempting to repay (human):", ethers.formatUnits(repayAmount, USDC_DECIMALS));
    
    // This should leave dust because we're not accounting for interest
    await pool.connect(user).repay(await usdc.getAddress(), repayAmount, user.address);
    
    // Check remaining debt
    const remainingDebt = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Remaining debt after exact repay (raw):", remainingDebt.toString());
    console.log("Remaining debt after exact repay (human):", ethers.formatUnits(remainingDebt, USDC_DECIMALS));
    
    // Should have dust remaining
    expect(remainingDebt).to.be.gt(0, "Should have dust remaining");
    console.log("✅ Dust issue reproduced - remaining debt:", remainingDebt.toString());
  });

  it("Test B: Repay MaxUint256 (should clear debt)", async function () {
    console.log("=== Test B: Repay MaxUint256 (should clear debt) ===");
    
    // Advance time to accrue interest
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    const debtBefore = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt before MaxUint256 repay (raw):", debtBefore.toString());
    
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    // Expect Repay event
    await expect(pool.connect(user).repay(await usdc.getAddress(), ethers.MaxUint256, user.address))
      .to.emit(pool, "Repay")
      .withArgs(user.address, user.address, await usdc.getAddress(), debtBefore, true);
    
    const debtAfter = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after MaxUint256 repay (raw):", debtAfter.toString());
    
    // Should be zero
    expect(debtAfter).to.equal(0, "Debt should be zero after MaxUint256 repay");
    console.log("✅ MaxUint256 repay successful - debt cleared");
  });

  it("Test C: Repay debt + 1 wei (should clear debt)", async function () {
    console.log("=== Test C: Repay debt + 1 wei (should clear debt) ===");
    
    // Advance time to accrue interest
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    const currentDebt = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Current debt (raw):", currentDebt.toString());
    
    const repayAmount = currentDebt + 1n;
    console.log("Attempting to repay debt + 1 wei (raw):", repayAmount.toString());
    
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    // Expect Repay event
    await expect(pool.connect(user).repay(await usdc.getAddress(), repayAmount, user.address))
      .to.emit(pool, "Repay")
      .withArgs(user.address, user.address, await usdc.getAddress(), currentDebt, true);
    
    const debtAfter = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after debt+1 repay (raw):", debtAfter.toString());
    
    // Should be zero
    expect(debtAfter).to.equal(0, "Debt should be zero after debt+1 repay");
    console.log("✅ Debt+1 repay successful - debt cleared");
  });

  it("Test D: Repay exact current debt (should clear debt)", async function () {
    console.log("=== Test D: Repay exact current debt (should clear debt) ===");
    
    // Advance time to accrue interest
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    const currentDebt = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Current debt (raw):", currentDebt.toString());
    
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    // Expect Repay event
    await expect(pool.connect(user).repay(await usdc.getAddress(), currentDebt, user.address))
      .to.emit(pool, "Repay")
      .withArgs(user.address, user.address, await usdc.getAddress(), currentDebt, true);
    
    const debtAfter = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after exact repay (raw):", debtAfter.toString());
    
    // Should be zero
    expect(debtAfter).to.equal(0, "Debt should be zero after exact repay");
    console.log("✅ Exact debt repay successful - debt cleared");
  });

  it("Test E: Partial repay (should not clear debt)", async function () {
    console.log("=== Test E: Partial repay (should not clear debt) ===");
    
    // Advance time to accrue interest
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    const currentDebt = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Current debt (raw):", currentDebt.toString());
    
    const partialAmount = currentDebt / 2n; // Repay half
    console.log("Partial repay amount (raw):", partialAmount.toString());
    
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    // Expect Repay event with isFull=false
    await expect(pool.connect(user).repay(await usdc.getAddress(), partialAmount, user.address))
      .to.emit(pool, "Repay")
      .withArgs(user.address, user.address, await usdc.getAddress(), partialAmount, false);
    
    const debtAfter = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after partial repay (raw):", debtAfter.toString());
    
    // Should not be zero
    expect(debtAfter).to.be.gt(0, "Debt should remain after partial repay");
    expect(debtAfter).to.equal(currentDebt - partialAmount, "Debt should be reduced by partial amount");
    console.log("✅ Partial repay successful - debt reduced but not cleared");
  });

  it("Test F: Repay when no debt (should handle gracefully)", async function () {
    console.log("=== Test F: Repay when no debt (should handle gracefully) ===");
    
    // First clear all debt
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.connect(user).repay(await usdc.getAddress(), ethers.MaxUint256, user.address);
    
    // Try to repay again
    await usdc.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    
    // Expect Repay event with 0 amount and isFull=true
    await expect(pool.connect(user).repay(await usdc.getAddress(), 1000, user.address))
      .to.emit(pool, "Repay")
      .withArgs(user.address, user.address, await usdc.getAddress(), 0, true);
    
    const debtAfter = await pool.getBorrowBalance(user.address, await usdc.getAddress());
    console.log("Debt after zero-debt repay (raw):", debtAfter.toString());
    
    // Should still be zero
    expect(debtAfter).to.equal(0, "Debt should remain zero");
    console.log("✅ Zero-debt repay handled gracefully");
  });
});
