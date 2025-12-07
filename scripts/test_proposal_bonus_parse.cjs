/**
 * Script để test parse proposal description cho liquidation bonus
 * 
 * Usage:
 *   node scripts/test_proposal_bonus_parse.cjs
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

// Test descriptions
const testDescriptions = [
  {
    name: 'Test 1: Bonus = 5%',
    desc: `Asset Address: ${addresses.LINKAddress}
Asset Symbol: LINK
Proposed Bonus (%): 5`
  },
  {
    name: 'Test 2: Bonus = 1.00%',
    desc: `Asset Address: ${addresses.LINKAddress}
Asset Symbol: LINK
Proposed Bonus (%): 1.00`
  },
  {
    name: 'Test 3: Bonus = 5.5%',
    desc: `Asset Address: ${addresses.LINKAddress}
Asset Symbol: LINK
Proposed Bonus (%): 5.5`
  }
];

// Simulate contract parsing logic
function parseProposedBonus(desc) {
  const descBytes = Buffer.from(desc, 'utf8');
  const pattern = Buffer.from('Proposed Bonus (%): ', 'utf8');
  
  for (let i = 0; i <= descBytes.length - pattern.length; i++) {
    let isMatch = true;
    for (let j = 0; j < pattern.length; j++) {
      if (descBytes[i + j] !== pattern[j]) {
        isMatch = false;
        break;
      }
    }
    
    if (isMatch) {
      let start = i + pattern.length;
      let end = start;
      
      // Find end of number (stop at newline or non-digit/non-dot)
      while (end < descBytes.length) {
        const char = descBytes[end];
        if (char === 0x0A || char === 0x0D) break; // newline
        if ((char >= 0x30 && char <= 0x39) || char === 0x2E) {
          end++;
        } else {
          break;
        }
      }
      
      if (end > start) {
        const valueBytes = descBytes.slice(start, end);
        const valueStr = valueBytes.toString('utf8');
        
        // Parse number
        let num = 0;
        let decimals = 0;
        let foundDot = false;
        
        for (let k = 0; k < valueBytes.length; k++) {
          const char = valueBytes[k];
          if (char === 0x2E) {
            foundDot = true;
          } else {
            num = num * 10 + (char - 0x30);
            if (foundDot) decimals++;
          }
        }
        
        const bps = Math.floor((num * 100) / Math.pow(10, decimals));
        return { value: valueStr, num, decimals, bps };
      }
    }
  }
  
  return null;
}

async function testParse() {
  console.log('🧪 Testing Proposal Bonus Parse Logic...\n');
  
  console.log('📋 Configuration:');
  console.log('   Governor:', addresses.GovernorAddress);
  console.log('   LendingPool:', addresses.LendingPoolAddress);
  console.log('   LINK:', addresses.LINKAddress);
  console.log('');
  
  // Test parsing
  console.log('🔍 Testing Parse Logic...\n');
  
  for (const test of testDescriptions) {
    console.log(`📝 ${test.name}:`);
    console.log('Description:');
    console.log(test.desc);
    console.log('');
    
    const result = parseProposedBonus(test.desc);
    if (result) {
      console.log('   ✅ Parsed successfully:');
      console.log('      Value string:', result.value);
      console.log('      Number:', result.num);
      console.log('      Decimals:', result.decimals);
      console.log('      BPS:', result.bps, `(${result.bps / 100}%)`);
    } else {
      console.log('   ❌ Failed to parse');
    }
    console.log('');
  }
  
  // Check current bonus
  console.log('📊 Checking Current LINK Bonus...');
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const pool = new ethers.Contract(
      addresses.LendingPoolAddress,
      [
        'function reserves(address asset) external view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
      ],
      provider
    );
    
    const reserve = await pool.reserves(addresses.LINKAddress);
    const currentBonusBps = Number(reserve.liqBonusBps);
    const currentBonusPercent = currentBonusBps / 100;
    
    console.log(`   Current Bonus: ${currentBonusPercent}% (${currentBonusBps} bps)`);
    console.log('');
  } catch (e) {
    console.error('❌ Error checking current bonus:', e.message);
  }
  
  // Test with actual proposal
  console.log('🔍 Testing with Actual Proposal...');
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const governor = new ethers.Contract(
      addresses.GovernorAddress,
      [
        'function proposalCount() external view returns (uint256)',
        'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string summary, string description, string motivation, string ipfsHash, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 createdAt, uint256 votingEnd, uint256 executionTime, bool executed))'
      ],
      provider
    );
    
    const count = await governor.proposalCount();
    console.log(`   Total proposals: ${count}`);
    
    if (Number(count) > 0) {
      // Get latest proposal
      const proposal = await governor.getProposal(count);
      console.log(`   Latest proposal #${count}:`);
      console.log(`   Title: ${proposal.title}`);
      console.log(`   State: ${proposal.state}`);
      console.log(`   Executed: ${proposal.executed}`);
      console.log('');
      console.log('   Description:');
      console.log(proposal.description);
      console.log('');
      
      // Check if it contains "Proposed Bonus"
      if (proposal.description.includes('Proposed Bonus')) {
        const result = parseProposedBonus(proposal.description);
        if (result) {
          console.log('   ✅ Can parse bonus from description:');
          console.log(`      BPS: ${result.bps} (${result.bps / 100}%)`);
        } else {
          console.log('   ❌ Cannot parse bonus from description');
        }
      }
    }
  } catch (e) {
    console.error('❌ Error checking proposals:', e.message);
  }
  
  console.log('');
  console.log('✅ Test completed!');
}

testParse().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

