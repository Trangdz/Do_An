// Test dashboard data with account that has WETH
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
  'function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
];

const ORACLE_ABI = [
  'function getAssetPrice1e18(address asset) external view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function symbol() external view returns (string)',
];

async function testDashboardData() {
  try {
    console.log('Starting test...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('Provider created');
    
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    const userAddress = await signer.getAddress();
    
    console.log('=== Testing Dashboard Data ===');
    console.log('User address:', userAddress);
    
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
    const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider);
    
    // Test WETH
    console.log('\n--- WETH ---');
    try {
      const wethPrice = await oracle.getAssetPrice1e18(CONFIG.WETH);
      console.log('WETH Price:', ethers.formatEther(wethPrice));
      
      const wethReserveData = await pool.getReserveData(CONFIG.WETH);
      console.log('WETH Reserve Data:');
      console.log('  reserveCash:', ethers.formatEther(wethReserveData.reserveCash));
      console.log('  totalDebt:', ethers.formatEther(wethReserveData.totalDebt));
      console.log('  liquidityRateRayPerSec:', wethReserveData.liquidityRateRayPerSec.toString());
      console.log('  variableBorrowRateRayPerSec:', wethReserveData.variableBorrowRateRayPerSec.toString());
      
      // Calculate APRs
      const borrowAPR = Number(wethReserveData.variableBorrowRateRayPerSec) / 1e25;
      const supplyAPR = Number(wethReserveData.liquidityRateRayPerSec) / 1e25;
      console.log('  Calculated Borrow APR:', borrowAPR, '%');
      console.log('  Calculated Supply APR:', supplyAPR, '%');
      
      // Check user data
      const userWethData = await pool.getUserReserveData(userAddress, CONFIG.WETH);
      console.log('User WETH Data:');
      console.log('  supplyBalance:', ethers.formatEther(userWethData.supplyBalance1e18));
      console.log('  borrowBalance:', ethers.formatEther(userWethData.borrowBalance1e18));
      console.log('  isCollateral:', userWethData.isCollateral);
      
      // Check WETH balance
      const wethContract = new ethers.Contract(CONFIG.WETH, ERC20_ABI, provider);
      const wethBalance = await wethContract.balanceOf(userAddress);
      console.log('WETH Balance in wallet:', ethers.formatEther(wethBalance));
      
    } catch (error) {
      console.error('WETH Error:', error.message);
    }
    
    // Test DAI
    console.log('\n--- DAI ---');
    try {
      const daiPrice = await oracle.getAssetPrice1e18(CONFIG.DAI);
      console.log('DAI Price:', ethers.formatEther(daiPrice));
      
      const daiReserveData = await pool.getReserveData(CONFIG.DAI);
      console.log('DAI Reserve Data:');
      console.log('  reserveCash:', ethers.formatEther(daiReserveData.reserveCash));
      console.log('  totalDebt:', ethers.formatEther(daiReserveData.totalDebt));
      console.log('  liquidityRateRayPerSec:', daiReserveData.liquidityRateRayPerSec.toString());
      console.log('  variableBorrowRateRayPerSec:', daiReserveData.variableBorrowRateRayPerSec.toString());
      
      // Calculate APRs
      const borrowAPR = Number(daiReserveData.variableBorrowRateRayPerSec) / 1e25;
      const supplyAPR = Number(daiReserveData.liquidityRateRayPerSec) / 1e25;
      console.log('  Calculated Borrow APR:', borrowAPR, '%');
      console.log('  Calculated Supply APR:', supplyAPR, '%');
      
      // Check user data
      const userDaiData = await pool.getUserReserveData(userAddress, CONFIG.DAI);
      console.log('User DAI Data:');
      console.log('  supplyBalance:', ethers.formatEther(userDaiData.supplyBalance1e18));
      console.log('  borrowBalance:', ethers.formatEther(userDaiData.borrowBalance1e18));
      console.log('  isCollateral:', userDaiData.isCollateral);
      
    } catch (error) {
      console.error('DAI Error:', error.message);
    }
    
  } catch (error) {
    console.error('General Error:', error.message);
  }
}

testDashboardData();
