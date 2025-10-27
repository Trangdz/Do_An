const { ethers } = require('hardhat');

// Use the actual deployed address
const LendingPoolAddress = '0x43F83C26EeC9E6057C1E969bA959717c783aBaa9';
const WETHAddress = '0x9eff018CA5d14a1ad287f50BAA5996B499cB1694';
const USDCAddress = '0xb618c45ff617FDC6c609C5fcBfA67dD44c3a8DaE';
const DAIAddress = '0x635a3f905b90D3D746995f1A46b1fF193f3d44D5';

async function main() {
  console.log('🔍 VERIFYING INTEREST RATE ACCRUAL');
  console.log('='.repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log('📝 Checking with account:', deployer.address);
  
  const pool = await ethers.getContractAt('LendingPool', LendingPoolAddress);
  
  // Check USDC
  console.log('\n📊 USDC Reserve:');
  console.log('-'.repeat(60));
  
  const reserve = await pool.reserves(USDCAddress);
  
  // Convert RAY per second to APR
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toAPR = (rayPerSec) => {
    return Number(rayPerSec) * SECONDS_PER_YEAR / 1e27 * 100;
  };
  
  console.log('💰 Reserve Data:');
  console.log(`   Cash: ${ethers.formatUnits(reserve.reserveCash, 18)}`);
  console.log(`   Total Debt: ${ethers.formatUnits(reserve.totalDebtPrincipal, 18)}`);
  
  console.log('\n📈 Interest Rate Parameters:');
  console.log(`   Base Rate: ${toAPR(reserve.baseRateRayPerSec).toFixed(4)}% APR`);
  console.log(`   Slope 1: ${toAPR(reserve.slope1RayPerSec).toFixed(4)}% APR`);
  console.log(`   Slope 2: ${toAPR(reserve.slope2RayPerSec).toFixed(4)}% APR`);
  
  const totalSupply = reserve.reserveCash + reserve.totalDebtPrincipal;
  const utilization = totalSupply > 0 ? Number(reserve.totalDebtPrincipal * 10000n / totalSupply) / 100 : 0;
  
  console.log('\n📊 Current Utilization:', utilization.toFixed(2), '%');
  console.log('\n🎯 Current Rates:');
  console.log(`   Variable Borrow Rate: ${toAPR(reserve.variableBorrowRateRayPerSec).toFixed(4)}% APR`);
  console.log(`   Supply Rate: ${toAPR(reserve.liquidityRateRayPerSec).toFixed(4)}% APR`);
  
  console.log('\n⏰ Index Status:');
  console.log(`   Liquidity Index: ${ethers.formatUnits(reserve.liquidityIndex, 9)}`);
  console.log(`   Borrow Index: ${ethers.formatUnits(reserve.variableBorrowIndex, 9)}`);
  console.log(`   Last Update: ${new Date(Number(reserve.lastUpdate) * 1000).toLocaleString()}`);
  
  // Check if interest is accruing
  const now = Math.floor(Date.now() / 1000);
  const timeSinceUpdate = now - Number(reserve.lastUpdate);
  
  console.log('\n💡 Interest Accrual:');
  console.log(`   Time since last update: ${timeSinceUpdate}s (${(timeSinceUpdate / 60).toFixed(2)} minutes)`);
  
  if (timeSinceUpdate > 0 && reserve.liquidityRateRayPerSec > 0) {
    const expectedGrowth = Number(reserve.liquidityIndex) * Number(reserve.liquidityRateRayPerSec) * timeSinceUpdate / 1e27;
    console.log(`   Expected index growth: ${expectedGrowth > 0 ? '+' : ''}${expectedGrowth.toFixed(18)}`);
    
    if (expectedGrowth > 0) {
      console.log('   ✅ Interest is accruing!');
    } else {
      console.log('   ❌ No interest accrual (check rates)');
    }
  }
  
  // Check user supply
  console.log('\n👤 Your Supply:');
  console.log('-'.repeat(60));
  
  try {
    const userReserve = await pool.userReserves(deployer.address, USDCAddress);
    const currentBalance = await pool.getCurrentSupplyBalance(deployer.address, USDCAddress);
    
    if (userReserve.supply.principal > 0) {
      const principal = ethers.formatUnits(userReserve.supply.principal, 6); // USDC has 6 decimals
      const balance = ethers.formatUnits(currentBalance, 6);
      const interest = parseFloat(balance) - parseFloat(principal);
      
      console.log(`   Principal: ${principal} USDC`);
      console.log(`   Current Balance: ${balance} USDC`);
      console.log(`   Interest Earned: ${interest >= 0 ? '+' : ''}${interest.toFixed(6)} USDC`);
      
      if (interest > 0) {
        console.log('   ✅ Interest is accumulating!');
      } else if (interest === 0 && timeSinceUpdate < 60) {
        console.log('   ⏳ Need to wait longer for interest to accrue');
      } else {
        console.log('   ❌ No interest visible yet');
      }
    } else {
      console.log('   No supply found for this user');
    }
  } catch (error) {
    console.error('Error checking user supply:', error);
  }
  
  // Trigger accrue to update
  console.log('\n🔄 Triggering Accrue:');
  try {
    await pool.accruePublic(USDCAddress);
    const updatedReserve = await pool.reserves(USDCAddress);
    console.log(`   New Liquidity Index: ${ethers.formatUnits(updatedReserve.liquidityIndex, 9)}`);
    const indexGrowth = updatedReserve.liquidityIndex - reserve.liquidityIndex;
    console.log(`   Index Growth: ${indexGrowth > 0 ? '+' : ''}${ethers.formatUnits(indexGrowth, 9)}`);
    
    if (indexGrowth > 0) {
      console.log('   ✅ Interest accrual is working!');
    } else {
      console.log('   ⚠️  No index growth (utilization = 0 or rate = 0)');
    }
  } catch (error) {
    console.error('Error triggering accrue:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

