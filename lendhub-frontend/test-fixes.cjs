// Test script to verify fixes
const { ethers } = require('ethers');

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  LENDING_POOL: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  PRICE_ORACLE: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  DAI: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};

async function testFixes() {
  try {
    console.log('🔍 Testing Fixes...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    // Test 1: Price Oracle
    console.log('\n📊 Testing Price Oracle...');
    const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, [
      'function getAssetPrice1e18(address asset) external view returns (uint256)'
    ], provider);
    
    try {
      const wethPrice = await oracle.getAssetPrice1e18(CONFIG.WETH);
      console.log('WETH Price (wei):', wethPrice.toString());
      console.log('WETH Price (ETH):', ethers.formatEther(wethPrice));
      console.log('✅ Price Oracle working');
    } catch (error) {
      console.error('❌ Price Oracle error:', error.message);
    }
    
    // Test 2: WETH Balance
    console.log('\n💰 Testing WETH Balance...');
    const wethContract = new ethers.Contract(CONFIG.WETH, [
      'function balanceOf(address owner) external view returns (uint256)',
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)'
    ], provider);
    
    try {
      const balance = await wethContract.balanceOf(await signer.getAddress());
      const symbol = await wethContract.symbol();
      const decimals = await wethContract.decimals();
      
      console.log('WETH Symbol:', symbol);
      console.log('WETH Decimals:', decimals);
      console.log('WETH Balance (wei):', balance.toString());
      console.log('WETH Balance (formatted):', ethers.formatUnits(balance, decimals));
      console.log('✅ WETH Balance loaded');
    } catch (error) {
      console.error('❌ WETH Balance error:', error.message);
    }
    
    // Test 3: Reserve Data
    console.log('\n🏦 Testing Reserve Data...');
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, [
      'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
      'function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance, uint256 borrowBalance, uint256 supplyBalanceUSD, uint256 borrowBalanceUSD)'
    ], provider);
    
    try {
      const reserveData = await pool.getReserveData(CONFIG.WETH);
      console.log('WETH Reserve Cash:', ethers.formatEther(reserveData.reserveCash));
      console.log('WETH Liquidation Threshold:', reserveData.liquidationThreshold.toString());
      console.log('✅ Reserve Data loaded');
      
      const userData = await pool.getUserReserveData(await signer.getAddress(), CONFIG.WETH);
      console.log('User WETH Supply:', ethers.formatEther(userData.supplyBalance));
      console.log('User WETH Supply USD:', ethers.formatEther(userData.supplyBalanceUSD));
      console.log('✅ User Data loaded');
    } catch (error) {
      console.error('❌ Reserve Data error:', error.message);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixes();
