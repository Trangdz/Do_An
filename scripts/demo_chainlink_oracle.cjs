const { ethers } = require('hardhat');

/**
 * Demo: Chainlink Price Oracle Integration
 * 
 * Shows how to integrate real Chainlink price feeds into LendHub
 */

async function main() {
  console.log('🔗 CHAINLINK ORACLE DEMO\n');
  console.log('='.repeat(80) + '\n');

  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  console.log('');

  // ========================================
  // PART 1: CHAINLINK PRICE FEEDS (Mainnet)
  // ========================================
  
  console.log('📡 CHAINLINK PRICE FEEDS ON MAINNET:\n');
  
  const mainnetFeeds = {
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6'
  };
  
  console.log('Token'.padEnd(15), 'Chainlink Aggregator Address');
  console.log('-'.repeat(80));
  for (const [token, address] of Object.entries(mainnetFeeds)) {
    console.log(token.padEnd(15), address);
  }
  console.log('');
  
  // ========================================
  // PART 2: DEPLOY CHAINLINK ORACLE
  // ========================================
  
  console.log('🚀 Deploying ChainlinkPriceOracle...\n');
  
  const ChainlinkOracle = await ethers.getContractFactory('ChainlinkPriceOracle');
  const oracle = await ChainlinkOracle.deploy();
  await oracle.waitForDeployment();
  
  const oracleAddress = await oracle.getAddress();
  console.log('✅ ChainlinkPriceOracle deployed:', oracleAddress);
  console.log('');
  
  // ========================================
  // PART 3: SETUP FOR GANACHE (using manual prices)
  // ========================================
  
  console.log('⚙️  Setting up prices for Ganache (local testnet)...\n');
  
  // Deploy mock tokens
  const ERC20 = await ethers.getContractFactory('ERC20Mock');
  const weth = await ERC20.deploy('Wrapped Ether', 'WETH', 18);
  const dai = await ERC20.deploy('Dai Stablecoin', 'DAI', 18);
  const usdc = await ERC20.deploy('USD Coin', 'USDC', 6);
  const link = await ERC20.deploy('Chainlink', 'LINK', 18);
  
  await Promise.all([
    weth.waitForDeployment(),
    dai.waitForDeployment(),
    usdc.waitForDeployment(),
    link.waitForDeployment()
  ]);
  
  const tokens = {
    WETH: await weth.getAddress(),
    DAI: await dai.getAddress(),
    USDC: await usdc.getAddress(),
    LINK: await link.getAddress()
  };
  
  // Set manual prices (since Ganache doesn't have Chainlink)
  console.log('Setting manual prices (Ganache fallback):');
  await oracle.setManualPrice(tokens.WETH, ethers.parseUnits('2000', 18)); // $2000
  await oracle.setManualPrice(tokens.DAI, ethers.parseUnits('1', 18));     // $1
  await oracle.setManualPrice(tokens.USDC, ethers.parseUnits('1', 18));    // $1
  await oracle.setManualPrice(tokens.LINK, ethers.parseUnits('15', 18));   // $15
  
  console.log('  WETH: $2,000');
  console.log('  DAI:  $1');
  console.log('  USDC: $1');
  console.log('  LINK: $15');
  console.log('');
  
  // ========================================
  // PART 4: TEST ORACLE
  // ========================================
  
  console.log('🧪 Testing oracle prices...\n');
  
  for (const [symbol, address] of Object.entries(tokens)) {
    const price = await oracle.getAssetPrice1e18(address);
    const priceUSD = ethers.formatUnits(price, 18);
    console.log(`  ${symbol.padEnd(6)} price: $${priceUSD}`);
  }
  console.log('');
  
  // ========================================
  // PART 5: REAL-WORLD USAGE
  // ========================================
  
  console.log('🌍 HOW IT WORKS IN PRODUCTION:\n');
  
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ MAINNET (Production):                                   │');
  console.log('│   1. Deploy ChainlinkPriceOracle                        │');
  console.log('│   2. Set Chainlink feeds:                               │');
  console.log('│      oracle.setPriceFeed(WETH, 0x5f4e...)              │');
  console.log('│   3. Prices update automatically every ~1 minute        │');
  console.log('│   4. Decentralized: Multiple nodes verify prices        │');
  console.log('│                                                         │');
  console.log('│ TESTNET (Ganache/Hardhat):                             │');
  console.log('│   1. Deploy ChainlinkPriceOracle                        │');
  console.log('│   2. Set manual prices:                                 │');
  console.log('│      oracle.setManualPrice(WETH, 2000e18)              │');
  console.log('│   3. Update prices manually for testing                 │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log('');
  
  // ========================================
  // PART 6: BENEFITS OF CHAINLINK
  // ========================================
  
  console.log('✨ BENEFITS OF CHAINLINK ORACLES:\n');
  console.log('  ✅ Decentralized: Multiple independent nodes');
  console.log('  ✅ Tamper-proof: Cryptographically secured');
  console.log('  ✅ Reliable: 99.9%+ uptime');
  console.log('  ✅ Real-time: Updates every ~1 minute');
  console.log('  ✅ Battle-tested: Used by Aave, Compound, Synthetix...');
  console.log('  ✅ Prevents manipulation: Median of multiple sources');
  console.log('');
  
  // ========================================
  // PART 7: COMPARISON
  // ========================================
  
  console.log('📊 ORACLE COMPARISON:\n');
  console.log('┌────────────────┬─────────────┬──────────────┬─────────┐');
  console.log('│ Feature        │ Mock Oracle │ Chainlink    │ Best    │');
  console.log('├────────────────┼─────────────┼──────────────┼─────────┤');
  console.log('│ Decentralized  │ ❌ No       │ ✅ Yes       │ Chainlink│');
  console.log('│ Auto-update    │ ❌ No       │ ✅ Yes       │ Chainlink│');
  console.log('│ Secure         │ ⚠️  Medium  │ ✅ High      │ Chainlink│');
  console.log('│ Easy to test   │ ✅ Yes      │ ⚠️  Medium   │ Mock    │');
  console.log('│ Gas cost       │ ✅ Low      │ ⚠️  Medium   │ Mock    │');
  console.log('│ Production-ready│ ❌ No      │ ✅ Yes       │ Chainlink│');
  console.log('└────────────────┴─────────────┴──────────────┴─────────┘');
  console.log('');
  
  // ========================================
  // SUMMARY
  // ========================================
  
  console.log('='.repeat(80));
  console.log('📝 SUMMARY:\n');
  console.log('✅ ChainlinkPriceOracle deployed:', oracleAddress);
  console.log('✅ Manual prices set for Ganache testing');
  console.log('✅ Ready to integrate with LendingPool');
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('  1. Replace PriceOracle with ChainlinkPriceOracle in LendingPool');
  console.log('  2. For Mainnet: Use setPriceFeed() with real Chainlink addresses');
  console.log('  3. For Ganache: Use setManualPrice() for testing');
  console.log('  4. Test liquidations with price changes!');
  console.log('');
  console.log('📚 LEARN MORE:');
  console.log('  • Chainlink Docs: https://docs.chain.link/data-feeds');
  console.log('  • Price Feeds: https://data.chain.link/');
  console.log('  • Aave Oracle: https://github.com/aave/aave-v3-core/blob/master/contracts/misc/AaveOracle.sol');
  console.log('');
  console.log('='.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

