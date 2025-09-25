const { ethers } = require('ethers');

// Transaction data from your error
const txData = {
  to: '0x399664b80eb2706667a95418542109390cf5327e8',
  from: '0xc8ae7fdf55ef1eb865e3da4b6257ef036cca5bcf',
  gas: '0x124f80',
  data: '0x4b8a3529000000000000000000000000cc5d3852732a4c0e39bdf58955eed86d2eaa9934f0000000000000000000000000000000000000000000000000000000006bb3a7640000'
};

// LendingPool ABI (minimal for debugging)
const LENDING_POOL_ABI = [
  'function borrow(address asset, uint256 amount) external',
  'function lend(address asset, uint256 amount) external',
  'function withdraw(address asset, uint256 amount) external',
  'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
  'function reserves(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
  'function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
  
  // Common errors
  'error InsufficientCollateral(uint256 collateral, uint256 required)',
  'error InsufficientLiquidity(uint256 available, uint256 requested)',
  'error AssetNotBorrowable(address asset)',
  'error HealthFactorTooLow(uint256 healthFactor, uint256 minHealthFactor)',
  'error AmountTooLarge(uint256 amount, uint256 maxAmount)',
  'error Paused()',
  'error Unauthorized()'
];

function analyzeTransactionData() {
  console.log('🔍 === TRANSACTION DATA ANALYSIS (OFFLINE) ===\n');
  
  // 1. Basic transaction info
  console.log('1️⃣ Transaction Details:');
  console.log(`   To: ${txData.to}`);
  console.log(`   From: ${txData.from}`);
  console.log(`   Gas: ${txData.gas} (${parseInt(txData.gas, 16)})`);
  console.log(`   Data length: ${txData.data.length} chars`);
  console.log('');
  
  // 2. Function selector analysis
  console.log('2️⃣ Function Selector Analysis:');
  const selector = txData.data.slice(0, 10);
  console.log(`   Selector: ${selector}`);
  
  const iface = new ethers.Interface(LENDING_POOL_ABI);
  
  // Check if selector matches any function
  let matchedFunction = null;
  for (const fragment of iface.fragments) {
    if (fragment.type === 'function') {
      const funcSelector = ethers.id(fragment.format()).slice(0, 10);
      if (funcSelector === selector) {
        matchedFunction = fragment;
        break;
      }
    }
  }
  
  if (matchedFunction) {
    console.log(`   ✅ Matched function: ${matchedFunction.name}(${matchedFunction.inputs.map(i => i.type).join(', ')})`);
  } else {
    console.log('   ❌ No matching function found in ABI');
  }
  console.log('');
  
  // 3. Data structure analysis
  console.log('3️⃣ Data Structure Analysis:');
  console.log(`   Full data: ${txData.data}`);
  console.log(`   Expected length: 138 chars (0x + 4 + 32 + 32 = 0x + 68 bytes)`);
  console.log(`   Actual length: ${txData.data.length} chars`);
  
  if (txData.data.length !== 138) {
    console.log(`   ❌ MALFORMED: Expected 138 chars, got ${txData.data.length}`);
    console.log(`   Extra chars: ${txData.data.slice(138)}`);
  } else {
    console.log('   ✅ Length is correct');
  }
  console.log('');
  
  // 4. Parameter extraction
  console.log('4️⃣ Parameter Extraction:');
  
  // Extract asset address (32 bytes, padded)
  const assetPadded = txData.data.slice(10, 74);
  const asset = '0x' + assetPadded.slice(24); // Remove padding
  console.log(`   Asset (padded): ${assetPadded}`);
  console.log(`   Asset address: ${asset}`);
  
  // Extract amount (32 bytes, padded)
  const amountPadded = txData.data.slice(74, 138);
  console.log(`   Amount (padded): ${amountPadded}`);
  
  try {
    const amountBigInt = BigInt('0x' + amountPadded);
    console.log(`   Amount (BigInt): ${amountBigInt.toString()}`);
    console.log(`   Amount (ETH): ${ethers.formatEther(amountBigInt)}`);
    
    // Check if amount is reasonable
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (amountBigInt > maxUint256 / BigInt(2)) {
      console.log('   ⚠️  WARNING: Amount is extremely large, likely malformed!');
    }
    
    // Check if amount is zero
    if (amountBigInt === BigInt(0)) {
      console.log('   ⚠️  WARNING: Amount is zero');
    }
    
  } catch (amountError) {
    console.log(`   ❌ Error parsing amount: ${amountError.message}`);
  }
  console.log('');
  
  // 5. Try to decode with Interface
  console.log('5️⃣ Interface Decoding:');
  try {
    const decoded = iface.parseTransaction({ data: txData.data });
    console.log(`   ✅ Successfully decoded:`);
    console.log(`   Function: ${decoded.name}`);
    console.log(`   Args: ${JSON.stringify(decoded.args, null, 2)}`);
    
    if (decoded.name === 'borrow') {
      const [asset, amount] = decoded.args;
      console.log(`   Asset: ${asset}`);
      console.log(`   Amount: ${amount.toString()}`);
      console.log(`   Amount (ETH): ${ethers.formatEther(amount)}`);
    }
    
  } catch (decodeError) {
    console.log(`   ❌ Failed to decode: ${decodeError.message}`);
    console.log('   This indicates ABI mismatch or malformed data');
  }
  console.log('');
  
  // 6. Potential issues
  console.log('6️⃣ Potential Issues:');
  
  if (txData.data.length !== 138) {
    console.log('   ❌ MALFORMED DATA: Extra characters in transaction data');
    console.log(`   Extra data: ${txData.data.slice(138)}`);
  }
  
  try {
    const amountBigInt = BigInt('0x' + txData.data.slice(74, 138));
    if (amountBigInt > BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') / BigInt(2)) {
      console.log('   ❌ OVERFLOW: Amount exceeds reasonable limits');
    }
  } catch (e) {
    console.log('   ❌ INVALID AMOUNT: Cannot parse amount as valid uint256');
  }
  
  console.log('');
  
  // 7. Recommendations
  console.log('7️⃣ Recommendations:');
  console.log('   1. Check if the transaction data is being encoded correctly in the frontend');
  console.log('   2. Verify the contract address is correct and deployed');
  console.log('   3. Ensure the ABI matches the deployed contract');
  console.log('   4. Check if the amount calculation is correct (not overflowing)');
  console.log('   5. Verify the asset address is a valid ERC20 token');
  
  console.log('\n=== END ANALYSIS ===');
}

// Run the analysis
analyzeTransactionData();
