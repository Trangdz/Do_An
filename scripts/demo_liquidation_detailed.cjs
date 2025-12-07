/**
 * 🎬 Script Demo Thanh Lý Chi Tiết
 * 
 * Kịch bản:
 * 1. Borrower supply 100 DAI
 * 2. Borrower borrow 60 USDC
 * 3. Giá DAI giảm → HF < 1.0
 * 4. Liquidator thanh lý
 * 5. Verify kết quả
 */

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

function formatNumber(num, decimals = 2) {
  return parseFloat(num).toFixed(decimals);
}

async function logAccountState(pool, userLabel, userAddress) {
  const [collateralUSD, debtUSD, healthFactor] = await pool.getAccountData(userAddress);
  const hfNum = parseFloat(ethers.formatUnits(healthFactor, 18));
  
  console.log(`\n📊 ${userLabel} Account State:`);
  console.log(`   Collateral Value: $${formatNumber(ethers.formatUnits(collateralUSD, 18))}`);
  console.log(`   Debt Value      : $${formatNumber(ethers.formatUnits(debtUSD, 18))}`);
  console.log(`   Health Factor   : ${formatNumber(hfNum, 4)} ${hfNum < 1.0 ? '🔴' : hfNum < 1.5 ? '⚠️' : '✅'}`);
  
  return { collateralUSD, debtUSD, healthFactor: hfNum };
}

async function logTokenBalance(token, address, label) {
  const balance = await token.balanceOf(address);
  const decimals = await token.decimals();
  console.log(`   ${label}: ${formatNumber(ethers.formatUnits(balance, decimals))}`);
}

