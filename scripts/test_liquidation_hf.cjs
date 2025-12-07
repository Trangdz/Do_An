/**
 * Script để test Health Factor sau khi thanh lý
 * 
 * Usage:
 *   node scripts/test_liquidation_hf.cjs <userAddress>
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

  // Load addresses
let addresses;
let addressesContent;
try {
  const addressesPath = path.join(__dirname, '../lendhub-frontend-nextjs/src/addresses.js');
  addressesContent = fs.readFileSync(addressesPath, 'utf8');
  
  const extractAddress = (pattern) => {
    const match = addressesContent.match(pattern);
    return match ? match[1] : null;
  };
  
  addresses = {
    LendingPoolAddress: extractAddress(/LendingPoolAddress\s*=\s*"([^"]+)"/),
    LINKAddress: extractAddress(/LINKAddress\s*=\s*"([^"]+)"/),
    USDCAddress: extractAddress(/USDCAddress\s*=\s*"([^"]+)"/),
  };
} catch (e) {
  console.error('❌ Cannot load addresses.js:', e.message);
  process.exit(1);
}

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';
const userAddress = process.argv[2];

if (!userAddress) {
  console.error('❌ Please provide user address');
  console.log('Usage: node scripts/test_liquidation_hf.cjs <userAddress>');
  process.exit(1);
}

const POOL_ABI = [
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
  'function reserves(address asset) external view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))',
  'function getCurrentSupplyBalance(address user, address asset) external view returns (uint256)',
  'function getCurrentDebtBalance(address user, address asset) external view returns (uint256)',
];

const ORACLE_ABI = [
  'function getAssetPrice1e18(address asset) external view returns (uint256)',
];

async function testHF() {
  console.log('🔍 Testing Health Factor After Liquidation...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  const pool = new ethers.Contract(addresses.LendingPoolAddress, POOL_ABI, provider);
  
  // Get oracle address from addresses.js or contract
  let oracleAddress;
  try {
    // Try to get from addresses.js
    const oracleMatch = addressesContent.match(/PriceOracleAddress\s*=\s*"([^"]+)"/);
    if (oracleMatch) {
      oracleAddress = oracleMatch[1];
    } else {
      // Try to get from contract
      const OracleABI = ['function oracle() external view returns (address)'];
      const poolWithOracle = new ethers.Contract(addresses.LendingPoolAddress, OracleABI, provider);
      oracleAddress = await poolWithOracle.oracle();
    }
  } catch (e) {
    console.error('❌ Cannot get oracle address:', e.message);
    process.exit(1);
  }
  
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
  
  console.log('📋 Configuration:');
  console.log('   User:', userAddress);
  console.log('   Pool:', addresses.LendingPoolAddress);
  console.log('   Oracle:', oracleAddress);
  console.log('');
  
  // 1. Get account data
  console.log('📊 Getting Account Data...');
  let hfNum;
  try {
    const [coll, debt, hf] = await pool.getAccountData(userAddress);
    const collNum = Number(ethers.formatUnits(coll, 18));
    const debtNum = Number(ethers.formatUnits(debt, 18));
    hfNum = Number(ethers.formatUnits(hf, 18));
    
    console.log('   Collateral Value (weighted):', collNum.toFixed(2), 'USD');
    console.log('   Debt Value:', debtNum.toFixed(2), 'USD');
    console.log('   Health Factor:', hfNum.toFixed(4));
    console.log('   Liquidatable:', hfNum < 1.0 ? 'YES ❌' : 'NO ✅');
    console.log('');
  } catch (e) {
    console.error('❌ Error getting account data:', e.message);
    return;
  }
  
  // 2. Get detailed position data
  console.log('📊 Getting Detailed Position Data...');
  
  const linkReserve = await pool.reserves(addresses.LINKAddress);
  const usdcReserve = await pool.reserves(addresses.USDCAddress);
  
  const linkSupply = await pool.getCurrentSupplyBalance(userAddress, addresses.LINKAddress);
  const usdcDebt = await pool.getCurrentDebtBalance(userAddress, addresses.USDCAddress);
  
  const linkPrice = await oracle.getAssetPrice1e18(addresses.LINKAddress);
  const usdcPrice = await oracle.getAssetPrice1e18(addresses.USDCAddress);
  
  const linkSupplyNum = Number(ethers.formatUnits(linkSupply, 18));
  const usdcDebtNum = Number(ethers.formatUnits(usdcDebt, 18));
  const linkPriceNum = Number(ethers.formatUnits(linkPrice, 18));
  const usdcPriceNum = Number(ethers.formatUnits(usdcPrice, 18));
  
  const ltvBps = Number(linkReserve.ltvBps);
  const liqThresholdBps = Number(linkReserve.liqThresholdBps);
  const liqBonusBps = Number(linkReserve.liqBonusBps);
  const closeFactorBps = Number(usdcReserve.closeFactorBps);
  
  console.log('   LINK Supply:', linkSupplyNum.toFixed(4), 'LINK');
  console.log('   LINK Price:', linkPriceNum.toFixed(2), 'USD');
  console.log('   USDC Debt:', usdcDebtNum.toFixed(2), 'USDC');
  console.log('   USDC Price:', usdcPriceNum.toFixed(2), 'USD');
  console.log('');
  console.log('   LTV:', ltvBps / 100, '%');
  console.log('   Liquidation Threshold:', liqThresholdBps / 100, '%');
  console.log('   Liquidation Bonus:', liqBonusBps / 100, '%');
  console.log('   Close Factor:', closeFactorBps / 100, '%');
  console.log('');
  
  // 3. Manual calculation
  console.log('🧮 Manual Calculation...');
  
  const collateralValueRaw = linkSupplyNum * linkPriceNum;
  const collateralValueLTV = collateralValueRaw * (ltvBps / 10000);
  const collateralValueLiq = collateralValueRaw * (liqThresholdBps / 10000);
  const debtValue = usdcDebtNum * usdcPriceNum;
  
  const hfLTV = debtValue > 0 ? collateralValueLTV / debtValue : Infinity;
  const hfLiq = debtValue > 0 ? collateralValueLiq / debtValue : Infinity;
  
  console.log('   Collateral Value (raw):', collateralValueRaw.toFixed(2), 'USD');
  console.log('   Collateral Value (weighted by LTV):', collateralValueLTV.toFixed(2), 'USD');
  console.log('   Collateral Value (weighted by LiqThreshold):', collateralValueLiq.toFixed(2), 'USD');
  console.log('   Debt Value:', debtValue.toFixed(2), 'USD');
  console.log('');
  console.log('   HF (calculated with LTV):', hfLTV.toFixed(4));
  console.log('   HF (calculated with LiqThreshold):', hfLiq.toFixed(4));
  console.log('   HF (from contract):', hfNum.toFixed(4));
  console.log('');
  
  // 4. Check which one matches
  if (Math.abs(hfLTV - hfNum) < 0.0001) {
    console.log('⚠️  Contract is using LTV for Health Factor calculation!');
    console.log('   This is the OLD logic. Need to redeploy with fix.');
  } else if (Math.abs(hfLiq - hfNum) < 0.0001) {
    console.log('✅ Contract is using Liquidation Threshold for Health Factor calculation!');
    console.log('   This is the CORRECT logic.');
  } else {
    console.log('⚠️  HF from contract does not match either calculation!');
    console.log('   There might be other factors (interest accrual, multiple assets, etc.)');
    console.log('   Difference (LTV):', Math.abs(hfLTV - hfNum).toFixed(4));
    console.log('   Difference (LiqThreshold):', Math.abs(hfLiq - hfNum).toFixed(4));
  }
  
  console.log('');
  
  // 5. Simulate liquidation
  if (hfNum < 1.0 && usdcDebtNum > 0) {
    console.log('💡 Simulating Liquidation...');
    
    const maxRepay = usdcDebtNum * (closeFactorBps / 10000);
    const repayAmount = maxRepay; // Assume max repay
    
    const repayUsd = repayAmount * usdcPriceNum;
    const seizeUsd = repayUsd * (1 + liqBonusBps / 10000);
    const seizeLink = seizeUsd / linkPriceNum;
    
    const collateralAfter = linkSupplyNum - seizeLink;
    const debtAfter = usdcDebtNum - repayAmount;
    
    const collateralValueAfterRaw = collateralAfter * linkPriceNum;
    const collateralValueAfterLiq = collateralValueAfterRaw * (liqThresholdBps / 10000);
    const debtValueAfter = debtAfter * usdcPriceNum;
    
    const hfAfter = debtValueAfter > 0 ? collateralValueAfterLiq / debtValueAfter : Infinity;
    
    console.log('   Repay:', repayAmount.toFixed(2), 'USDC');
    console.log('   Seize:', seizeLink.toFixed(4), 'LINK');
    console.log('   Collateral after:', collateralAfter.toFixed(4), 'LINK');
    console.log('   Debt after:', debtAfter.toFixed(2), 'USDC');
    console.log('   HF after liquidation:', hfAfter.toFixed(4));
    console.log('   Liquidatable after:', hfAfter < 1.0 ? 'YES ❌' : 'NO ✅');
  }
  
  console.log('');
  console.log('✅ Test completed!');
}

testHF().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

