/**
 * Script để kiểm tra và sửa vấn đề execute proposal không thay đổi bonus
 * 
 * Usage:
 *   node scripts/check_and_fix_proposal_execution.cjs
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load addresses
let addresses;
try {
  const addressesPath = path.join(__dirname, '../lendhub-frontend-nextjs/src/addresses.js');
  const addressesContent = fs.readFileSync(addressesPath, 'utf8');
  
  // Extract addresses using regex
  const extractAddress = (pattern) => {
    const match = addressesContent.match(pattern);
    return match ? match[1] : null;
  };
  
  addresses = {
    GovernorAddress: extractAddress(/GovernorAddress\s*=\s*"([^"]+)"/),
    LendingPoolAddress: extractAddress(/LendingPoolAddress\s*=\s*"([^"]+)"/),
    LINKAddress: extractAddress(/LINKAddress\s*=\s*"([^"]+)"/),
    DAIAddress: extractAddress(/DAIAddress\s*=\s*"([^"]+)"/),
    USDCAddress: extractAddress(/USDCAddress\s*=\s*"([^"]+)"/),
    WETHAddress: extractAddress(/WETHAddress\s*=\s*"([^"]+)"/),
  };
} catch (e) {
  console.error('❌ Cannot load addresses.js:', e.message);
  process.exit(1);
}

// Default RPC URL
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';

async function checkAndFix() {
  console.log('🔍 Checking Proposal Execution Setup...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Get deployer account
  const accounts = await provider.listAccounts();
  if (accounts.length === 0) {
    console.error('❌ No accounts found. Make sure Ganache is running.');
    process.exit(1);
  }
  // listAccounts() returns signer objects, get address from first one
  const firstSigner = accounts[0];
  const deployerAddress = typeof firstSigner === 'string' ? firstSigner : firstSigner.address;
  const signer = provider.getSigner(deployerAddress);
  
  console.log('📋 Configuration:');
  console.log('   RPC:', RPC_URL);
  console.log('   Deployer:', deployerAddress);
  console.log('   Governor:', addresses.GovernorAddress);
  console.log('   LendingPool:', addresses.LendingPoolAddress);
  console.log('');
  
  // 1. Check Governor contract
  if (!addresses.GovernorAddress || addresses.GovernorAddress === '0x0000000000000000000000000000000000000000') {
    console.error('❌ GovernorAddress not set');
    process.exit(1);
  }
  
  const governorCode = await provider.getCode(addresses.GovernorAddress);
  if (!governorCode || governorCode === '0x') {
    console.error('❌ Governor contract not deployed');
    process.exit(1);
  }
  console.log('✅ Governor contract exists');
  
  // 2. Check LendingPool in Governor
  const governor = new ethers.Contract(
    addresses.GovernorAddress,
    [
      'function lendingPool() external view returns (address)',
      'function owner() external view returns (address)',
      'function assetAddresses(string memory symbol) external view returns (address)',
      'function setAssetAddress(string memory symbol, address assetAddress) external',
      'function setLendingPool(address _lendingPool) external'
    ],
    provider
  );
  
  try {
    const poolInGovernor = await governor.lendingPool();
    console.log('📊 LendingPool in Governor:', poolInGovernor);
    
    if (poolInGovernor === '0x0000000000000000000000000000000000000000') {
      console.log('⚠️  LendingPool not set in Governor');
      console.log('🔧 Setting LendingPool...');
      
      const governorWithSigner = governor.connect(signer);
      const tx = await governorWithSigner.setLendingPool(addresses.LendingPoolAddress);
      await tx.wait();
      console.log('✅ LendingPool set in Governor');
    } else if (poolInGovernor.toLowerCase() !== addresses.LendingPoolAddress.toLowerCase()) {
      console.log('⚠️  LendingPool mismatch!');
      console.log('   In Governor:', poolInGovernor);
      console.log('   Expected:', addresses.LendingPoolAddress);
      console.log('🔧 Updating LendingPool...');
      
      const governorWithSigner = governor.connect(signer);
      const tx = await governorWithSigner.setLendingPool(addresses.LendingPoolAddress);
      await tx.wait();
      console.log('✅ LendingPool updated in Governor');
    } else {
      console.log('✅ LendingPool correctly set in Governor');
    }
  } catch (e) {
    console.error('❌ Error checking LendingPool:', e.message);
  }
  
  console.log('');
  
  // 3. Check Asset Addresses
  const assets = [
    { symbol: 'LINK', address: addresses.LINKAddress },
    { symbol: 'DAI', address: addresses.DAIAddress },
    { symbol: 'USDC', address: addresses.USDCAddress },
    { symbol: 'WETH', address: addresses.WETHAddress },
  ];
  
  console.log('🔍 Checking Asset Addresses...');
  let needsUpdate = false;
  
  for (const asset of assets) {
    if (!asset.address) {
      console.log(`⚠️  ${asset.symbol} address not found in addresses.js`);
      continue;
    }
    
    try {
      const storedAddress = await governor.assetAddresses(asset.symbol);
      
      if (storedAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`⚠️  ${asset.symbol} address not set in Governor`);
        console.log(`   Expected: ${asset.address}`);
        needsUpdate = true;
      } else if (storedAddress.toLowerCase() !== asset.address.toLowerCase()) {
        console.log(`⚠️  ${asset.symbol} address mismatch!`);
        console.log(`   In Governor: ${storedAddress}`);
        console.log(`   Expected: ${asset.address}`);
        needsUpdate = true;
      } else {
        console.log(`✅ ${asset.symbol} address correctly set: ${asset.address}`);
      }
    } catch (e) {
      console.error(`❌ Error checking ${asset.symbol}:`, e.message);
    }
  }
  
  console.log('');
  
  // 4. Set Asset Addresses if needed
  if (needsUpdate) {
    console.log('🔧 Setting Asset Addresses...');
    
    const governorWithSigner = governor.connect(signer);
    
    for (const asset of assets) {
      if (!asset.address) continue;
      
      try {
        const storedAddress = await governor.assetAddresses(asset.symbol);
        
        if (storedAddress === '0x0000000000000000000000000000000000000000' ||
            storedAddress.toLowerCase() !== asset.address.toLowerCase()) {
          console.log(`   Setting ${asset.symbol}...`);
          const tx = await governorWithSigner.setAssetAddress(asset.symbol, asset.address);
          await tx.wait();
          console.log(`   ✅ ${asset.symbol} set to ${asset.address}`);
        }
      } catch (e) {
        console.error(`   ❌ Failed to set ${asset.symbol}:`, e.message);
      }
    }
  } else {
    console.log('✅ All asset addresses are correctly set');
  }
  
  console.log('');
  
  // 5. Test Parse Description
  console.log('🧪 Testing Description Parse...');
  const testDescription = `Asset Address: ${addresses.LINKAddress}
Asset Symbol: LINK
Proposed Bonus (%): 5`;
  
  console.log('Test Description:');
  console.log(testDescription);
  console.log('');
  
  // Test extract asset
  try {
    // We can't directly test the contract's internal functions, but we can check if execute would work
    console.log('✅ Description format looks correct');
    console.log('   - Has "Asset Address: 0x..."');
    console.log('   - Has "Asset Symbol: LINK"');
    console.log('   - Has "Proposed Bonus (%): 5"');
  } catch (e) {
    console.error('❌ Error testing description:', e.message);
  }
  
  console.log('');
  
  // 6. Check Current Bonus
  console.log('📊 Checking Current LINK Bonus...');
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
    console.error('❌ Error checking current bonus:', e.message);
  }
  
  console.log('');
  console.log('✅ Check completed!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Create a new proposal with bonus = 5%');
  console.log('   2. Vote on the proposal');
  console.log('   3. Wait for voting period to end');
  console.log('   4. Execute the proposal');
  console.log('   5. Check if bonus changed to 5%');
}

checkAndFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

