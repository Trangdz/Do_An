// Test script to verify WithdrawModal data
const { ethers } = require('ethers');

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  LENDING_POOL: '0x2bC7Ff486205b6D5FF2043dc1cba3a5D8385837A',
  WETH: '0x358b4AD4cf66a24250240d7472220D815707E8e8',
  DAI: '0x22D9A2d2Ad1f2808b4113D2FC9DAbfED07d3dC46',
};

async function testWithdrawData() {
  try {
    console.log('🔍 Testing WithdrawModal Data...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, [
      'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
      'function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance, uint256 borrowBalance, uint256 supplyBalanceUSD, uint256 borrowBalanceUSD)',
    ], signer);
    
    // Test WETH data
    console.log('\n📊 WETH Reserve Data:');
    const wethData = await pool.getReserveData(CONFIG.WETH);
    console.log('Reserve Cash:', ethers.formatEther(wethData.reserveCash));
    console.log('Liquidation Threshold:', wethData.liquidationThreshold.toString());
    console.log('Is Borrowable:', wethData.isBorrowable);
    
    // Test user data
    console.log('\n👤 User Reserve Data:');
    const userData = await pool.getUserReserveData(await signer.getAddress(), CONFIG.WETH);
    console.log('Supply Balance:', ethers.formatEther(userData.supplyBalance));
    console.log('Supply Balance USD:', ethers.formatEther(userData.supplyBalanceUSD));
    
    // Calculate x_max for WithdrawModal
    const price = 150; // WETH price
    const collateralUSD = parseFloat(ethers.formatEther(userData.supplyBalanceUSD));
    const debtUSD = parseFloat(ethers.formatEther(userData.borrowBalanceUSD));
    const liquidationThreshold = parseInt(wethData.liquidationThreshold.toString());
    
    console.log('\n🧮 WithdrawModal Calculations:');
    console.log('Price:', price);
    console.log('Collateral USD:', collateralUSD);
    console.log('Debt USD:', debtUSD);
    console.log('Liquidation Threshold:', liquidationThreshold);
    
    // x_max = ((CollateralUSD - DebtUSD) * 10000) / (Price * liqThresholdBps)
    const netCollateral = collateralUSD - debtUSD;
    const denominator = price * (liquidationThreshold / 10000);
    const xMaxUSD = netCollateral / denominator;
    const xMaxUnits = xMaxUSD / price;
    
    console.log('Net Collateral:', netCollateral);
    console.log('Denominator:', denominator);
    console.log('x_max (USD):', xMaxUSD);
    console.log('x_max (Units):', xMaxUnits);
    
    // Clamp with user supply and pool liquidity
    const userSupplyUnits = parseFloat(ethers.formatEther(userData.supplyBalance));
    const poolLiquidityUnits = parseFloat(ethers.formatEther(wethData.reserveCash));
    
    const clampedMax = Math.min(xMaxUnits, userSupplyUnits, poolLiquidityUnits);
    console.log('User Supply Units:', userSupplyUnits);
    console.log('Pool Liquidity Units:', poolLiquidityUnits);
    console.log('Clamped Max Withdraw:', clampedMax);
    
    console.log('\n✅ WithdrawModal data test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWithdrawData();