async function getHealthFactor(pool, user) {
  const [, , hf] = await pool.getAccountData(user);
  return parseFloat(ethers.formatUnits(hf, 18));
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     🎬 DEMO LIQUIDATION - KỊCH BẢN CHI TIẾT              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [borrower, liquidator] = await ethers.getSigners();
  console.log("👥 Actors:");
  console.log(`   Borrower  : ${borrower.address}`);
  console.log(`   Liquidator: ${liquidator.address}\n`);

  // Get contracts
  const pool = await ethers.getContractAt("LendingPool", LendingPoolAddress, borrower);
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
  ];
  const dai = new ethers.Contract(DAIAddress, erc20Abi, borrower);
  const usdc = new ethers.Contract(USDCAddress, erc20Abi, borrower);
  const aggregator = await ethers.getContractAt("MultiPriceAggregator", PriceOracleAddress, borrower);

  // Amounts
  const supplyAmount = ethers.parseUnits("100", 18); // 100 DAI
  const borrowAmount = ethers.parseUnits("60", 6);   // 60 USDC
  const liquidationAmount = ethers.parseUnits("30", 6); // 30 USDC (50% of debt)

  // ===================================================================
  // STEP 1: Setup - Borrower Supplies DAI
  // ===================================================================
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║ STEP 1: Borrower Supplies 100 DAI                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Check initial balances
  console.log("\n📋 Initial Balances:");
  await logTokenBalance(dai, borrower.address, "Borrower DAI");
  await logTokenBalance(usdc, borrower.address, "Borrower USDC");

  // Approve and supply
  console.log("\n🔄 Approving DAI...");
  const approveTx = await dai.approve(LendingPoolAddress, supplyAmount);
  await approveTx.wait();
  console.log("   ✅ Approved");

  console.log("\n🔄 Supplying 100 DAI...");
  const supplyTx = await pool.lend(DAIAddress, supplyAmount);
  await supplyTx.wait();
  console.log("   ✅ Supplied");

  // Enable as collateral
  console.log("\n🔄 Enabling DAI as collateral...");
  const enableTx = await pool.setUserUseReserveAsCollateral(DAIAddress, true, { gasLimit: 500000 });
  await enableTx.wait();
  console.log("   ✅ Enabled");

  // Check state
  const state1 = await logAccountState(pool, "Borrower", borrower.address);
  console.log("\n   💡 Collateral Value = 100 DAI × $1.00 × 75% LTV = $75.00");
  console.log("   💡 Health Factor = ∞ (no debt yet)");

  // ===================================================================
  // STEP 2: Borrower Borrows USDC
  // ===================================================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║ STEP 2: Borrower Borrows 60 USDC                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log("\n🔄 Borrowing 60 USDC...");
  const borrowTx = await pool.borrow(USDCAddress, borrowAmount);
  await borrowTx.wait();
  console.log("   ✅ Borrowed");

  const state2 = await logAccountState(pool, "Borrower", borrower.address);
  console.log("\n   💡 Collateral Value = $75.00");
  console.log("   💡 Debt Value = $60.00");
  console.log(`   💡 Health Factor = $75.00 / $60.00 = ${formatNumber(state2.healthFactor, 4)} ✅`);

  // ===================================================================
  // STEP 3: Price Drops - Trigger Liquidation
  // ===================================================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║ STEP 3: Price Drops - Trigger Liquidation                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Get current writer
  const currentWriter = await aggregator.writer();
  const borrowerIsWriter = currentWriter.toLowerCase() === borrower.address.toLowerCase();
  
  if (!borrowerIsWriter) {
    console.log("\n🔄 Setting borrower as temporary oracle writer...");
    const setWriterTx = await aggregator.setWriter(borrower.address, true);
    await setWriterTx.wait();
    console.log("   ✅ Set as writer");
  }

  // Gradually decrease price until HF < 1.0
  console.log("\n🔄 Decreasing DAI price to trigger liquidation...");
  let targetPrice = 1.00;
  let healthFactor = await getHealthFactor(pool, borrower.address);
  
  while (healthFactor >= 1.0 && targetPrice > 0.50) {
    targetPrice -= 0.05;
    console.log(`   📉 Updating DAI price to $${formatNumber(targetPrice, 2)}...`);
    
    const priceTx = await aggregator.updatePrice("DAI", priceToInt(targetPrice));
    await priceTx.wait();
    await sleep(500);
    
    healthFactor = await getHealthFactor(pool, borrower.address);
    console.log(`      → Health Factor: ${formatNumber(healthFactor, 4)}`);
    
    if (healthFactor < 1.0) {
      console.log(`      → ✅ HF < 1.0! Position is liquidatable!`);
      break;
    }
  }

  if (healthFactor >= 1.0) {
    console.log("\n   ⚠️  Could not push HF below 1.0. Trying more aggressive price cut...");
    targetPrice = 0.75;
    await aggregator.updatePrice("DAI", priceToInt(targetPrice));
    await sleep(500);
    healthFactor = await getHealthFactor(pool, borrower.address);
    console.log(`   📉 Price: $${formatNumber(targetPrice, 2)}, HF: ${formatNumber(healthFactor, 4)}`);
  }

  const state3 = await logAccountState(pool, "Borrower (after price drop)", borrower.address);
  console.log(`\n   💡 DAI Price: $${formatNumber(targetPrice, 2)}`);
  console.log(`   💡 Collateral Value = 100 DAI × $${formatNumber(targetPrice, 2)} × 75% = $${formatNumber(state3.collateralUSD / 1e18, 2)}`);
  console.log(`   💡 Debt Value = $60.00 (unchanged)`);
  console.log(`   💡 Health Factor = $${formatNumber(state3.collateralUSD / 1e18, 2)} / $60.00 = ${formatNumber(state3.healthFactor, 4)} ${state3.healthFactor < 1.0 ? '🔴 LIQUIDATABLE!' : ''}`);

  if (state3.healthFactor >= 1.0) {
    throw new Error("Could not push health factor below 1.0 even after aggressive price cuts.");
  }

  // ===================================================================
  // STEP 4: Liquidator Executes Liquidation
  // ===================================================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║ STEP 4: Liquidator Executes Liquidation                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Check liquidator balances
  console.log("\n📋 Liquidator Balances (before):");
  await logTokenBalance(usdc, liquidator.address, "USDC");
  await logTokenBalance(dai, liquidator.address, "DAI");

  // Calculate expected seize amount
  const repayUSD = 30; // 30 USDC × $1.00
  const bonusBps = 500; // 5%
  const seizeUSD = repayUSD * (1 + bonusBps / 10000);
  const seizeDAI = seizeUSD / targetPrice;
  
  console.log("\n📊 Liquidation Calculation:");
  console.log(`   Repay Amount: 30 USDC = $${repayUSD}.00`);
  console.log(`   Liquidation Bonus: 5%`);
  console.log(`   Seize USD: $${repayUSD}.00 × 1.05 = $${formatNumber(seizeUSD, 2)}`);
  console.log(`   Seize DAI: $${formatNumber(seizeUSD, 2)} / $${formatNumber(targetPrice, 2)} = ${formatNumber(seizeDAI, 2)} DAI`);

  // Approve
  console.log("\n🔄 Liquidator approving USDC...");
  const usdcLiquidator = usdc.connect(liquidator);
  const approveLiquidationTx = await usdcLiquidator.approve(LendingPoolAddress, liquidationAmount);
  await approveLiquidationTx.wait();
  console.log("   ✅ Approved");

  // Execute liquidation
  console.log("\n🔄 Executing liquidation...");
  const poolAsLiquidator = pool.connect(liquidator);
  const liquidationTx = await poolAsLiquidator.liquidationCall(
    USDCAddress,      // debtAsset
    DAIAddress,       // collateralAsset
    borrower.address, // user
    liquidationAmount // repayRequested
  );
  const receipt = await liquidationTx.wait();
  console.log("   ✅ Liquidation executed!");
  console.log(`   📝 Transaction hash: ${receipt.hash}`);

  // Check liquidator balances after
  console.log("\n📋 Liquidator Balances (after):");
  await logTokenBalance(usdc, liquidator.address, "USDC");
  await logTokenBalance(dai, liquidator.address, "DAI");

  // ===================================================================
  // STEP 5: Verify Results
  // ===================================================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║ STEP 5: Verify Results                                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const state4 = await logAccountState(pool, "Borrower (after liquidation)", borrower.address);
  
  console.log("\n📊 Comparison:");
  console.log("   ┌─────────────────┬──────────────┬──────────────┬──────────┐");
  console.log("   │ Metric           │ Before       │ After        │ Change   │");
  console.log("   ├─────────────────┼──────────────┼──────────────┼──────────┤");
  console.log(`   │ Collateral Value │ $${formatNumber(state3.collateralUSD / 1e18, 2).padStart(10)} │ $${formatNumber(state4.collateralUSD / 1e18, 2).padStart(10)} │ ${(state4.collateralUSD - state3.collateralUSD) / 1e18 < 0 ? '-' : '+'}${formatNumber(Math.abs((state4.collateralUSD - state3.collateralUSD) / 1e18), 2).padStart(8)} │`);
  console.log(`   │ Debt Value       │ $${formatNumber(state3.debtUSD / 1e18, 2).padStart(10)} │ $${formatNumber(state4.debtUSD / 1e18, 2).padStart(10)} │ ${(state4.debtUSD - state3.debtUSD) / 1e18 < 0 ? '-' : '+'}${formatNumber(Math.abs((state4.debtUSD - state3.debtUSD) / 1e18), 2).padStart(8)} │`);
  console.log(`   │ Health Factor    │ ${formatNumber(state3.healthFactor, 4).padStart(10)} │ ${formatNumber(state4.healthFactor, 4).padStart(10)} │ ${(state4.healthFactor - state3.healthFactor) < 0 ? '-' : '+'}${formatNumber(Math.abs(state4.healthFactor - state3.healthFactor), 4).padStart(8)} │`);
  console.log("   └─────────────────┴──────────────┴──────────────┴──────────┘");

  console.log("\n✅ Results:");
  if (state4.healthFactor >= 1.0) {
    console.log(`   ✅ Health Factor improved: ${formatNumber(state3.healthFactor, 4)} → ${formatNumber(state4.healthFactor, 4)}`);
    console.log("   ✅ Position is now safe!");
  } else {
    console.log(`   ⚠️  Health Factor: ${formatNumber(state4.healthFactor, 4)} (still < 1.0)`);
    console.log("   ⚠️  Position may need additional liquidation");
  }

  // Restore original writer if needed
  if (!borrowerIsWriter && currentWriter !== ethers.ZeroAddress) {
    console.log("\n🔄 Restoring original oracle writer...");
    await aggregator.setWriter(currentWriter, true);
    console.log("   ✅ Restored");
  }

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║ ✅ DEMO COMPLETE!                                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n💡 Check the frontend Dashboard and Liquidations page to see the updated state.");
}

main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exitCode = 1;
});


