const { ethers } = require('hardhat');

async function main() {
  const POOL = '0x8e299e7999D3DcF4EfA5Ba8feC4Bb7528A1c2eC4';
  const USDC = '0xbBB4dBD42886040A3365FB21e598ab4b7b2477a9';

  const pool = await ethers.getContractAt('LendingPool', POOL);
  
  console.log('🔍 Checking USDC Reserve Parameters...\n');
  
  const reserve = await pool.reserves(USDC);
  
  console.log('📦 Reserve Data:');
  console.log('   Cash:', ethers.formatUnits(reserve[0], 18), '(1e18)');
  console.log('   Debt:', ethers.formatUnits(reserve[1], 18), '(1e18)');
  console.log('   Reserve Factor:', reserve[6].toString(), 'bps');
  console.log('   Optimal U:', reserve[13].toString(), 'bps');
  console.log('   Base Rate:', reserve[14].toString(), 'ray/sec');
  console.log('   Slope 1:', reserve[15].toString(), 'ray/sec');
  console.log('   Slope 2:', reserve[16].toString(), 'ray/sec');
  console.log('');
  
  if (reserve[14] === 0n && reserve[15] === 0n && reserve[16] === 0n) {
    console.log('❌ PROBLEM: All slope parameters are 0!');
    console.log('   This means reserves were NOT initialized properly.');
    console.log('');
    console.log('💡 SOLUTION: Need to reinitialize reserves with proper parameters.');
  } else {
    console.log('✅ Slope parameters are set correctly!');
    console.log('   APR should be working.');
  }
}

main().catch(console.error);

