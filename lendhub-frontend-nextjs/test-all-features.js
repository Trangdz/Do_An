// Comprehensive test script for LendHub v2 Next.js
const { ethers } = require('ethers');

console.log('🚀 LendHub v2 Next.js - Comprehensive Feature Test\n');

// Test configuration
const RPC_URL = 'http://127.0.0.1:7545';
const CHAIN_ID = 1337;

// Contract addresses (latest deployed)
const CONTRACTS = {
  LENDING_POOL: '0x95A6d305E443869f7f13965B69C3E04A73842d3b',
  PRICE_ORACLE: '0x098a78c2b13CCff2D439242Fbd59e14e614D1E5F',
  WETH: '0x4C7035425F66224e74A1bC788f23c658819cD8A0',
  DAI: '0xcFa49d7c00Cd7A0726B7A8684822829f8b135427',
  USDC: '0x64e5D860DD84a354704b38B9354343CBCA2342EC',
};

// Test results
const results = {
  connection: false,
  contracts: {},
  accounts: [],
  lendingPool: false,
  priceOracle: false,
  tokens: {},
  build: false,
  devServer: false,
};

// Test 1: Connection
async function testConnection() {
  console.log('🔌 Testing connection to Ganache...');
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId);
    results.connection = true;
    return provider;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return null;
  }
}

// Test 2: Contract addresses
async function testContracts(provider) {
  console.log('📋 Testing contract addresses...');
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      if (code === '0x') {
        console.log(`❌ ${name}: No contract at ${address}`);
        results.contracts[name] = false;
      } else {
        console.log(`✅ ${name}: Contract found at ${address}`);
        results.contracts[name] = true;
      }
    } catch (error) {
      console.log(`❌ ${name}: Error checking ${address} - ${error.message}`);
      results.contracts[name] = false;
    }
  }
}

// Test 3: Account balances
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
    
    results.accounts = accounts;
    return accounts;
  } catch (error) {
    console.error('❌ Error getting accounts:', error.message);
    return [];
  }
}

// Test 4: LendingPool functionality
async function testLendingPool(provider) {
  console.log('🏦 Testing LendingPool contract...');
  try {
    const abi = [
      'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
    ];
    const pool = new ethers.Contract(CONTRACTS.LENDING_POOL, abi, provider);
    
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      const accountData = await pool.getAccountData(accounts[0]);
      console.log('✅ LendingPool getAccountData works');
      console.log('  Collateral:', ethers.formatUnits(accountData[0], 18));
      console.log('  Debt:', ethers.formatUnits(accountData[1], 18));
      console.log('  Health Factor:', ethers.formatUnits(accountData[2], 18));
      results.lendingPool = true;
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

// Test 5: PriceOracle functionality
async function testPriceOracle(provider) {
  console.log('📊 Testing PriceOracle contract...');
  try {
    const abi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];
    const oracle = new ethers.Contract(CONTRACTS.PRICE_ORACLE, abi, provider);
    
    const price = await oracle.getAssetPrice1e18(CONTRACTS.WETH);
    console.log('✅ PriceOracle works');
    console.log('  WETH Price:', ethers.formatUnits(price, 18), 'USD');
    results.priceOracle = true;
    return true;
  } catch (error) {
    console.error('❌ PriceOracle test failed:', error.message);
    return false;
  }
}

// Test 6: ERC20 tokens
async function testERC20Tokens(provider) {
  console.log('🪙 Testing ERC20 tokens...');
  const tokenABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ];
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    if (name === 'LENDING_POOL' || name === 'PRICE_ORACLE') continue;
    
    try {
      const token = new ethers.Contract(address, tokenABI, provider);
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      console.log(`✅ ${name}: ${symbol} (${decimals} decimals)`);
      results.tokens[name] = true;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results.tokens[name] = false;
    }
  }
}

// Test 7: Build test
async function testBuild() {
  console.log('🔨 Testing build process...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npm run build');
    if (stderr && stderr.includes('Failed to compile')) {
      console.log('❌ Build failed');
      console.log(stderr);
      return false;
    } else {
      console.log('✅ Build successful');
      results.build = true;
      return true;
    }
  } catch (error) {
    console.log('❌ Build test failed:', error.message);
    return false;
  }
}

