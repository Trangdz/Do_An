// Debug script to test contract calls
import { ethers } from 'ethers';

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  LENDING_POOL: '0xa5B6bB91bFb06751E49aA6266d19c6dC9447A5D3',
  PRICE_ORACLE: '0x4d76FA67cA3144f21B0a4E8D3A23E322e3cbBCC9',
  WETH: '0x3801415922E64e42227Dd403795ED850F4FAd3cB',
  DAI: '0x871F08ecD57077234CF86e02f212A405554EDABf',
};

const POOL_ABI = [
  'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
];

const ORACLE_ABI = [
  'function getAssetPrice1e18(address asset) external view returns (uint256)',
];

async function debugContract() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
    const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider);

    console.log('=== Debugging Contract Calls ===\n');

    // Test WETH
    console.log('--- WETH ---');
    try {
      const wethPrice = await oracle.getAssetPrice1e18(CONFIG.WETH);
      console.log('WETH Price (1e18):', wethPrice.toString());
      console.log('WETH Price (normalized):', Number(wethPrice) / 1e18);
    } catch (error) {
      console.error('WETH Price Error:', error.message);
    }

    try {
      const wethData = await pool.getReserveData(CONFIG.WETH);
      console.log('WETH Reserve Data:');
      console.log('  reserveCash:', wethData.reserveCash.toString());
      console.log('  totalDebt:', wethData.totalDebt.toString());
      console.log('  utilizationWad:', wethData.utilizationWad.toString());
      console.log('  liquidityRateRayPerSec:', wethData.liquidityRateRayPerSec.toString());
      console.log('  variableBorrowRateRayPerSec:', wethData.variableBorrowRateRayPerSec.toString());
      
      // Calculate APRs
      const borrowAPR = Number(wethData.variableBorrowRateRayPerSec) / 1e25;
      const supplyAPR = Number(wethData.liquidityRateRayPerSec) / 1e25;
      console.log('  Calculated Borrow APR:', borrowAPR, '%');
      console.log('  Calculated Supply APR:', supplyAPR, '%');
    } catch (error) {
      console.error('WETH Reserve Data Error:', error.message);
    }

    console.log('\n--- DAI ---');
    try {
      const daiPrice = await oracle.getAssetPrice1e18(CONFIG.DAI);
      console.log('DAI Price (1e18):', daiPrice.toString());
      console.log('DAI Price (normalized):', Number(daiPrice) / 1e18);
    } catch (error) {
      console.error('DAI Price Error:', error.message);
    }

    try {
      const daiData = await pool.getReserveData(CONFIG.DAI);
      console.log('DAI Reserve Data:');
      console.log('  reserveCash:', daiData.reserveCash.toString());
      console.log('  totalDebt:', daiData.totalDebt.toString());
      console.log('  utilizationWad:', daiData.utilizationWad.toString());
      console.log('  liquidityRateRayPerSec:', daiData.liquidityRateRayPerSec.toString());
      console.log('  variableBorrowRateRayPerSec:', daiData.variableBorrowRateRayPerSec.toString());
      
      // Calculate APRs
      const borrowAPR = Number(daiData.variableBorrowRateRayPerSec) / 1e25;
      const supplyAPR = Number(daiData.liquidityRateRayPerSec) / 1e25;
      console.log('  Calculated Borrow APR:', borrowAPR, '%');
      console.log('  Calculated Supply APR:', supplyAPR, '%');
    } catch (error) {
      console.error('DAI Reserve Data Error:', error.message);
    }

  } catch (error) {
    console.error('General Error:', error.message);
  }
}

debugContract();
