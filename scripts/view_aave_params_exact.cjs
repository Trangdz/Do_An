/**
 * View Aave USDC Interest Rate Parameters
 * Fetches from Aave Data Provider on Ethereum
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('📊 FETCHING AAVE USDC PARAMETERS');
  console.log('='.repeat(60));
  
  // Aave V3 Data Provider on Ethereum
  const DATA_PROVIDER = '0xd8Bd8fCe0C30Eb2f7F1D904D9C0Fd4876F77Ff82';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  
  console.log('\n📋 Fetching from Aave Data Provider...');
  console.log(`   Address: ${DATA_PROVIDER}`);
  
  // ABI for getReserveConfigurationData
  const abi = [
    "function getReserveConfigurationData(address asset) view returns (uint256 data)"
  ];
  
  try {
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const contract = new ethers.Contract(DATA_PROVIDER, abi, provider);
    
    const data = await contract.getReserveConfigurationData(USDC);
    
    console.log('\n📊 Raw Contract Data (needs parsing):');
    console.log(`   Data: ${data.toString()}`);
    console.log('\n⚠️  Note: This is encoded uint256, need to decode bits');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Alternative: Use known values
  console.log('\n' + '='.repeat(60));
  console.log('📊 KNOWN AAVE USDC PARAMETERS');
  console.log('='.repeat(60));
  
  console.log('\n🎯 From Graph Analysis:');
  console.log('   Optimal Utilization: 92%');
  console.log('   Borrow APR @ 92%: 6.00%');
  console.log('   Current APR @ 78.53%: ~4.3%');
  
  console.log('\n📈 Estimated Parameters:');
  console.log('   Base Rate: ~0%');
  console.log('   Slope 1: ~6% APR');
  console.log('   Slope 2: ~47% APR');
  console.log('   Optimal U: 92%');
  console.log('   Rmax: ~53% APR');
  
  console.log('\n💡 To get exact values:');
  console.log('   1. Visit: https://etherscan.io/address/0xd8Bd8fCe0C30Eb2f7F1D904D9C0Fd4876F77Ff82');
  console.log('   2. Use function: getReserveConfigurationData');
  console.log('   3. Or check Aave docs: https://docs.aave.com');
  
  console.log('\n📚 Alternative:');
  console.log('   Check Aave V3 source code on GitHub:');
  console.log('   https://github.com/aave/aave-v3-core');
  
  console.log('\n🎯 Quick Formula (from graph):');
  console.log('   At U < 92%:');
  console.log('     APR = 0% + slope1 × (U / 92%)');
  console.log('   At U > 92%:');
  console.log('     APR = 0% + slope1 + slope2 × ((U - 92%) / 8%)');
}

main()
  .then(() => process.exit(0))
  .catch(console.error);

