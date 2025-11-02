/*
  🚀 DEPLOY COMPLETE LENDHUB SYSTEM + TOKENS
  
  This script deploys:
  1. All ERC20 tokens (WETH, DAI, USDC, LINK)
  2. Core contracts (LendingPool, InterestRateModel, PriceOracle)
  3. Initializes reserves
  4. Mints tokens to 10 test accounts
  5. Auto-updates frontend addresses
  
  Usage:
    npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
  
  Requirements:
    - Ganache CLI running on port 8545
    - Chain ID: 5777
    - Mnemonic: uniform message payment medal rural toward reject resist test immune smile ridge
  
  Start Ganache CLI:
    npx ganache --server.host 0.0.0.0 --server.port 8545 --chain.chainId 5777 --chain.networkId 5777 --wallet.totalAccounts 10 --wallet.defaultBalance 1000 --wallet.mnemonic "uniform message payment medal rural toward reject resist test immune smile ridge"
  
  Or use script:
    .\START_GANACHE_SIMPLE.bat
*/

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🚀 LENDHUB COMPLETE DEPLOYMENT TO GANACHE CLI             ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Validate network connection
  console.log("🔍 Validating Ganache CLI connection...");
  console.log("─".repeat(70));
  
  try {
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log("  Network Chain ID:", chainId);
    console.log("  Expected Chain ID: 5777");
    
    if (chainId !== 5777) {
      console.error("\n❌ ERROR: Chain ID mismatch!");
      console.error("   Expected: 5777");
      console.error("   Got:", chainId.toString());
      console.error("\n💡 Make sure Ganache CLI is running with:");
      console.error("   --chain.chainId 5777 --chain.networkId 5777");
      console.error("\n   Or use: .\\START_GANACHE_SIMPLE.bat\n");
      process.exit(1);
    }
    
    console.log("  ✅ Chain ID correct!");
    
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("  Current Block:", blockNumber);
    console.log("  ✅ Network connection OK!\n");
  } catch (error) {
    console.error("\n❌ ERROR: Cannot connect to Ganache!");
    console.error("   Make sure Ganache CLI is running on port 8545");
    console.error("\n   Start with: .\\START_GANACHE_SIMPLE.bat\n");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.warn("\n⚠️  WARNING: Deployer has 0 ETH!");
    console.warn("   Make sure Ganache CLI is using the correct mnemonic:");
    console.warn("   uniform message payment medal rural toward reject resist test immune smile ridge\n");
  } else {
    console.log("  ✅ Deployer has funds\n");
  }

  // ========================================
  // 1️⃣ DEPLOY TOKENS
  // ========================================
  console.log("1️⃣  Deploying ERC20 Tokens...");
  console.log("─".repeat(70));

  // Deploy local LinkToken (contracts/LinkToken.sol)
  const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
  const linkToken = await LinkTokenFactory.deploy();
  await linkToken.waitForDeployment();
  const linkAddress = await linkToken.getAddress();
  console.log("✅ LINK token deployed:", linkAddress);

  const TokenFactory = await ethers.getContractFactory("TokenWithWithdraw");
  
  // Deploy WETH (18 decimals) with 10,000,000 initial supply
  const weth = await TokenFactory.deploy("Wrapped Ether", "WETH", 18, 10000000);
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ WETH deployed:", wethAddress);
  
  // Deploy USDC (6 decimals) with 100,000,000 initial supply
  const usdc = await TokenFactory.deploy("USD Coin", "USDC", 6, 100000000);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC deployed:", usdcAddress);
  
  // Deploy DAI (18 decimals) with 100,000,000 initial supply
  const dai = await TokenFactory.deploy("Dai Stablecoin", "DAI", 18, 100000000);
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  console.log("✅ DAI deployed:", daiAddress);

  // ========================================
  // 2️⃣ DEPLOY CORE CONTRACTS
  // ========================================
  console.log("\n2️⃣  Deploying Core Contracts...");
  console.log("─".repeat(70));

  // Deploy InterestRateModel
  const InterestRateModelFactory = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = await InterestRateModelFactory.deploy();
  await interestRateModel.waitForDeployment();
  const irmAddress = await interestRateModel.getAddress();
  console.log("✅ InterestRateModel deployed:", irmAddress);

  // Deploy PriceOracle
  const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracleFactory.deploy();
  await priceOracle.waitForDeployment();
  const oracleAddress = await priceOracle.getAddress();
  console.log("✅ PriceOracle deployed:", oracleAddress);

  // Deploy LendingPool
  const LendingPoolFactory = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPoolFactory.deploy(
    irmAddress,
    oracleAddress,
    wethAddress,
    daiAddress
  );
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.getAddress();
  console.log("✅ LendingPool deployed:", poolAddress);

  // ========================================
  // 3️⃣ SET ORACLE PRICES
  // ========================================
  console.log("\n3️⃣  Setting Oracle Prices...");
  console.log("─".repeat(70));

  await priceOracle.setAssetPrice(wethAddress, ethers.parseEther("1600"));
  console.log("✅ WETH price: $1600");

  await priceOracle.setAssetPrice(daiAddress, ethers.parseEther("1"));
  console.log("✅ DAI price: $1");

  await priceOracle.setAssetPrice(usdcAddress, ethers.parseEther("1"));
  console.log("✅ USDC price: $1");

  await priceOracle.setAssetPrice(linkAddress, ethers.parseEther("10"));
  console.log("✅ LINK price: $10");

  // ========================================
  // 4️⃣ INITIALIZE RESERVES
  // ========================================
  console.log("\n4️⃣  Initializing Reserves...");
  console.log("─".repeat(70));

  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
  
  const baseRate = toRayPerSec(0.001);   // 0.1% base APR
  const slope1 = toRayPerSec(0.002);     // 0.2% slope 1
  const slope2 = toRayPerSec(0.01);      // 1% slope 2

  // Init WETH (collateral only, not borrowable)
  await lendingPool.initReserve(
    wethAddress, 18,
    1000,  // reserveFactorBps (10%)
    7500,  // ltvBps (75%)
    8000,  // liqThresholdBps (80%)
    500,   // liqBonusBps (5%)
    5000,  // closeFactorBps (50%)
    false, // isBorrowable = false
    8000,  // optimalUBps (80%)
    baseRate, slope1, slope2
  );
  console.log("✅ WETH reserve initialized (collateral only)");

  // Init DAI (borrowable)
  await lendingPool.initReserve(
    daiAddress, 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  );
  console.log("✅ DAI reserve initialized (borrowable)");

  // Init USDC (borrowable)
  await lendingPool.initReserve(
    usdcAddress, 6,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  );
  console.log("✅ USDC reserve initialized (borrowable)");

  // Init LINK (borrowable)
  await lendingPool.initReserve(
    linkAddress, 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  );
  console.log("✅ LINK reserve initialized (borrowable)");

  // ========================================
  // 5️⃣ MINT TOKENS TO TEST ACCOUNTS
  // ========================================
  console.log("\n5️⃣  Minting Tokens to Test Accounts...");
  console.log("─".repeat(70));

  const signers = await ethers.getSigners();
  const numUsers = Math.min(10, signers.length);
  
  for (let i = 0; i < numUsers; i++) {
    const user = signers[i];
    const address = await user.getAddress();
    
    // Mint tokens (must use parseUnits because mint() doesn't auto-scale)
    await weth.mint(address, ethers.parseUnits("10000", 18));      // 10,000 WETH
    await usdc.mint(address, ethers.parseUnits("1000000", 6));     // 1,000,000 USDC
    await dai.mint(address, ethers.parseUnits("1000000", 18));     // 1,000,000 DAI
    
    // LinkToken doesn't have mint(), so transfer from deployer
    await linkToken.transfer(address, ethers.parseUnits("100000", 18)); // 100,000 LINK
    
    console.log(`✅ User ${i}: ${address.substring(0, 10)}... (10K WETH, 1M USDC, 1M DAI, 100K LINK)`);
  }

  // ========================================
  // 6️⃣ DEPLOY PRICE AGGREGATOR (for Chainlink)
  // ========================================
  console.log("\n6️⃣  Deploying Price Aggregator...");
  console.log("─".repeat(70));

  const AggregatorFactory = await ethers.getContractFactory("PriceAggregator");
  const aggregator = await AggregatorFactory.deploy(8, "ETH / USD");
  await aggregator.waitForDeployment();
  const aggregatorAddress = await aggregator.getAddress();
  console.log("✅ PriceAggregator deployed:", aggregatorAddress);

  // ========================================
  // 7️⃣ SAVE ADDRESSES TO FILES
  // ========================================
  console.log("\n7️⃣  Saving Deployment Addresses...");
  console.log("─".repeat(70));

  const net = await ethers.provider.getNetwork();
  
  // Save to deployments/local-chainlink.json
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "local-chainlink.json");
  const data = {
    network: net.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      lendingPool: poolAddress,
      interestRateModel: irmAddress,
      priceOracle: oracleAddress,
      priceAggregator: aggregatorAddress,
    },
    tokens: {
      weth: wethAddress,
      usdc: usdcAddress,
      dai: daiAddress,
      link: linkAddress,
    },
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log("✅ Saved to:", outPath);
  
  // Auto-update frontend addresses.js
  // Detect correct path: if running from frontend dir, go up one level
  let frontendAddressesPath;
  const currentDir = process.cwd();
  const possiblePath1 = path.join(currentDir, "lendhub-frontend-nextjs", "src", "addresses.js");
  const possiblePath2 = path.join(currentDir, "src", "addresses.js");
  const possiblePath3 = path.join(__dirname, "..", "lendhub-frontend-nextjs", "src", "addresses.js");
  
  if (fs.existsSync(possiblePath2)) {
    // We're already in lendhub-frontend-nextjs
    frontendAddressesPath = possiblePath2;
  } else if (fs.existsSync(possiblePath1)) {
    // We're in root, frontend is subdirectory
    frontendAddressesPath = possiblePath1;
  } else {
    // Try relative to script directory
    frontendAddressesPath = possiblePath3;
  }
  
  const userAddresses = signers.slice(0, 10).map(s => s.address);
  
  const addressesContent = `// Auto-generated for GANACHE CLI
// Network: http://127.0.0.1:8545 | Chain ID: 5777
// Mnemonic: uniform message payment medal rural toward reject resist test immune smile ridge

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddress}";
export const InterestRateModelAddress = "${irmAddress}";
export const PriceOracleAddress = "${oracleAddress}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${wethAddress}";
export const DAIAddress = "${daiAddress}";
export const USDCAddress = "${usdcAddress}";
export const LINKAddress = "${linkAddress}";

// 10 Demo Users (each has 10K WETH, 1M DAI, 1M USDC, 100K LINK)
${userAddresses.map((addr, i) => `export const User${i}Address = "${addr}";`).join('\n')}
`;

  fs.writeFileSync(frontendAddressesPath, addressesContent);
  console.log("✅ Updated frontend addresses:", frontendAddressesPath);

  // ========================================
  // 8️⃣ DISPLAY SUMMARY
  // ========================================
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    🎉 DEPLOYMENT SUCCESSFUL!                       ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  
  console.log("\n📋 DEPLOYED CONTRACTS:");
  console.log("─".repeat(70));
  console.log("  LendingPool:        ", poolAddress);
  console.log("  InterestRateModel:  ", irmAddress);
  console.log("  PriceOracle:        ", oracleAddress);
  console.log("  PriceAggregator:    ", aggregatorAddress);
  
  console.log("\n🪙 TOKEN ADDRESSES:");
  console.log("─".repeat(70));
  console.log("  WETH:               ", wethAddress);
  console.log("  DAI:                ", daiAddress);
  console.log("  USDC:               ", usdcAddress);
  console.log("  LINK:               ", linkAddress);
  
  console.log("\n💰 TOKEN BALANCES (Each of 10 test accounts):");
  console.log("─".repeat(70));
  console.log("  • 10,000 WETH");
  console.log("  • 1,000,000 DAI");
  console.log("  • 1,000,000 USDC");
  console.log("  • 100,000 LINK");
  
  console.log("\n📊 ORACLE PRICES:");
  console.log("─".repeat(70));
  console.log("  • WETH: $1,600");
  console.log("  • DAI:  $1");
  console.log("  • USDC: $1");
  console.log("  • LINK: $10");
  
  console.log("\n🔧 RESERVE CONFIGURATION:");
  console.log("─".repeat(70));
  console.log("  • WETH: Collateral only (NOT borrowable)");
  console.log("  • DAI:  Borrowable");
  console.log("  • USDC: Borrowable");
  console.log("  • LINK: Borrowable");
  console.log("  • LTV:  75% | Liquidation Threshold: 80%");
  
  console.log("\n✅ NEXT STEPS:");
  console.log("─".repeat(70));
  console.log("  1. Start frontend:     cd lendhub-frontend-nextjs && npm run dev");
  console.log("  2. Open browser:       http://localhost:3000");
  console.log("  3. Connect MetaMask:   Import Ganache account (any of first 10)");
  console.log("  4. Add custom tokens:  Use addresses above");
  console.log("  5. Start testing! 🚀");
  
  console.log("\n💡 TIPS:");
  console.log("─".repeat(70));
  console.log("  • All 10 Ganache accounts already have tokens!");
  console.log("  • Frontend addresses have been auto-updated!");
  console.log("  • No need to manually configure anything!");
  
  // ========================================
  // 🔗 DEPLOY CHAINLINK PRICE AGGREGATORS
  // ========================================
  console.log("\n🔗 Deploying Chainlink Price Aggregators...");
  console.log("─".repeat(70));

  const AGGREGATOR_TOKENS = [
    { symbol: "ETH", description: "ETH / USD", decimals: 8 },
    { symbol: "WETH", description: "ETH / USD", decimals: 8 },
    { symbol: "USDC", description: "USDC / USD", decimals: 8 },
    { symbol: "DAI", description: "DAI / USD", decimals: 8 },
    { symbol: "LINK", description: "LINK / USD", decimals: 8 },
  ];

  const PriceAggregatorFactory = await ethers.getContractFactory("PriceAggregator");
  const aggregators = {};

  for (const token of AGGREGATOR_TOKENS) {
    const priceAggregator = await PriceAggregatorFactory.deploy(token.decimals, token.description);
    await priceAggregator.waitForDeployment();
    const addr = await priceAggregator.getAddress();
    aggregators[token.symbol] = addr;
    console.log(`✅ ${token.symbol.padEnd(6)} Aggregator: ${addr}`);
  }

  // Save aggregators
  const aggOutPath = path.join(__dirname, "../deployments/aggregators.json");
  const network = await ethers.provider.getNetwork();
  fs.writeFileSync(
    aggOutPath,
    JSON.stringify(
      {
        network: network.chainId.toString(),
        deployer: deployer.address,
        aggregators,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log("\n📝 Aggregators saved:", aggOutPath);

  // Copy to frontend
  const frontendAggPath = path.join(__dirname, "../lendhub-frontend-nextjs/deployments/aggregators.json");
  const frontendAggDir = path.dirname(frontendAggPath);
  if (!fs.existsSync(frontendAggDir)) {
    fs.mkdirSync(frontendAggDir, { recursive: true });
  }
  fs.copyFileSync(aggOutPath, frontendAggPath);
  console.log("📝 Copied to frontend");
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ DEPLOYMENT COMPLETE!                                ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log("🔗 CHAINLINK ORACLE SETUP:");
  console.log("─".repeat(70));
  console.log("  1. Get node sending address:");
  console.log("     docker logs chainlink_node | Select-String \"OUT OF FUNDS\"");
  console.log("     (Look for address in error message)");
  console.log("");
  console.log("  2. Authorize node for all aggregators:");
  console.log("     $env:NODE_ADDRESS=\"0xYOUR_SENDING_ADDRESS\"");
  console.log("     npx hardhat run scripts/authorize_all_aggregators.cjs --network ganache");
  console.log("");
  console.log("  3. Fund node with ETH:");
  console.log("     $env:NODE_ADDRESS=\"0xYOUR_SENDING_ADDRESS\"");
  console.log("     $env:AMOUNT_ETH=\"10.0\"");
  console.log("     npx hardhat run scripts/fund_node.cjs --network ganache");
  console.log("");
  console.log("  4. Create jobs for all tokens:");
  console.log("     node scripts/create_all_jobs.cjs");
  console.log("");
  console.log("  5. Wait 1-2 minutes for jobs to run");
  console.log("");

  console.log("\n🎯 LENDHUB FRONTEND:");
  console.log("─".repeat(70));
  console.log("  1. Start frontend:     cd lendhub-frontend-nextjs && npm run dev");
  console.log("  2. Open browser:       http://localhost:3000");
  console.log("  3. Go to Markets page: See real-time Chainlink prices!");
  console.log("  4. Connect MetaMask:   Import Ganache account");
  
  console.log("\n💡 DEPLOYED AGGREGATORS:");
  console.log("─".repeat(70));
  Object.entries(aggregators).forEach(([symbol, addr]) => {
    console.log(`  ${symbol.padEnd(6)}: ${addr}`);
  });

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              Ready to test! Happy lending! 🎉                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

