const hre = require("hardhat");
const { ethers } = hre;
const path = require("path");

const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
const addresses = require(addressesPath);

const {
  LendingPoolAddress,
  DAIAddress,
  USDCAddress,
  PriceOracleAddress,
} = addresses;

const PRICE_DECIMALS = 1e8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function priceToInt(value) {
  return BigInt(Math.round(value * PRICE_DECIMALS));
}

async function logAccountState(pool, userLabel, userAddress) {
  const [collateralUSD, debtUSD, healthFactor] = await pool.getAccountData(userAddress);
  console.log(`\n📊 ${userLabel} account data:`);
  console.log(`  Collateral: $${ethers.formatUnits(collateralUSD, 18)}`);
  console.log(`  Debt      : $${ethers.formatUnits(debtUSD, 18)}`);
  console.log(`  Health F. : ${ethers.formatUnits(healthFactor, 18)}`);
}

async function getHealthFactor(pool, user) {
  const [, , hf] = await pool.getAccountData(user);
  return parseFloat(ethers.formatUnits(hf, 18));
}

async function main() {
  const [borrower, liquidator] = await ethers.getSigners();
  console.log("Borrower  :", borrower.address);
  console.log("Liquidator:", liquidator.address);

  const pool = await ethers.getContractAt("LendingPool", LendingPoolAddress, borrower);
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address owner) external view returns (uint256)",
  ];
  const dai = new ethers.Contract(DAIAddress, erc20Abi, borrower);
  const usdcBorrower = new ethers.Contract(USDCAddress, erc20Abi, borrower);
  const usdcLiquidator = usdcBorrower.connect(liquidator);
  const aggregator = await ethers.getContractAt("MultiPriceAggregator", PriceOracleAddress, borrower);

  const supplyAmount = ethers.parseUnits("100", 18); // 100 DAI
  const borrowAmount = ethers.parseUnits("60", 6);   // 60 USDC (6 decimals)
  const liquidationAmount = ethers.parseUnits("40", 6); // Liquidator repays 40 USDC

  console.log("\n=== STEP 1: Borrower supplies 100 DAI ===");
  await (await dai.approve(LendingPoolAddress, supplyAmount)).wait();
  await (await pool.lend(DAIAddress, supplyAmount)).wait();

  console.log("Enabling DAI as collateral...");
  await (await pool.setUserUseReserveAsCollateral(DAIAddress, true, { gasLimit: 500000 })).wait();

  console.log("\n=== STEP 2: Borrower borrows 60 USDC ===");
  await (await pool.borrow(USDCAddress, borrowAmount)).wait();
  await logAccountState(pool, "Borrower", borrower.address);

  console.log("\n=== STEP 3: Manipulate oracle price to push HF < 1 ===");
  const currentWriter = await aggregator.writer();
  if (currentWriter.toLowerCase() !== borrower.address.toLowerCase()) {
    console.log("Setting borrower as temporary oracle writer...");
    await (await aggregator.setWriter(borrower.address, true)).wait();
  }

  let targetPrice = 0.50;
  let healthFactor = await getHealthFactor(pool, borrower.address);
  while (healthFactor >= 1 && targetPrice > 0.05) {
    console.log(`Updating DAI price to $${targetPrice.toFixed(2)}...`);
    await (await aggregator.updatePrice("DAI", priceToInt(targetPrice))).wait();
    await sleep(500);
    healthFactor = await getHealthFactor(pool, borrower.address);
    console.log(`  -> New health factor: ${healthFactor.toFixed(2)}`);
    targetPrice -= 0.10;
  }

  if (healthFactor >= 1) {
    throw new Error("Could not push health factor below 1 even after aggressive price cuts.");
  }

  await logAccountState(pool, "Borrower (after price drop)", borrower.address);

  console.log("\n=== STEP 4: Liquidator repays part of the USDC debt ===");
  await (await usdcLiquidator.approve(LendingPoolAddress, liquidationAmount)).wait();
  const poolAsLiquidator = pool.connect(liquidator);
  await (await poolAsLiquidator.liquidationCall(
    USDCAddress,
    DAIAddress,
    borrower.address,
    liquidationAmount
  )).wait();

  await logAccountState(pool, "Borrower (after liquidation)", borrower.address);

  const writerAfter = await aggregator.writer();
  if (writerAfter.toLowerCase() === borrower.address.toLowerCase() && currentWriter.toLowerCase() !== borrower.address.toLowerCase()) {
    console.log("Restoring original oracle writer...");
    await (await aggregator.setWriter(currentWriter, true)).wait();
  }

  const liquidatorDaiBalance = await dai.balanceOf(liquidator.address);
  console.log(`\n💰 Liquidator now holds ${ethers.formatUnits(liquidatorDaiBalance, 18)} DAI (includes seized collateral).`);

  console.log("\n✅ Demo complete! Check the frontend Dashboard and Liquidations page to see the updated state.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

