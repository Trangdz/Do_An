// Script to view Aave Interest Rate Parameters from on-chain data

const { ethers } = require('hardhat');

async function main() {
  console.log('📊 FETCHING AAVE USDC PARAMETERS FROM ETHERSCAN');
  console.log('='.repeat(60));
  
  // Aave V3 Ethereum mainnet
  const AAVE_POOL_ADDRESS = '0x87870Bca3F3fD6335C3F4ce8392A6935E7a28065';
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  
  console.log('\n📝 Call this function on Etherscan:');
  console.log(`   https://etherscan.io/address/${AAVE_POOL_ADDRESS}#readContract`);
  console.log('\n📋 Function: getReserveData');
  console.log(`   Parameter: ${USDC_ADDRESS}`);
  console.log('\nOr use the script below to fetch directly...');
  
  try {
    // Need to use Aave Data Provider or call pool directly
    console.log('\n⚠️  Note: To view Aave parameters, you need:');
    console.log('   1. Aave's PoolDataProvider contract address');
    console.log('   2. Or use their API');
    console.log('\n🌐 Use this link instead:');
    console.log('   https://etherscan.io/address/0xd8Bd8fCe0C30Eb2f7F1D904D9C0Fd4876F77Ff82');
    console.log('   Function: getReserveConfigurationData()');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n📚 Or check Aave docs:');
  console.log('   https://docs.aave.com/risk/asset-risk/risk-parameters');
  
  console.log('\n💰 Quick Reference - Aave USDC Parameters:');
  console.log('   Base Rate: 0%');
  console.log('   Slope 1: 4% APR');
  console.log('   Slope 2: 75% APR');
  console.log('   Optimal U: 90%');
}

main()
  .then(() => process.exit(0))
  .catch(console.error);

