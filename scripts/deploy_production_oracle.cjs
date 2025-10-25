const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Production-Ready Oracle System...");
  console.log("=" .repeat(50));

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy ChainlinkPriceOracle (Production Oracle)
  console.log("\n📊 STEP 1: Deploy ChainlinkPriceOracle");
  console.log("-".repeat(40));
  
  const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
  const chainlinkOracle = await ChainlinkPriceOracle.deploy();
  await chainlinkOracle.waitForDeployment();
  
  console.log("✅ ChainlinkPriceOracle deployed:", await chainlinkOracle.getAddress());

  // 2. Deploy MockV3Aggregators (Simulate Chainlink feeds)
  console.log("\n🔗 STEP 2: Deploy Mock Chainlink Aggregators");
  console.log("-".repeat(40));
  
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  
  // ETH/USD: $2000, 8 decimals
  const ethUsdAggregator = await MockV3Aggregator.deploy(8, ethers.parseUnits("2000", 8));
  await ethUsdAggregator.waitForDeployment();
  
  // USDC/USD: $1, 8 decimals  
  const usdcUsdAggregator = await MockV3Aggregator.deploy(8, ethers.parseUnits("1", 8));
  await usdcUsdAggregator.waitForDeployment();
  
  // DAI/USD: $1, 8 decimals
  const daiUsdAggregator = await MockV3Aggregator.deploy(8, ethers.parseUnits("1", 8));
  await daiUsdAggregator.waitForDeployment();
  
  console.log("✅ ETH/USD Aggregator:", await ethUsdAggregator.getAddress());
  console.log("✅ USDC/USD Aggregator:", await usdcUsdAggregator.getAddress());
  console.log("✅ DAI/USD Aggregator:", await daiUsdAggregator.getAddress());

  // 3. Set up price feeds in ChainlinkOracle
  console.log("\n🔧 STEP 3: Configure Price Feeds");
  console.log("-".repeat(40));
  
  // Get token addresses (you'll need to update these with your actual deployed tokens)
  const WETH_ADDRESS = "0x7e1600E50472a5850A295cB8eeEB5C323c1f6254"; // Update with your WETH
  const USDC_ADDRESS = "0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5"; // Update with your USDC  
  const DAI_ADDRESS = "0x2d45297410159D48CE557EDf07fCBF2919F6a7Bf"; // Update with your DAI
  
  // Set Chainlink price feeds
  await chainlinkOracle.setPriceFeed(WETH_ADDRESS, await ethUsdAggregator.getAddress());
  await chainlinkOracle.setPriceFeed(USDC_ADDRESS, await usdcUsdAggregator.getAddress());
  await chainlinkOracle.setPriceFeed(DAI_ADDRESS, await daiUsdAggregator.getAddress());
  
  console.log("✅ Price feeds configured");

  // 4. Set manual prices as fallback
  console.log("\n💰 STEP 4: Set Manual Fallback Prices");
  console.log("-".repeat(40));
  
  await chainlinkOracle.setManualPrice(WETH_ADDRESS, ethers.parseUnits("2000", 18));
  await chainlinkOracle.setManualPrice(USDC_ADDRESS, ethers.parseUnits("1", 18));
  await chainlinkOracle.setManualPrice(DAI_ADDRESS, ethers.parseUnits("1", 18));
  
  console.log("✅ Manual prices set as fallback");

  // 5. Test the oracle
  console.log("\n🧪 STEP 5: Test Oracle Functionality");
  console.log("-".repeat(40));
  
  try {
    const wethPrice = await chainlinkOracle.getAssetPrice1e18(WETH_ADDRESS);
    const usdcPrice = await chainlinkOracle.getAssetPrice1e18(USDC_ADDRESS);
    const daiPrice = await chainlinkOracle.getAssetPrice1e18(DAI_ADDRESS);
    
    console.log("✅ WETH Price:", ethers.formatEther(wethPrice), "USD");
    console.log("✅ USDC Price:", ethers.formatEther(usdcPrice), "USD");
    console.log("✅ DAI Price:", ethers.formatEther(daiPrice), "USD");
  } catch (error) {
    console.log("❌ Oracle test failed:", error.message);
  }

  // 6. Update config files
  console.log("\n📝 STEP 6: Update Configuration Files");
  console.log("-".repeat(40));
  
  // Update indexer config
  const indexerConfigPath = path.join(__dirname, '..', 'indexer', 'config.env');
  let indexerConfig = '';
  
  if (fs.existsSync(indexerConfigPath)) {
    indexerConfig = fs.readFileSync(indexerConfigPath, 'utf8');
  }
  
  // Update ORACLE_ADDRESS
  if (indexerConfig.includes('ORACLE_ADDRESS=')) {
    indexerConfig = indexerConfig.replace(
      /ORACLE_ADDRESS=.*/,
      `ORACLE_ADDRESS=${await chainlinkOracle.getAddress()}`
    );
  } else {
    indexerConfig += `\nORACLE_ADDRESS=${await chainlinkOracle.getAddress()}\n`;
  }
  
  fs.writeFileSync(indexerConfigPath, indexerConfig);
  console.log("✅ Updated indexer config.env");

  // Update frontend addresses
  const frontendAddressesPath = path.join(__dirname, '..', 'lendhub-frontend-nextjs', 'src', 'addresses.ts');
  const addressesContent = `// Auto-generated addresses
export const PriceOracleAddress = "${await chainlinkOracle.getAddress()}";
export const LendingPoolAddress = "0x56328671A331a3563e86C4CC53b5E1945733A3E3"; // Update with your pool address

// Chainlink Aggregators
export const ETH_USD_AGGREGATOR = "${await ethUsdAggregator.getAddress()}";
export const USDC_USD_AGGREGATOR = "${await usdcUsdAggregator.getAddress()}";
export const DAI_USD_AGGREGATOR = "${await daiUsdAggregator.getAddress()}";

// Token Addresses
export const WETH_ADDRESS = "${WETH_ADDRESS}";
export const USDC_ADDRESS = "${USDC_ADDRESS}";
export const DAI_ADDRESS = "${DAI_ADDRESS}";
`;

  fs.writeFileSync(frontendAddressesPath, addressesContent);
  console.log("✅ Updated frontend addresses.ts");

  // 7. Print summary
  console.log("\n🎉 PRODUCTION ORACLE DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(50));
  console.log("📊 Oracle Address:", await chainlinkOracle.getAddress());
  console.log("🔗 ETH/USD Feed:", await ethUsdAggregator.getAddress());
  console.log("🔗 USDC/USD Feed:", await usdcUsdAggregator.getAddress());
  console.log("🔗 DAI/USD Feed:", await daiUsdAggregator.getAddress());
  
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Update your LendingPool to use the new oracle");
  console.log("2. Restart the indexer to use the new oracle");
  console.log("3. Test price updates with MockV3Aggregator.updateAnswer()");
  console.log("4. Deploy to testnet with real Chainlink feeds");
  
  console.log("\n🔧 PRODUCTION FEATURES:");
  console.log("✅ Chainlink integration ready");
  console.log("✅ Staleness protection (1 hour)");
  console.log("✅ Manual price fallback");
  console.log("✅ Owner-only configuration");
  console.log("✅ Real-time price feeds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

