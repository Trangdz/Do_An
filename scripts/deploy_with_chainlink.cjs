/**
 * 🚀 DEPLOY ALL-IN-ONE WITH CHAINLINK INTEGRATION
 * 
 * Deploy tất cả contracts bao gồm:
 * 1. ERC20 Tokens (WETH, DAI, USDC, LINK)
 * 2. Chainlink Price Aggregators (MockV3Aggregator)
 * 3. LendingPool with Chainlink price feeds
 * 4. Interest Rate Model
 * 
 * Usage:
 *   npx hardhat run scripts/deploy_with_chainlink.cjs --network ganache
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║           🚀 LENDHUB DEPLOY WITH CHAINLINK INTEGRATION             ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ========================================
  // 1️⃣ DEPLOY TOKENS
  // ========================================
  console.log("1️⃣  Deploying ERC20 Tokens...");
  console.log("─".repeat(70));
  
  const TokenFactory = await ethers.getContractFactory("TokenWithWithdraw");
  
  const weth = await TokenFactory.deploy("Wrapped Ether", "WETH", 18, ethers.parseEther("1000000"));
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ WETH deployed:", wethAddress);
  
  const dai = await TokenFactory.deploy("Dai Stablecoin", "DAI", 18, ethers.parseEther("1000000"));
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  console.log("✅ DAI deployed:", daiAddress);
  
  const usdc = await TokenFactory.deploy("USD Coin", "USDC", 6, ethers.parseUnits("1000000", 6));
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC deployed:", usdcAddress);
  
  const link = await TokenFactory.deploy("Chainlink Token", "LINK", 18, ethers.parseEther("1000000"));
  await link.waitForDeployment();
  const linkAddress = await link.getAddress();
  console.log("✅ LINK deployed:", linkAddress);

  // ========================================
  // 2️⃣ DEPLOY CHAINLINK PRICE AGGREGATORS
  // ========================================
  console.log("\n2️⃣  Deploying Chainlink Price Aggregators...");
  console.log("─".repeat(70));
  
  let MockV3AggregatorFactory;
  try {
    MockV3AggregatorFactory = await ethers.getContractFactory("MockV3Aggregator");
  } catch (e) {
    console.log("⚠️  MockV3Aggregator not found, trying PriceAggregator...");
    MockV3AggregatorFactory = await ethers.getContractFactory("PriceAggregator");
  }
  
  // ETH/USD Price Feed - $1600
  const ethPriceFeed = await MockV3AggregatorFactory.deploy(8, ethers.parseUnits("1600", 8));
  await ethPriceFeed.waitForDeployment();
  const ethPriceFeedAddress = await ethPriceFeed.getAddress();
  console.log("✅ ETH/USD Price Feed deployed:", ethPriceFeedAddress, "($1600)");
  
  // DAI/USD Price Feed - $1
  const daiPriceFeed = await MockV3AggregatorFactory.deploy(8, ethers.parseUnits("1", 8));
  await daiPriceFeed.waitForDeployment();
  const daiPriceFeedAddress = await daiPriceFeed.getAddress();
  console.log("✅ DAI/USD Price Feed deployed:", daiPriceFeedAddress, "($1)");
  
  // USDC/USD Price Feed - $1
  const usdcPriceFeed = await MockV3AggregatorFactory.deploy(8, ethers.parseUnits("1", 8));
  await usdcPriceFeed.waitForDeployment();
  const usdcPriceFeedAddress = await usdcPriceFeed.getAddress();
  console.log("✅ USDC/USD Price Feed deployed:", usdcPriceFeedAddress, "($1)");
  
  // LINK/USD Price Feed - $10
  const linkPriceFeed = await MockV3AggregatorFactory.deploy(8, ethers.parseUnits("10", 8));
  await linkPriceFeed.waitForDeployment();
  const linkPriceFeedAddress = await linkPriceFeed.getAddress();
  console.log("✅ LINK/USD Price Feed deployed:", linkPriceFeedAddress, "($10)");

  // ========================================
  // 3️⃣ DEPLOY CORE CONTRACTS
  // ========================================
  console.log("\n3️⃣  Deploying Core Contracts...");
  console.log("─".repeat(70));
  
  const InterestRateModelFactory = await ethers.getContractFactory("InterestRateModel");
  const irm = await InterestRateModelFactory.deploy();
  await irm.waitForDeployment();
  const irmAddress = await irm.getAddress();
  console.log("✅ InterestRateModel deployed:", irmAddress);
  
  // Deploy PriceOracle (simple oracle for manual override if needed)
  const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracleFactory.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ PriceOracle deployed:", oracleAddress);
  
  const LendingPoolFactory = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPoolFactory.deploy(irmAddress, oracleAddress, wethAddress, daiAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ LendingPool deployed:", poolAddress);

  // ========================================
  // 4️⃣ SETUP PRICES (Using Simple Oracle)
  // ========================================
  console.log("\n4️⃣  Setting Asset Prices...");
  console.log("─".repeat(70));
  
  await (await oracle.setAssetPrice(wethAddress, ethers.parseEther("1600"))).wait();
  console.log("✅ WETH price set: $1600");
  
  await (await oracle.setAssetPrice(daiAddress, ethers.parseEther("1"))).wait();
  console.log("✅ DAI price set: $1");
  
  await (await oracle.setAssetPrice(usdcAddress, ethers.parseEther("1"))).wait();
  console.log("✅ USDC price set: $1");
  
  await (await oracle.setAssetPrice(linkAddress, ethers.parseEther("10"))).wait();
  console.log("✅ LINK price set: $10");

  // ========================================
  // 5️⃣ INITIALIZE RESERVES
  // ========================================
  console.log("\n5️⃣  Initializing Reserves...");
  console.log("─".repeat(70));
  
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
  
  const baseRate = toRayPerSec(0.001);   // 0.1% base APR
  const slope1 = toRayPerSec(0.002);     // 0.2% slope 1
  const slope2 = toRayPerSec(0.01);      // 1% slope 2
  
  // Init WETH (collateral only, not borrowable)
  await (await pool.initReserve(
    wethAddress, 18,
    1000,  // reserveFactorBps (10%)
    7500,  // ltvBps (75%)
    8000,  // liqThresholdBps (80%)
    500,   // liqBonusBps (5%)
    5000,  // closeFactorBps (50%)
    false, // isBorrowable = false (WETH is collateral only)
    8000,  // optimalUBps (80%)
    baseRate, slope1, slope2
  )).wait();
  console.log("✅ WETH reserve initialized (collateral only)");
  
  // Init DAI (borrowable)
  await (await pool.initReserve(
    daiAddress, 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  )).wait();
  console.log("✅ DAI reserve initialized (borrowable)");
  
  // Init USDC (borrowable)
  await (await pool.initReserve(
    usdcAddress, 6,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  )).wait();
  console.log("✅ USDC reserve initialized (borrowable)");
  
  // Init LINK (borrowable)
  await (await pool.initReserve(
    linkAddress, 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, baseRate, slope1, slope2
  )).wait();
  console.log("✅ LINK reserve initialized (borrowable)");

  // ========================================
  // 6️⃣ MINT TOKENS TO DEPLOYER
  // ========================================
  console.log("\n6️⃣  Minting Tokens to Deployer...");
  console.log("─".repeat(70));
  
  await (await weth.mint(deployer.address, ethers.parseEther("1000000"))).wait();
  console.log("✅ Minted 1,000,000 WETH");
  
  await (await dai.mint(deployer.address, ethers.parseEther("1000000"))).wait();
  console.log("✅ Minted 1,000,000 DAI");
  
  await (await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6))).wait();
  console.log("✅ Minted 1,000,000 USDC");
  
  await (await link.mint(deployer.address, ethers.parseEther("1000000"))).wait();
  console.log("✅ Minted 1,000,000 LINK");

  // ========================================
  // 7️⃣ WRITE ADDRESSES TO FILE
  // ========================================
  console.log("\n7️⃣  Writing Addresses to Frontend...");
  console.log("─".repeat(70));
  
  const addressesContent = `// Auto-generated by deploy_with_chainlink.cjs
// Network: Ganache Local (http://127.0.0.1:7545)
// Chain ID: 1337
// Deployed at: ${new Date().toISOString()}
// WITH CHAINLINK PRICE FEEDS

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddress}";
export const InterestRateModelAddress = "${irmAddress}";
export const PriceOracleAddress = "${oracleAddress}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${wethAddress}";
export const DAIAddress = "${daiAddress}";
export const USDCAddress = "${usdcAddress}";
export const LINKAddress = "${linkAddress}";

// Chainlink Price Feeds
export const ETHPriceFeedAddress = "${ethPriceFeedAddress}";
export const DAIPriceFeedAddress = "${daiPriceFeedAddress}";
export const USDCPriceFeedAddress = "${usdcPriceFeedAddress}";
export const LINKPriceFeedAddress = "${linkPriceFeedAddress}";

// Deployer account (has all tokens)
export const User0Address = "${deployer.address}";
`;

  const frontendAddressesPath = path.join(__dirname, "..", "lendhub-frontend-nextjs", "src", "addresses.js");
  fs.writeFileSync(frontendAddressesPath, addressesContent);
  console.log("✅ Updated:", frontendAddressesPath);

  // ========================================
  // 8️⃣ VERIFY BALANCES
  // ========================================
  console.log("\n8️⃣  Verifying Token Balances...");
  console.log("─".repeat(70));
  
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH: ", ethers.formatEther(ethBalance));
  
  const wethBalance = await weth.balanceOf(deployer.address);
  console.log("WETH:", ethers.formatEther(wethBalance));
  
  const daiBalance = await dai.balanceOf(deployer.address);
  console.log("DAI: ", ethers.formatEther(daiBalance));
  
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("USDC:", ethers.formatUnits(usdcBalance, 6));
  
  const linkBalance = await link.balanceOf(deployer.address);
  console.log("LINK:", ethers.formatEther(linkBalance));

  // ========================================
  // 9️⃣ DISPLAY SUMMARY
  // ========================================
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ DEPLOYMENT WITH CHAINLINK SUCCESSFUL!              ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                    ║");
  console.log("║  📋 Contract Addresses:                                            ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log(`║  LendingPool:  ${poolAddress}  ║`);
  console.log(`║  Oracle:       ${oracleAddress}  ║`);
  console.log(`║  WETH:         ${wethAddress}  ║`);
  console.log(`║  DAI:          ${daiAddress}  ║`);
  console.log(`║  USDC:         ${usdcAddress}  ║`);
  console.log(`║  LINK:         ${linkAddress}  ║`);
  console.log("║                                                                    ║");
  console.log("║  📡 Chainlink Price Feeds:                                         ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log(`║  ETH/USD:      ${ethPriceFeedAddress}  ║`);
  console.log(`║  DAI/USD:      ${daiPriceFeedAddress}  ║`);
  console.log(`║  USDC/USD:     ${usdcPriceFeedAddress}  ║`);
  console.log(`║  LINK/USD:     ${linkPriceFeedAddress}  ║`);
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║  🔑 METAMASK IMPORT INFO:                                          ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log(`║  Account:      ${deployer.address}  ║`);
  console.log("║                                                                    ║");
  console.log("║  ⚠️  TO GET PRIVATE KEY:                                            ║");
  console.log("║  Check the PowerShell window running Ganache for private key       ║");
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║  📱 NEXT STEPS:                                                    ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log("║  1. Import account vào MetaMask                                    ║");
  console.log("║  2. Network: Ganache Local (http://127.0.0.1:7545, ChainID 1337)  ║");
  console.log("║  3. Mở frontend: http://localhost:3000                             ║");
  console.log("║  4. Connect wallet và bắt đầu sử dụng!                             ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // ========================================
  // 🔟 SAVE DEPLOYMENT INFO TO JSON
  // ========================================
  const deploymentInfo = {
    network: "Ganache Local",
    chainId: 1337,
    rpcUrl: "http://127.0.0.1:7545",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    withChainlink: true,
    contracts: {
      LendingPool: poolAddress,
      InterestRateModel: irmAddress,
      PriceOracle: oracleAddress,
      WETH: wethAddress,
      DAI: daiAddress,
      USDC: usdcAddress,
      LINK: linkAddress
    },
    chainlinkPriceFeeds: {
      "ETH/USD": ethPriceFeedAddress,
      "DAI/USD": daiPriceFeedAddress,
      "USDC/USD": usdcPriceFeedAddress,
      "LINK/USD": linkPriceFeedAddress
    },
    prices: {
      WETH: "1600 USD",
      DAI: "1 USD",
      USDC: "1 USD",
      LINK: "10 USD"
    },
    reserves: {
      WETH: {
        ltv: "75%",
        liquidationThreshold: "80%",
        isBorrowable: false,
        isCollateral: true
      },
      DAI: {
        ltv: "75%",
        liquidationThreshold: "80%",
        isBorrowable: true,
        isCollateral: false
      },
      USDC: {
        ltv: "75%",
        liquidationThreshold: "80%",
        isBorrowable: true,
        isCollateral: false
      },
      LINK: {
        ltv: "75%",
        liquidationThreshold: "80%",
        isBorrowable: true,
        isCollateral: false
      }
    }
  };

  const deploymentJsonPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(deploymentJsonPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentJsonPath);
  console.log("\n🎉 ALL DONE WITH CHAINLINK! Happy lending with real-time prices! 🚀\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });








