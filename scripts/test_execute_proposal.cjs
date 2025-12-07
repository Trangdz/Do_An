/**
 * Script để test execute proposal và debug lỗi
 * 
 * Usage:
 *   node scripts/test_execute_proposal.cjs <proposalId>
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
const proposalId = process.argv[2];

if (!proposalId) {
  console.error('❌ Please provide proposal ID');
  console.log('Usage: node scripts/test_execute_proposal.cjs <proposalId>');
  process.exit(1);
}

async function testExecute() {
  console.log('🧪 Testing Proposal Execution...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const accounts = await provider.listAccounts();
  const firstSigner = accounts[0];
  const deployerAddress = typeof firstSigner === 'string' ? firstSigner : firstSigner.address;
  const signer = provider.getSigner(deployerAddress);
  
  console.log('📋 Configuration:');
  console.log('   Proposal ID:', proposalId);
  console.log('   Governor:', addresses.GovernorAddress);
  console.log('   LendingPool:', addresses.LendingPoolAddress);
  console.log('');
  
  // Load Governor contract
  const GOVERNOR_ABI = [
    'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string summary, string description, string motivation, string ipfsHash, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 createdAt, uint256 votingEnd, uint256 executionTime, bool executed))',
    'function executeProposal(uint256 proposalId) external',
    'function updateProposalStates(uint256[] calldata proposalIds) external',
  ];
  
  const governor = new ethers.Contract(addresses.GovernorAddress, GOVERNOR_ABI, provider);
  const governorWithSigner = governor.connect(signer);
  
  // 1. Get proposal
  console.log('📊 Getting proposal...');
  try {
    const proposal = await governor.getProposal(proposalId);
    console.log('   Title:', proposal.title);
    console.log('   State:', proposal.state, `(${getStateName(proposal.state)})`);
    console.log('   Executed:', proposal.executed);
    console.log('   Votes For:', ethers.formatEther(proposal.votesFor), 'LENDX');
    console.log('   Votes Against:', ethers.formatEther(proposal.votesAgainst), 'LENDX');
    console.log('');
    
    // Show description
    console.log('📝 Description:');
    console.log(proposal.description);
    console.log('');
    
    // 2. Check state
    if (proposal.state !== 2) { // 2 = Succeeded
      console.log('⚠️  Proposal state is not Succeeded');
      console.log('   Current state:', getStateName(proposal.state));
      
      // Check if voting period ended
      const votingEnd = Number(proposal.votingEnd);
      const now = Math.floor(Date.now() / 1000);
      
      if (votingEnd <= now && proposal.state === 1) { // Active
        console.log('   Voting period has ended, updating state...');
        try {
          const updateTx = await governorWithSigner.updateProposalStates([BigInt(proposalId)]);
          await updateTx.wait();
          console.log('   ✅ State updated');
          
          // Re-fetch proposal
          const updatedProposal = await governor.getProposal(proposalId);
          console.log('   New state:', getStateName(updatedProposal.state));
          
          if (updatedProposal.state !== 2) {
            console.log('   ❌ Still not Succeeded, cannot execute');
            return;
          }
        } catch (e) {
          console.error('   ❌ Failed to update state:', e.message);
          return;
        }
      } else {
        console.log('   ❌ Cannot execute proposal in this state');
        return;
      }
    }
    
    if (proposal.executed) {
      console.log('⚠️  Proposal already executed');
      return;
    }
    
    // 3. Parse description to check
    console.log('🔍 Parsing description...');
    const desc = proposal.description;
    
    // Check asset address
    const assetAddressMatch = desc.match(/Asset Address:\s*(0x[a-fA-F0-9]{40})/i);
    if (assetAddressMatch) {
      console.log('   ✅ Found Asset Address:', assetAddressMatch[1]);
    } else {
      console.log('   ⚠️  Asset Address not found in description');
    }
    
    // Check asset symbol
    const assetSymbolMatch = desc.match(/Asset Symbol:\s*(\w+)/i);
    if (assetSymbolMatch) {
      console.log('   ✅ Found Asset Symbol:', assetSymbolMatch[1]);
    } else {
      console.log('   ⚠️  Asset Symbol not found in description');
    }
    
    // Check proposed bonus
    const bonusMatch = desc.match(/Proposed Bonus \(%\):\s*([\d.]+)/i);
    if (bonusMatch) {
      const bonusValue = parseFloat(bonusMatch[1]);
      const bonusBps = bonusValue * 100;
      console.log('   ✅ Found Proposed Bonus:', bonusValue + '%', `(${bonusBps} bps)`);
    } else {
      console.log('   ⚠️  Proposed Bonus not found in description');
    }
    
    console.log('');
    
    // 4. Check current bonus
    console.log('📊 Checking current LINK bonus...');
    try {
      const lendingPool = new ethers.Contract(
        addresses.LendingPoolAddress,
        [
          'function reserves(address asset) external view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
        ],
        provider
      );
      
      const reserve = await lendingPool.reserves(addresses.LINKAddress);
      const currentBonusBps = Number(reserve.liqBonusBps);
      const currentBonusPercent = currentBonusBps / 100;
      console.log(`   Current Bonus: ${currentBonusPercent}% (${currentBonusBps} bps)`);
    } catch (e) {
      console.error('   ❌ Error checking current bonus:', e.message);
    }
    
    console.log('');
    
    // 5. Try to execute (dry run with estimateGas)
    console.log('🧪 Testing execution (estimateGas)...');
    try {
      const gasEstimate = await governorWithSigner.executeProposal.estimateGas(proposalId);
      console.log('   ✅ Gas estimate:', gasEstimate.toString());
      console.log('   ✅ Execution should succeed');
    } catch (e) {
      console.error('   ❌ Gas estimation failed:', e.message);
      if (e.reason) {
        console.error('   Revert reason:', e.reason);
      }
      if (e.data) {
        console.error('   Revert data:', e.data);
      }
      return;
    }
    
    console.log('');
    console.log('💡 To actually execute, run:');
    console.log(`   node scripts/execute_proposal.cjs ${proposalId}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.reason) {
      console.error('   Revert reason:', e.reason);
    }
  }
}

function getStateName(state) {
  const states = ['Created', 'Active', 'Succeeded', 'Defeated', 'Executed', 'Canceled'];
  return states[Number(state)] || 'Unknown';
}

testExecute().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

