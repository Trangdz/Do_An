import { ethers } from 'ethers';

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

async function debugTransaction() {
  console.log('🔍 === TRANSACTION DEBUG ANALYSIS ===\n');
  
  // 1. Setup provider (Ganache)
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  try {
    // 2. Check if 'to' is a contract
    console.log('1️⃣ Checking if address is a contract...');
    const code = await provider.getCode(txData.to);
    console.log(`   Address: ${txData.to}`);
    console.log(`   Code length: ${code.length}`);
    console.log(`   Is contract: ${code !== '0x' ? '✅ YES' : '❌ NO'}`);
    
    if (code === '0x') {
      console.log('❌ ERROR: Address is not a contract!');
      return;
    }
    console.log('');
    
    // 3. Decode transaction data
    console.log('2️⃣ Decoding transaction data...');
    const iface = new ethers.Interface(LENDING_POOL_ABI);
    
    try {
      const decoded = iface.parseTransaction({ data: txData.data });
      console.log(`   Function: ${decoded.name}`);
      console.log(`   Args: ${JSON.stringify(decoded.args, null, 2)}`);
      
      // Check if it's a borrow function
      if (decoded.name === 'borrow') {
        const [asset, amount] = decoded.args;
        console.log(`   Asset: ${asset}`);
        console.log(`   Amount (raw): ${amount.toString()}`);
        console.log(`   Amount (ETH): ${ethers.formatEther(amount)}`);
        
        // Check if amount is reasonable
        const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        if (amount > maxUint256 / BigInt(2)) {
          console.log('⚠️  WARNING: Amount is extremely large, likely malformed!');
        }
      }
    } catch (decodeError) {
      console.log('❌ Failed to decode transaction data:');
      console.log(`   Error: ${decodeError.message}`);
      console.log('   This suggests ABI mismatch or malformed data');
      return;
    }
    console.log('');
    
    // 4. Try static call to get revert reason
    console.log('3️⃣ Attempting static call to get revert reason...');
    
    try {
      // Method 1: Direct provider.call
      console.log('   Method 1: provider.call()');
      const callResult = await provider.call({
        to: txData.to,
        data: txData.data,
        from: txData.from
      });
      console.log(`   ✅ Call succeeded: ${callResult}`);
      
    } catch (callError) {
      console.log('   ❌ provider.call() failed:');
      console.log(`   Error: ${callError.message}`);
      
      // Try to extract revert reason
      if (callError.data) {
        console.log(`   Revert data: ${callError.data}`);
        
        try {
          // Try to decode as custom error
          const error = iface.parseError(callError.data);
          console.log(`   Custom error: ${error.name}`);
          console.log(`   Error args: ${JSON.stringify(error.args, null, 2)}`);
        } catch (parseError) {
          console.log('   Could not parse as custom error');
          console.log(`   Raw revert data: ${callError.data}`);
        }
      }
    }
    
    // 5. Try contract method call
    console.log('\n4️⃣ Attempting contract method call...');
    
    try {
      const contract = new ethers.Contract(txData.to, LENDING_POOL_ABI, provider);
      
      // Try to call the function statically
      if (txData.data.startsWith('0x4b8a3529')) { // borrow function
        const decoded = iface.parseTransaction({ data: txData.data });
        const [asset, amount] = decoded.args;
        
        console.log(`   Calling borrow(${asset}, ${amount})...`);
        const result = await contract.borrow.staticCall(asset, amount, {
          from: txData.from
        });
        console.log(`   ✅ Static call succeeded: ${result}`);
        
      }
    } catch (contractError) {
      console.log('   ❌ Contract method call failed:');
      console.log(`   Error: ${contractError.message}`);
      
      // Try to extract revert reason from contract error
      if (contractError.data) {
        console.log(`   Contract revert data: ${contractError.data}`);
        
        try {
          const error = iface.parseError(contractError.data);
          console.log(`   Contract custom error: ${error.name}`);
          console.log(`   Contract error args: ${JSON.stringify(error.args, null, 2)}`);
        } catch (parseError) {
          console.log('   Could not parse contract error as custom error');
        }
      }
    }
    
    // 6. Additional diagnostics
    console.log('\n5️⃣ Additional diagnostics...');
    
    try {
      const contract = new ethers.Contract(txData.to, LENDING_POOL_ABI, provider);
      
      // Check if asset is supported
      if (txData.data.startsWith('0x4b8a3529')) {
        const decoded = iface.parseTransaction({ data: txData.data });
        const [asset] = decoded.args;
        
        console.log(`   Checking reserve data for asset: ${asset}`);
        const reserveData = await contract.reserves(asset);
        console.log(`   Reserve cash: ${ethers.formatEther(reserveData.reserveCash)}`);
        console.log(`   Is borrowable: ${reserveData.isBorrowable}`);
        console.log(`   LTV: ${reserveData.ltv} bps`);
        
        // Check user account data
        console.log(`   Checking user account data...`);
        const accountData = await contract.getAccountData(txData.from);
        console.log(`   Collateral: ${ethers.formatEther(accountData.collateralValue1e18)}`);
        console.log(`   Debt: ${ethers.formatEther(accountData.debtValue1e18)}`);
        console.log(`   Health factor: ${ethers.formatEther(accountData.healthFactor1e18)}`);
      }
      
    } catch (diagError) {
      console.log(`   ❌ Diagnostics failed: ${diagError.message}`);
    }
    
  } catch (error) {
    console.log('❌ Fatal error during debugging:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug function
debugTransaction().catch(console.error);
