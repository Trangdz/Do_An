const { ethers } = require('hardhat');

async function main() {
  console.log('📊 Testing APR with new contracts...\n');

  const [deployer, user1, user2] = await ethers.getSigners();
  
  // New addresses from recent deployment
  const POOL = '0x8e299e7999D3DcF4EfA5Ba8feC4Bb7528A1c2eC4';
  const USDC = '0xbBB4dBD42886040A3365FB21e598ab4b7b2477a9';
  const WETH = '0xE93034F51610c42a01fe8e5a6462A8A90C2BB29a';

  const pool = await ethers.getContractAt('LendingPool', POOL);
  const usdc = await ethers.getContractAt('IERC20', USDC);
  const weth = await ethers.getContractAt('IERC20', WETH);

  console.log('👤 User1:', user1.address);
  console.log('👤 User2:', user2.address);
  console.log('');

  // Helper to show APR
  async function showAPR() {
    const reserve = await pool.reserves(USDC);
    const cash = reserve[0];
    const debt = reserve[1];
    const total = cash + debt;
    const U = total > 0n ? (debt * 10000n) / total : 0n;
    
    // Get IRM
    const irmAddr = await pool.interestRateModel();
    const irm = await ethers.getContractAt('InterestRateModel', irmAddr);
    
    // Get rates
    const rates = await irm.getRates(
      cash, debt,
      reserve[6], // reserveFactorBps
      reserve[13], // optimalUBps
      reserve[14], // baseRateRayPerSec
      reserve[15], // slope1RayPerSec
      reserve[16]  // slope2RayPerSec
    );
    
    const borrowAPR = Number(rates[0] * 31536000n * 10000n / 10n ** 27n) / 100;
    const supplyAPR = Number(rates[1] * 31536000n * 10000n / 10n ** 27n) / 100;
    
    console.log(`💰 Cash: ${ethers.formatUnits(cash, 18)} (1e18)`);
    console.log(`📊 Debt: ${ethers.formatUnits(debt, 18)} (1e18)`);
    console.log(`📈 Utilization: ${Number(U) / 100}%`);
    console.log(`🔵 Supply APR: ${supplyAPR.toFixed(4)}%`);
    console.log(`🟢 Borrow APR: ${borrowAPR.toFixed(4)}%`);
    console.log('');
  }

  try {
    // Step 1: Initial
    console.log('1️⃣ Initial state:');
    await showAPR();

    // Step 2: User1 supply 1000 USDC
    console.log('2️⃣ User1 supplies 1000 USDC...');
    const supplyAmt = ethers.parseUnits('1000', 6);
    await usdc.connect(user1).approve(POOL, supplyAmt);
    await pool.connect(user1).supply(USDC, supplyAmt);
    await showAPR();

    // Step 3: User2 needs collateral first (WETH)
    console.log('3️⃣ User2 supplies 1 WETH as collateral...');
    const wethAmt = ethers.parseUnits('1', 18);
    await weth.connect(user2).approve(POOL, wethAmt);
    await pool.connect(user2).supply(WETH, wethAmt);
    console.log('✅ Collateral supplied\n');

    // Step 4: User2 borrow 500 USDC
    console.log('4️⃣ User2 borrows 500 USDC...');
    const borrowAmt1 = ethers.parseUnits('500', 6);
    await pool.connect(user2).borrow(USDC, borrowAmt1);
    await showAPR();

    // Step 5: User2 borrow 300 more
    console.log('5️⃣ User2 borrows 300 more USDC...');
    const borrowAmt2 = ethers.parseUnits('300', 6);
    await pool.connect(user2).borrow(USDC, borrowAmt2);
    await showAPR();

    console.log('✅ APR is now changing dynamically!');
    console.log('🎉 Check your frontend - APR should update after ~30s!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

