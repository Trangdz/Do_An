const { ethers } = require('hardhat');

async function main() {
  console.log('📊 DEMO: DYNAMIC INTEREST RATES\n');
  console.log('This script demonstrates how interest rates change automatically');
  console.log('based on Utilization (U) in the LendHub protocol.\n');
  console.log('='.repeat(80) + '\n');

  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  console.log('👤 User1:', user1.address);
  console.log('👤 User2:', user2.address);
  console.log('');

  // Load deployed contract addresses
  const fs = require('fs');
  const addressesPath = './lendhub-frontend-nextjs/src/addresses.js';
  
  if (!fs.existsSync(addressesPath)) {
    console.error('❌ addresses.js not found! Please deploy contracts first.');
    console.log('Run: npx hardhat run scripts/deploy_ganache.cjs --network ganache');
    return;
  }

  // Parse addresses from addresses.js
  const addressesContent = fs.readFileSync(addressesPath, 'utf8');
  const poolMatch = addressesContent.match(/LENDING_POOL:\s*["']([^"']+)["']/);
  const usdcMatch = addressesContent.match(/USDC:\s*["']([^"']+)["']/);

  if (!poolMatch || !usdcMatch) {
    console.error('❌ Could not parse contract addresses from addresses.js');
    return;
  }

  const POOL_ADDRESS = poolMatch[1];
  const USDC_ADDRESS = usdcMatch[1];

  console.log('📝 Contract Addresses:');
  console.log('   LendingPool:', POOL_ADDRESS);
  console.log('   USDC:', USDC_ADDRESS);
  console.log('\n' + '='.repeat(80) + '\n');

  // Load contracts
  const pool = await ethers.getContractAt('LendingPool', POOL_ADDRESS);
  const usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS);

  // Helper function to convert Ray/sec to APR %
  function rayToAPR(rateRayPerSec) {
    const SECONDS_PER_YEAR = 31536000n;
    const RAY = 10n ** 27n;
    const ratePerYear = rateRayPerSec * SECONDS_PER_YEAR;
    const aprBigInt = (ratePerYear * 10000n) / RAY; // Multiply by 100 for %, by 100 for 2 decimals
    return Number(aprBigInt) / 100;
  }

  // Helper function to show current rates
  async function showRates(step, description) {
    console.log(`\n${step} ${description}`);
    console.log('-'.repeat(80));
    
    const reserve = await pool.reserves(USDC_ADDRESS);
    const cash = reserve.reserveCash;
    const debt = reserve.totalDebtPrincipal;
    const total = cash + debt;
    
    const utilizationBps = total > 0n ? (debt * 10000n) / total : 0n;
    const supplyAPR = rayToAPR(reserve.liquidityRateRayPerSec);
    const borrowAPR = rayToAPR(reserve.variableBorrowRateRayPerSec);
    
    // Convert from 1e18 to USDC (6 decimals)
    const cashUSDC = Number(cash) / 1e12;
    const debtUSDC = Number(debt) / 1e12;
    
    console.log(`💰 Reserve Cash:     ${cashUSDC.toFixed(2)} USDC`);
    console.log(`📊 Total Borrowed:   ${debtUSDC.toFixed(2)} USDC`);
    console.log(`📈 Utilization:      ${Number(utilizationBps) / 100}%`);
    console.log(`🔵 Supply APR:       ${supplyAPR.toFixed(4)}%`);
    console.log(`🟢 Borrow APR:       ${borrowAPR.toFixed(4)}%`);
    console.log('');
  }

  try {
    // Step 1: Initial state
    await showRates('1️⃣', 'Initial State (No Activity)');

    // Step 2: User1 supplies 1000 USDC
    console.log('▶️  ACTION: User1 supplies 1000 USDC...');
    const supplyAmount = ethers.parseUnits('1000', 6);
    await usdc.connect(user1).approve(POOL_ADDRESS, supplyAmount);
    await pool.connect(user1).supply(USDC_ADDRESS, supplyAmount);
    await showRates('2️⃣', 'After User1 Supplies 1000 USDC');
    console.log('ℹ️  Note: U still 0% because no one borrowed yet.');

    // Step 3: User2 borrows 500 USDC (U = 50%)
    console.log('▶️  ACTION: User2 borrows 500 USDC...');
    const borrowAmount1 = ethers.parseUnits('500', 6);
    await pool.connect(user2).borrow(USDC_ADDRESS, borrowAmount1);
    await showRates('3️⃣', 'After User2 Borrows 500 USDC (U ≈ 50%)');
    console.log('✨ Rates increased! More people borrowing → higher APR.');

    // Step 4: User2 borrows 300 more USDC (U = 80%)
    console.log('▶️  ACTION: User2 borrows 300 more USDC...');
    const borrowAmount2 = ethers.parseUnits('300', 6);
    await pool.connect(user2).borrow(USDC_ADDRESS, borrowAmount2);
    await showRates('4️⃣', 'After User2 Borrows 300 More USDC (U ≈ 80%)');
    console.log('🚀 Rates increased significantly! U reached optimal (80%).');

    // Step 5: User2 borrows 100 more USDC (U = 90%)
    console.log('▶️  ACTION: User2 borrows 100 more USDC...');
    const borrowAmount3 = ethers.parseUnits('100', 6);
    await pool.connect(user2).borrow(USDC_ADDRESS, borrowAmount3);
    await showRates('5️⃣', 'After User2 Borrows 100 More USDC (U ≈ 90%)');
    console.log('🔥 Rates spiked! U > optimal → steep slope 2 kicks in!');

    // Step 6: User2 repays 400 USDC (U drops)
    console.log('▶️  ACTION: User2 repays 400 USDC...');
    const repayAmount = ethers.parseUnits('400', 6);
    await usdc.connect(user2).approve(POOL_ADDRESS, repayAmount);
    await pool.connect(user2).repay(USDC_ADDRESS, repayAmount, user2.address);
    await showRates('6️⃣', 'After User2 Repays 400 USDC (U ≈ 60%)');
    console.log('📉 Rates decreased! Less borrowing → lower APR.');

    // Step 7: User1 supplies 1000 more USDC (U drops further)
    console.log('▶️  ACTION: User1 supplies 1000 more USDC...');
    const supplyAmount2 = ethers.parseUnits('1000', 6);
    await usdc.connect(user1).approve(POOL_ADDRESS, supplyAmount2);
    await pool.connect(user1).supply(USDC_ADDRESS, supplyAmount2);
    await showRates('7️⃣', 'After User1 Supplies 1000 More USDC (U ≈ 30%)');
    console.log('📉 Rates decreased further! More liquidity → lower APR.');

    console.log('\n' + '='.repeat(80));
    console.log('✅ DEMO COMPLETE!');
    console.log('');
    console.log('🎯 KEY TAKEAWAYS:');
    console.log('   1. Rates AUTOMATICALLY change based on Utilization (U)');
    console.log('   2. More borrowing → Higher U → Higher rates');
    console.log('   3. More supply or repayment → Lower U → Lower rates');
    console.log('   4. When U > optimal (80%), rates increase steeply (slope 2)');
    console.log('   5. This is the SAME model used by Aave and Compound!');
    console.log('');
    console.log('📊 Your frontend will show these dynamic rates automatically!');
    console.log('   Refresh interval: 30 seconds (configurable in useReserveAPR)');
    console.log('');
    console.log('🚀 Try it yourself:');
    console.log('   1. Open the frontend (npm run dev)');
    console.log('   2. Supply/Borrow/Repay tokens');
    console.log('   3. Watch the APR numbers change in real-time!');
    console.log('');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error during demo:', error.message);
    if (error.message.includes('Health factor too low')) {
      console.log('\nℹ️  Note: User2 needs collateral (WETH) to borrow USDC.');
      console.log('   Make sure to supply WETH as collateral first!');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

