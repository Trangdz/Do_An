/**
 * Script để debug proposal execution cho liquidation bonus
 * 
 * Usage:
 *   node scripts/debug_proposal_execution.cjs <proposalId>
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load addresses
let addresses;
try {
  const addressesPath = path.join(__dirname, '../lendhub-frontend-nextjs/src/addresses.js');
  const addressesContent = fs.readFileSync(addressesPath, 'utf8');
  
  const extractAddress = (pattern) => {
    const match = addressesContent.match(pattern);
    return match ? match[1] : null;
  };
  
  addresses = {
    GovernorAddress: extractAddress(/GovernorAddress\s*=\s*"([^"]+)"/),
    LendingPoolAddress: extractAddress(/LendingPoolAddress\s*=\s*"([^"]+)"/),
    LINKAddress: extractAddress(/LINKAddress\s*=\s*"([^"]+)"/),
  };
} catch (e) {
  console.error('❌ Cannot load addresses.js:', e.message);
  process.exit(1);
}

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';
const proposalId = process.argv[2] || '14';

async function debugExecution() {
  console.log('🔍 Debugging Proposal Execution...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  const GOVERNOR_ABI = [
    'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string summary, string description, string motivation, string ipfsHash, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 createdAt, uint256 votingEnd, uint256 executionTime, bool executed))',
    'function assetAddresses(string memory symbol) external view returns (address)',
  ];
  
  const POOL_ABI = [
    'function reserves(address asset) external view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))',
    'function governor() external view returns (address)',
  ];
  
  const governor = new ethers.Contract(addresses.GovernorAddress, GOVERNOR_ABI, provider);
  const pool = new ethers.Contract(addresses.LendingPoolAddress, POOL_ABI, provider);
  
  console.log('📋 Configuration:');
  console.log('   Proposal ID:', proposalId);
  console.log('   Governor:', addresses.GovernorAddress);
  console.log('   LendingPool:', addresses.LendingPoolAddress);
  console.log('   LINK:', addresses.LINKAddress);
  console.log('');
  
  // 1. Get proposal
  console.log('📊 Getting Proposal...');
  const proposal = await governor.getProposal(proposalId);
  console.log('   Title:', proposal.title);
  console.log('   State:', proposal.state, `(${getStateName(proposal.state)})`);
  console.log('   Executed:', proposal.executed);
  console.log('');
  console.log('   Description:');
  console.log(proposal.description);
  console.log('');
  
  // 2. Parse description
  console.log('🔍 Parsing Description...');
  const desc = proposal.description;
  
  // Extract asset address
  const assetAddressMatch = desc.match(/Asset Address:\s*(0x[a-fA-F0-9]{40})/i);
  const assetSymbolMatch = desc.match(/Asset Symbol:\s*(\w+)/i);
  const bonusMatch = desc.match(/Proposed Bonus \(%\):\s*([\d.]+)/i);
  
  let assetAddress = null;
  if (assetAddressMatch) {
    assetAddress = assetAddressMatch[1];
    console.log('   ✅ Found Asset Address:', assetAddress);
  } else if (assetSymbolMatch) {
    const symbol = assetSymbolMatch[1];
    console.log('   ✅ Found Asset Symbol:', symbol);
    assetAddress = await governor.assetAddresses(symbol);
    console.log('   Asset Address from mapping:', assetAddress);
  } else {
    console.log('   ❌ Asset Address/Symbol not found');
  }
  
  if (bonusMatch) {
    const bonusValue = parseFloat(bonusMatch[1]);
    const bonusBps = Math.floor(bonusValue * 100);
    console.log('   ✅ Found Proposed Bonus:', bonusValue + '%', `(${bonusBps} bps)`);
  } else {
    console.log('   ❌ Proposed Bonus not found');
  }
  
  console.log('');
  
  // 3. Check current bonus
  console.log('📊 Checking Current Bonus...');
  if (assetAddress && assetAddress !== '0x0000000000000000000000000000000000000000') {
    try {
      const reserve = await pool.reserves(assetAddress);
      const currentBonusBps = Number(reserve.liqBonusBps);
      const currentBonusPercent = currentBonusBps / 100;
      console.log(`   Current Bonus: ${currentBonusPercent}% (${currentBonusBps} bps)`);
      
      if (bonusMatch) {
        const expectedBonus = Math.floor(parseFloat(bonusMatch[1]) * 100);
        if (currentBonusBps === expectedBonus) {
          console.log('   ✅ Bonus matches expected value!');
        } else {
          console.log(`   ❌ Bonus mismatch! Expected: ${expectedBonus} bps, Got: ${currentBonusBps} bps`);
        }
      }
    } catch (e) {
      console.error('   ❌ Error checking bonus:', e.message);
    }
  } else {
    console.log('   ⚠️  Cannot check bonus - asset address not found');
  }
  
  console.log('');
  
  // 4. Check Governor setup
  console.log('🔍 Checking Governor Setup...');
  try {
    const poolGovernor = await pool.governor();
    console.log('   Pool Governor:', poolGovernor);
    if (poolGovernor.toLowerCase() === addresses.GovernorAddress.toLowerCase()) {
      console.log('   ✅ Governor is set correctly in LendingPool');
    } else {
      console.log('   ❌ Governor mismatch!');
      console.log('      Expected:', addresses.GovernorAddress);
      console.log('      Got:', poolGovernor);
    }
  } catch (e) {
    console.error('   ❌ Error checking governor:', e.message);
  }
  
  // 5. Check asset address mapping
  if (assetSymbolMatch) {
    const symbol = assetSymbolMatch[1];
    console.log('');
    console.log('🔍 Checking Asset Address Mapping...');
    const mappedAddress = await governor.assetAddresses(symbol);
    console.log(`   ${symbol} in Governor mapping:`, mappedAddress);
    if (mappedAddress === '0x0000000000000000000000000000000000000000') {
      console.log('   ⚠️  Asset address not set in Governor mapping!');
      console.log('   This could cause proposal execution to fail.');
    } else if (assetAddressMatch && mappedAddress.toLowerCase() !== assetAddressMatch[1].toLowerCase()) {
      console.log('   ⚠️  Asset address mismatch!');
      console.log('      From description:', assetAddressMatch[1]);
      console.log('      From mapping:', mappedAddress);
    } else {
      console.log('   ✅ Asset address mapping is correct');
    }
  }
  
  console.log('');
  console.log('✅ Debug completed!');
}

function getStateName(state) {
  const states = ['Created', 'Active', 'Succeeded', 'Defeated', 'Executed', 'Canceled'];
  return states[Number(state)] || 'Unknown';
}

debugExecution().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

