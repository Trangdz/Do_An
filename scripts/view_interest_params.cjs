const { ethers } = require('hardhat');

async function main() {
  console.log('📊 VIEWING INTEREST RATE PARAMETERS');
  console.log('='.repeat(60));
  
  // Update these addresses
  const POOL_ADDRESS = '0x56328671A331a3563e86C4CC53b5E1945733A3E3';
  const USDC_ADDRESS = '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5';
  
  const pool = await ethers.getContractAt('LendingPool', POOL_ADDRESS);
  
  console.log('\n📋 USDC Reserve Interest Rate Parameters:');
  console.log('-'.repeat(60));
  
  // Get reserve data
  const reserve = await pool.reserves(USDC_ADDRESS);
  
  // Convert RAY per second to APR (%)
  const rayToAPR = (rayPerSec) => {
    const SECONDS_PER_YEAR = 365 * 24 * 3600;
    return Number(rayPerSec) * SECONDS_PER_YEAR / 1e27 * 100;
  };
  
  console.log('\n🎯 Key Parameters:');
  console.log('┌─────────────────────────────────┬─────────────────┐');
  console.log('│ Parameter                      │ Value (APR)      │');
  console.log('├─────────────────────────────────┼─────────────────┤');
  console.log(`│ Optimal Utilization            │ ${reserve.optimalUBps.toString()} bps (${reserve.optimalUBps / 100}%)`);
  console.log(`│ Base Rate                      │ ${rayToAPR(reserve.baseRateRayPerSec).toFixed(4)}% APR`);
  console.log(`│ Slope 1                        │ ${rayToAPR(reserve.slope1RayPerSec).toFixed(4)}% APR`);
  console.log(`│ Slope 2                        │ ${rayToAPR(reserve.slope2RayPerSec).toFixed(4)}% APR`);
  console.log('└─────────────────────────────────┴─────────────────┘');
  
  // Calculate Rmax
  const base = rayToAPR(reserve.baseRateRayPerSec);
  const s1 = rayToAPR(reserve.slope1RayPerSec);
  const s2 = rayToAPR(reserve.slope2RayPerSec);
  const rmax = base + s1 + s2;
  
  console.log(`\n📈 Max Interest Rate (Rmax):`);
  console.log(`   = Base + Slope1 + Slope2`);
  console.log(`   = ${base.toFixed(4)}% + ${s1.toFixed(4)}% + ${s2.toFixed(4)}%`);
  console.log(`   = ${rmax.toFixed(4)}% APR`);
  
  // Current rates
  const currentBorrowRate = rayToAPR(reserve.variableBorrowRateRayPerSec);
  const currentSupplyRate = rayToAPR(reserve.liquidityRateRayPerSec);
  
  console.log('\n💰 Current Rates:');
  console.log(`   Borrow Rate: ${currentBorrowRate.toFixed(4)}% APR`);
  console.log(`   Supply Rate: ${currentSupplyRate.toFixed(4)}% APR`);
  
  // Current utilization
  const total = reserve.reserveCash + reserve.totalDebtPrincipal;
  const utilization = total > 0 ? (reserve.totalDebtPrincipal * 10000n / total) : 0n;
  
  console.log(`\n📊 Current Utilization: ${utilization / 100}%`);
  console.log(`   Cash: ${ethers.formatUnits(reserve.reserveCash, 18)}`);
  console.log(`   Debt: ${ethers.formatUnits(reserve.totalDebtPrincipal, 18)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });



