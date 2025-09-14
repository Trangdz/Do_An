// Deep diagnosis of the root cause
const { ethers } = require('ethers');

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  LENDING_POOL: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  PRICE_ORACLE: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  DAI: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};

async function deepDiagnosis() {
  try {
    console.log('🔍 DEEP DIAGNOSIS - Root Cause Analysis');
    console.log('==========================================');
    
    // Step 1: Check Ganache connectivity
    console.log('\n1️⃣ Checking Ganache Connectivity...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    
    try {
      const network = await provider.getNetwork();
      console.log('✅ Ganache connected:', network);
    } catch (error) {
      console.error('❌ Ganache connection failed:', error.message);
      return;
    }
    
    // Step 2: Check accounts
    console.log('\n2️⃣ Checking Accounts...');
    const accounts = await provider.listAccounts();
    console.log('Available accounts:', accounts.length);
    
    if (accounts.length > 0) {
      const balance = await provider.getBalance(accounts[0]);
      console.log('First account balance:', ethers.formatEther(balance), 'ETH');
    }
    
    // Step 3: Check Price Oracle
    console.log('\n3️⃣ Checking Price Oracle...');
    const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, [
      'function getAssetPrice1e18(address asset) external view returns (uint256)',
      'function getAssetPrice(address asset) external view returns (uint256)',
    ], provider);
    
    try {
      const wethPrice = await oracle.getAssetPrice1e18(CONFIG.WETH);
      console.log('✅ WETH Price (wei):', wethPrice.toString());
      console.log('✅ WETH Price (ETH):', ethers.formatEther(wethPrice));
    } catch (error) {
      console.error('❌ Price Oracle failed:', error.message);
    }
    
    // Step 4: Check WETH Contract
    console.log('\n4️⃣ Checking WETH Contract...');
    const weth = new ethers.Contract(CONFIG.WETH, [
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)',
      'function balanceOf(address owner) external view returns (uint256)',
    ], provider);
    
    try {
      const symbol = await weth.symbol();
      const decimals = await weth.decimals();
      console.log('✅ WETH Symbol:', symbol);
      console.log('✅ WETH Decimals:', decimals);
    } catch (error) {
      console.error('❌ WETH Contract failed:', error.message);
    }
    
    // Step 5: Check LendingPool
    console.log('\n5️⃣ Checking LendingPool...');
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, [
      'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
    ], provider);
    
    try {
      const reserveData = await pool.getReserveData(CONFIG.WETH);
      console.log('✅ WETH Reserve Data:');
      console.log('  Reserve Cash:', ethers.formatEther(reserveData.reserveCash));
      console.log('  Total Debt:', ethers.formatEther(reserveData.totalDebt));
      console.log('  Utilization:', ethers.formatEther(reserveData.utilizationWad));
      console.log('  Liquidation Threshold:', reserveData.liquidationThreshold.toString());
    } catch (error) {
      console.error('❌ LendingPool failed:', error.message);
    }
    
    // Step 6: Check DAI Contract
    console.log('\n6️⃣ Checking DAI Contract...');
    const dai = new ethers.Contract(CONFIG.DAI, [
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)',
    ], provider);
    
    try {
      const daiSymbol = await dai.symbol();
      const daiDecimals = await dai.decimals();
      console.log('✅ DAI Symbol:', daiSymbol);
      console.log('✅ DAI Decimals:', daiDecimals);
    } catch (error) {
      console.error('❌ DAI Contract failed:', error.message);
    }
    
    console.log('\n🎯 DIAGNOSIS COMPLETE');
    console.log('=====================');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

deepDiagnosis();
