/**
 * Script để kiểm tra allowance của user cho LendingPool
 * 
 * Usage:
 *   node scripts/check_allowance.cjs
 * 
 * Hoặc với tham số:
 *   node scripts/check_allowance.cjs <userAddress> <tokenSymbol>
 */

const { ethers } = require('ethers');
const path = require('path');

// Load addresses
let addresses;
try {
  const addressesPath = path.join(__dirname, '../lendhub-frontend-nextjs/src/addresses.js');
  addresses = require(addressesPath);
} catch (e) {
  console.error('❌ Cannot load addresses.js. Make sure you are in the project root.');
  console.error('Error:', e.message);
  process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
const userAddress = args[0] || process.env.USER_ADDRESS;
const tokenSymbol = (args[1] || 'DAI').toUpperCase();

// Default config (can be overridden by env vars)
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:7545';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337', 10);

// Token addresses mapping
const TOKEN_ADDRESSES = {
  DAI: addresses.DAIAddress,
  USDC: addresses.USDCAddress,
  WETH: addresses.WETHAddress,
  LINK: addresses.LINKAddress,
};

// Token decimals mapping
const TOKEN_DECIMALS = {
  DAI: 18,
  USDC: 6,
  WETH: 18,
  LINK: 18,
};

async function checkAllowance() {
  console.log('🔍 Checking Allowance...\n');
  
  // Validate user address
  if (!userAddress) {
    console.error('❌ Please provide user address:');
    console.error('   node scripts/check_allowance.cjs <userAddress> [tokenSymbol]');
    console.error('   Example: node scripts/check_allowance.cjs 0x123... DAI');
    process.exit(1);
  }
  
  if (!ethers.isAddress(userAddress)) {
    console.error('❌ Invalid user address:', userAddress);
    process.exit(1);
  }
  
  // Get token address
  const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
  if (!tokenAddress) {
    console.error(`❌ Token ${tokenSymbol} not found. Available tokens:`, Object.keys(TOKEN_ADDRESSES));
    process.exit(1);
  }
  
  const tokenDecimals = TOKEN_DECIMALS[tokenSymbol] || 18;
  
  const poolAddress = addresses.LendingPoolAddress;
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    console.error('❌ LENDING_POOL not set in addresses.js');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('   User:', userAddress);
  console.log('   Token:', tokenSymbol, '→', tokenAddress);
  console.log('   Pool:', poolAddress);
  console.log('   RPC:', RPC_URL);
  console.log('   Chain ID:', CHAIN_ID);
  console.log('');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // 1. Kiểm tra network connection
  try {
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log('✅ Network Connection:');
    console.log('   Block Number:', blockNumber);
    console.log('   Chain ID:', chainId);
    
    if (chainId !== CHAIN_ID) {
      console.warn(`⚠️  Chain ID mismatch! Expected ${CHAIN_ID}, got ${chainId}`);
    }
    console.log('');
  } catch (e) {
    console.error('❌ Cannot connect to RPC:', e.message);
    console.error('💡 Make sure Ganache is running on', RPC_URL);
    process.exit(1);
  }
  
  // 2. Kiểm tra token contract
  console.log('🔍 Checking Token Contract...');
  const tokenCode = await provider.getCode(tokenAddress);
  if (!tokenCode || tokenCode === '0x') {
    console.error('❌ Token contract has no code at', tokenAddress);
    console.error('💡 Token may not be deployed. Run deploy script.');
    process.exit(1);
  }
  console.log('✅ Token contract exists (', tokenCode.length, 'bytes )');
  
  // Get token info
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address, address) view returns (uint256)'
    ],
    provider
  );
  
  try {
    const [name, symbol, decimals, balance] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.balanceOf(userAddress)
    ]);
    
    console.log('   Name:', name);
    console.log('   Symbol:', symbol);
    console.log('   Decimals:', decimals);
    console.log('   User Balance:', ethers.formatUnits(balance, decimals), symbol);
    console.log('');
  } catch (e) {
    console.warn('⚠️  Cannot read token info:', e.message);
    console.log('');
  }
  
  // 3. Kiểm tra pool contract
  console.log('🔍 Checking Pool Contract...');
  const poolCode = await provider.getCode(poolAddress);
  if (!poolCode || poolCode === '0x') {
    console.error('❌ Pool contract has no code at', poolAddress);
    console.error('💡 LendingPool may not be deployed. Run deploy script.');
    process.exit(1);
  }
  console.log('✅ Pool contract exists (', poolCode.length, 'bytes )');
  console.log('');
  
  // 4. Kiểm tra allowance
  console.log('🔍 Checking Allowance...');
  try {
    const allowance = await tokenContract.allowance(userAddress, poolAddress);
    const formatted = ethers.formatUnits(allowance, tokenDecimals);
    
    console.log('📊 Result:');
    console.log('   Allowance:', formatted, tokenSymbol);
    console.log('   Raw Value:', allowance.toString());
    console.log('');
    
    if (allowance === 0n) {
      console.log('ℹ️  Allowance is 0 - User needs to approve');
      console.log('💡 When user clicks "Supply", system will auto-approve');
      console.log('💡 Or approve manually:');
      console.log(`   await token.approve("${poolAddress}", amount)`);
    } else {
      console.log('✅ Allowance exists!');
      console.log('💡 User can supply up to', formatted, tokenSymbol);
    }
  } catch (e) {
    console.error('❌ Error reading allowance:', e.message);
    console.error('   Details:', e);
    process.exit(1);
  }
  
  // 5. Kiểm tra approval events (optional)
  console.log('');
  console.log('🔍 Checking Approval Events...');
  try {
    // Create filter for Approval events
    const approvalInterface = new ethers.Interface([
      'event Approval(address indexed owner, address indexed spender, uint256 value)'
    ]);
    const filter = {
      address: tokenAddress,
      topics: [
        approvalInterface.getEvent('Approval').topicHash,
        ethers.zeroPadValue(userAddress, 32), // owner
        ethers.zeroPadValue(poolAddress, 32)  // spender
      ]
    };
    
    const events = await provider.getLogs(filter);
    
    if (events.length === 0) {
      console.log('ℹ️  No approval events found');
      console.log('💡 User has never approved this token for this pool');
    } else {
      console.log(`✅ Found ${events.length} approval event(s):`);
      events.forEach((event, i) => {
        const decoded = approvalInterface.decodeEventLog('Approval', event.data, event.topics);
        const value = ethers.formatUnits(decoded.value, tokenDecimals);
        console.log(`   Event ${i + 1}:`, {
          block: event.blockNumber,
          value: value,
          txHash: event.transactionHash
        });
      });
    }
  } catch (e) {
    console.warn('⚠️  Cannot read approval events:', e.message);
    console.warn('   (This is optional, not critical)');
  }
  
  console.log('');
  console.log('✅ Check completed!');
}

checkAllowance().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

