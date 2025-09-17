// Test script for LendHub v2 Next.js features
const { ethers } = require('ethers');

// Test configuration
const RPC_URL = 'http://localhost:8545';
const CHAIN_ID = 1337;

// Contract addresses
const CONTRACTS = {
  LENDING_POOL: '0x1235aFDCab4a91496Bd74B3C527E50f961484d74',
  PRICE_ORACLE: '0xE315EF5DA360EC7Cfd0c59fEdf9F21a1E2c75A6b',
  WETH: '0xb5d81ad8Cacf1F3462e4C264Fd1850E4448464DA',
  DAI: '0xD7C7F0F9DA99f7630FFE1336333db8818caa3fc2',
  USDC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  LINK: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

// Test functions
async function testConnection() {
  console.log('🔌 Testing connection to Ganache...');
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId);
    return provider;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return null;
  }
}

async function testContracts(provider) {
  console.log('📋 Testing contract addresses...');
  const results = {};
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      if (code === '0x') {
        console.log(`❌ ${name}: No contract at ${address}`);
        results[name] = false;
      } else {
        console.log(`✅ ${name}: Contract found at ${address}`);
        results[name] = true;
      }
    } catch (error) {
      console.log(`❌ ${name}: Error checking ${address} - ${error.message}`);
      results[name] = false;
    }
  }
  
  return results;
}

async function testAccountBalances(provider) {
  console.log('💰 Testing account balances...');
  try {
    const accounts = await provider.listAccounts();
    console.log(`Found ${accounts.length} accounts`);
    
    for (let i = 0; i < Math.min(3, accounts.length); i++) {
      const account = accounts[i];
      const balance = await provider.getBalance(account);
      console.log(`Account ${i}: ${account} - ${ethers.formatEther(balance)} ETH`);
    }
    
    return accounts;
  } catch (error) {
    console.error('❌ Error getting accounts:', error.message);
    return [];
  }
}

async function testLendingPool(provider) {
  console.log('🏦 Testing LendingPool contract...');
  try {
    const abi = [
      'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    const pool = new ethers.Contract(CONTRACTS.LENDING_POOL, abi, provider);
    
    // Test with first account
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      const accountData = await pool.getAccountData(accounts[0]);
      console.log('✅ LendingPool getAccountData works');
      console.log('  Collateral:', ethers.formatUnits(accountData[0], 18));
      console.log('  Debt:', ethers.formatUnits(accountData[1], 18));
      console.log('  Health Factor:', ethers.formatUnits(accountData[2], 18));
      return true;
    } else {
      console.log('❌ No accounts available for testing');
      return false;
    }
  } catch (error) {
    console.error('❌ LendingPool test failed:', error.message);
    return false;
  }
}

async function testPriceOracle(provider) {
  console.log('📊 Testing PriceOracle contract...');
  try {
    const abi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];
    const oracle = new ethers.Contract(CONTRACTS.PRICE_ORACLE, abi, provider);
    
    // Test with WETH
    const price = await oracle.getAssetPrice1e18(CONTRACTS.WETH);
    console.log('✅ PriceOracle works');
    console.log('  WETH Price:', ethers.formatUnits(price, 18), 'USD');
    return true;
  } catch (error) {
    console.error('❌ PriceOracle test failed:', error.message);
    return false;
  }
}

async function testERC20Tokens(provider) {
  console.log('🪙 Testing ERC20 tokens...');
  const tokenABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ];
  
  const results = {};
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    if (name === 'LENDING_POOL' || name === 'PRICE_ORACLE') continue;
    
    try {
      const token = new ethers.Contract(address, tokenABI, provider);
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      console.log(`✅ ${name}: ${symbol} (${decimals} decimals)`);
      results[name] = true;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results[name] = false;
    }
  }
  
  return results;
}

async function runAllTests() {
  console.log('🚀 Starting LendHub v2 Next.js Feature Tests\n');
  
  // Test 1: Connection
  const provider = await testConnection();
  if (!provider) {
    console.log('\n❌ Cannot proceed without connection');
    return;
  }
  
  console.log('');
  
  // Test 2: Contract addresses
  const contractResults = await testContracts(provider);
  console.log('');
  
  // Test 3: Account balances
  const accounts = await testAccountBalances(provider);
  console.log('');
  
  // Test 4: LendingPool functionality
  const poolWorks = await testLendingPool(provider);
  console.log('');
  
  // Test 5: PriceOracle functionality
  const oracleWorks = await testPriceOracle(provider);
  console.log('');
  
  // Test 6: ERC20 tokens
  const tokenResults = await testERC20Tokens(provider);
  console.log('');
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  console.log('Connection:', provider ? '✅' : '❌');
  console.log('LendingPool:', poolWorks ? '✅' : '❌');
  console.log('PriceOracle:', oracleWorks ? '✅' : '❌');
  console.log('Accounts:', accounts.length > 0 ? `✅ (${accounts.length})` : '❌');
  
  const contractCount = Object.values(contractResults).filter(Boolean).length;
  console.log('Contracts:', `${contractCount}/${Object.keys(contractResults).length} ✅`);
  
  const tokenCount = Object.values(tokenResults).filter(Boolean).length;
  console.log('Tokens:', `${tokenCount}/${Object.keys(tokenResults).length} ✅`);
  
  console.log('\n🎯 Next.js app should work if all tests pass!');
  console.log('Run: npm run dev');
}

// Run tests
runAllTests().catch(console.error);


