const { ethers } = require('hardhat');

async function main() {
  console.log('🎯 Creating Utilization to Trigger APR...\n');

  const [deployer, user1, user2] = await ethers.getSigners();
  
  const POOL = '0x8e299e7999D3DcF4EfA5Ba8feC4Bb7528A1c2eC4';
  const USDC = '0xbBB4dBD42886040A3365FB21e598ab4b7b2477a9';
  const WETH = '0xE93034F51610c42a01fe8e5a6462A8A90C2BB29a';

  const pool = await ethers.getContractAt('LendingPool', POOL);
  const usdc = await ethers.getContractAt('IERC20', USDC);
  const weth = await ethers.getContractAt('IERC20', WETH);

  try {
    console.log('1️⃣ User1 supplies 1000 USDC...');
    await usdc.connect(user1).approve(POOL, ethers.parseUnits('1000', 6));
    await pool.connect(user1).supply(USDC, ethers.parseUnits('1000', 6));
    console.log('✅ Supplied\n');

    console.log('2️⃣ User2 supplies 2 WETH as collateral...');
    await weth.connect(user2).approve(POOL, ethers.parseUnits('2', 18));
    await pool.connect(user2).supply(WETH, ethers.parseUnits('2', 18));
    console.log('✅ Collateral supplied\n');

    console.log('3️⃣ User2 borrows 500 USDC (U = 50%)...');
    await pool.connect(user2).borrow(USDC, ethers.parseUnits('500', 6));
    console.log('✅ Borrowed\n');

    console.log('🎉 Done! Now check frontend:');
    console.log('   - Utilization: ~50%');
    console.log('   - Supply APR: ~1.5%');
    console.log('   - Borrow APR: ~3.1%');
    console.log('\n📱 Refresh browser to see changes!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);