// Test 8: Dev server test
async function testDevServer() {
  console.log('🌐 Testing dev server...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Start dev server in background
    const child = exec('npm run dev');
    
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if server is running
    const { stdout } = await execAsync('netstat -an | findstr :3000');
    if (stdout.includes('3000')) {
      console.log('✅ Dev server is running on port 3000');
      results.devServer = true;
      
      // Kill the dev server
      child.kill();
      return true;
    } else {
      console.log('❌ Dev server not running');
      child.kill();
      return false;
    }
  } catch (error) {
    console.log('❌ Dev server test failed:', error.message);
    return false;
  }
}

// Test 9: Next.js specific features
async function testNextJSFeatures() {
  console.log('⚡ Testing Next.js specific features...');
  
  const fs = require('fs');
  const path = require('path');
  
  const features = {
    pages: false,
    components: false,
    context: false,
    config: false,
    styles: false,
  };
  
  // Check pages directory
  if (fs.existsSync(path.join(__dirname, 'src/pages'))) {
    console.log('✅ Pages directory exists');
    features.pages = true;
  } else {
    console.log('❌ Pages directory missing');
  }
  
  // Check components directory
  if (fs.existsSync(path.join(__dirname, 'src/components'))) {
    console.log('✅ Components directory exists');
    features.components = true;
  } else {
    console.log('❌ Components directory missing');
  }
  
  // Check context directory
  if (fs.existsSync(path.join(__dirname, 'src/context'))) {
    console.log('✅ Context directory exists');
    features.context = true;
  } else {
    console.log('❌ Context directory missing');
  }
  
  // Check config files
  if (fs.existsSync(path.join(__dirname, 'next.config.js'))) {
    console.log('✅ next.config.js exists');
    features.config = true;
  } else {
    console.log('❌ next.config.js missing');
  }
  
  // Check styles
  if (fs.existsSync(path.join(__dirname, 'src/styles'))) {
    console.log('✅ Styles directory exists');
    features.styles = true;
  } else {
    console.log('❌ Styles directory missing');
  }
  
  return features;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive feature tests...\n');
  
  // Test 1: Connection
  const provider = await testConnection();
  if (!provider) {
    console.log('\n❌ Cannot proceed without connection');
    return;
  }
  
  console.log('');
  
  // Test 2: Contract addresses
  await testContracts(provider);
  console.log('');
  
  // Test 3: Account balances
  await testAccountBalances(provider);
  console.log('');
  
  // Test 4: LendingPool functionality
  await testLendingPool(provider);
  console.log('');
  
  // Test 5: PriceOracle functionality
  await testPriceOracle(provider);
  console.log('');
  
  // Test 6: ERC20 tokens
  await testERC20Tokens(provider);
  console.log('');
  
  // Test 7: Build test
  await testBuild();
  console.log('');
  
  // Test 8: Dev server test
  await testDevServer();
  console.log('');
  
  // Test 9: Next.js features
  const nextjsFeatures = await testNextJSFeatures();
  console.log('');
  
  // Summary
  console.log('📊 Comprehensive Test Summary:');
  console.log('==============================');
  console.log('Connection:', results.connection ? '✅' : '❌');
  console.log('LendingPool:', results.lendingPool ? '✅' : '❌');
  console.log('PriceOracle:', results.priceOracle ? '✅' : '❌');
  console.log('Build:', results.build ? '✅' : '❌');
  console.log('Dev Server:', results.devServer ? '✅' : '❌');
  console.log('Accounts:', results.accounts.length > 0 ? `✅ (${results.accounts.length})` : '❌');
  
  const contractCount = Object.values(results.contracts).filter(Boolean).length;
  console.log('Contracts:', `${contractCount}/${Object.keys(results.contracts).length} ✅`);
  
  const tokenCount = Object.values(results.tokens).filter(Boolean).length;
  console.log('Tokens:', `${tokenCount}/${Object.keys(results.tokens).length} ✅`);
  
  const nextjsCount = Object.values(nextjsFeatures).filter(Boolean).length;
  console.log('Next.js Features:', `${nextjsCount}/${Object.keys(nextjsFeatures).length} ✅`);
  
  console.log('\n🎯 Deployment Status:');
  if (results.connection && results.build && results.devServer) {
    console.log('✅ Ready for deployment!');
    console.log('🌐 Run: npm run dev (for development)');
    console.log('🚀 Run: vercel (for production deployment)');
  } else {
    console.log('❌ Not ready for deployment. Fix the issues above.');
  }
  
  console.log('\n📱 App URL: http://localhost:3000');
  console.log('🔗 Vercel: https://vercel.com');
  console.log('📚 Docs: https://nextjs.org/docs');
}

// Run tests
runAllTests().catch(console.error);


