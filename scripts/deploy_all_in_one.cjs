/**
 * 🚀 DEPLOY ALL-IN-ONE SCRIPT
 * 
 * Chạy script này để:
 * 1. Deploy tất cả contracts (LendingPool, Oracle, Tokens, etc.)
 * 2. Setup reserves và prices
 * 3. Mint tokens cho deployer
 * 4. Tự động ghi addresses vào frontend
 * 5. Hiển thị thông tin account để import vào MetaMask
 * 
 * Usage:
 *   npx hardhat run scripts/deploy_all_in_one.cjs --network ganache
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                  🚀 LENDHUB DEPLOY ALL-IN-ONE                      ║");
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
  // 2️⃣ DEPLOY CORE CONTRACTS
  // ========================================
  console.log("\n2️⃣  Deploying Core Contracts...");
  console.log("─".repeat(70));
  
  const InterestRateModelFactory = await ethers.getContractFactory("InterestRateModel");
  const irm = await InterestRateModelFactory.deploy();
  await irm.waitForDeployment();
  const irmAddress = await irm.getAddress();
  console.log("✅ InterestRateModel deployed:", irmAddress);
  
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
  // 3️⃣ SETUP PRICES
  // ========================================
  console.log("\n3️⃣  Setting Asset Prices...");
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
  // 5️⃣ MINT TOKENS TO DEPLOYER
  // ========================================
  console.log("\n5️⃣  Minting Tokens to Deployer...");
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
  // 6️⃣ WRITE ADDRESSES TO FILE
  // ========================================
  console.log("\n6️⃣  Writing Addresses to Frontend...");
  console.log("─".repeat(70));
  
  const addressesContent = `// Auto-generated by deploy_all_in_one.cjs
// Network: Ganache Local (http://127.0.0.1:7545)
// Chain ID: 1337
// Deployed at: ${new Date().toISOString()}

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddress}";
export const InterestRateModelAddress = "${irmAddress}";
export const PriceOracleAddress = "${oracleAddress}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${wethAddress}";
export const DAIAddress = "${daiAddress}";
export const USDCAddress = "${usdcAddress}";
export const LINKAddress = "${linkAddress}";

// Deployer account (has all tokens)
export const User0Address = "${deployer.address}";
`;

  const frontendAddressesPath = path.join(__dirname, "..", "lendhub-frontend-nextjs", "src", "addresses.js");
  fs.writeFileSync(frontendAddressesPath, addressesContent);
  console.log("✅ Updated:", frontendAddressesPath);

  // ========================================
  // 7️⃣ VERIFY BALANCES
  // ========================================
  console.log("\n7️⃣  Verifying Token Balances...");
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
  // 8️⃣ DISPLAY SUMMARY
  // ========================================
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ DEPLOYMENT SUCCESSFUL!                       ║");
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
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║  🔑 METAMASK IMPORT INFO:                                          ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log(`║  Account:      ${deployer.address}  ║`);
  console.log("║                                                                    ║");
  console.log("║  ⚠️  TO GET PRIVATE KEY:                                            ║");
  console.log("║  1. Check the PowerShell window running Ganache                    ║");
  console.log("║  2. Find 'Private Keys' section at startup                         ║");
  console.log("║  3. Copy private key of Account (0)                                ║");
  console.log("║  4. MetaMask → Import Account → Private Key                        ║");
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║  🌐 NETWORK CONFIG FOR METAMASK:                                   ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log("║  Network Name:  Ganache Local                                      ║");
  console.log("║  RPC URL:       http://127.0.0.1:7545                              ║");
  console.log("║  Chain ID:      1337                                               ║");
  console.log("║  Symbol:        ETH                                                ║");
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║  📱 NEXT STEPS:                                                    ║");
  console.log("║  ─────────────────────────────────────────────────────────────     ║");
  console.log("║  1. Import account vào MetaMask (xem hướng dẫn trên)               ║");
  console.log("║  2. Add Ganache network vào MetaMask                               ║");
  console.log("║  3. Mở frontend: http://localhost:3000                             ║");
  console.log("║  4. Connect wallet và bắt đầu sử dụng!                             ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // ========================================
  // 9️⃣ SAVE DEPLOYMENT INFO TO JSON
  // ========================================
  const deploymentInfo = {
    network: "Ganache Local",
    chainId: 1337,
    rpcUrl: "http://127.0.0.1:7545",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LendingPool: poolAddress,
      InterestRateModel: irmAddress,
      PriceOracle: oracleAddress,
      WETH: wethAddress,
      DAI: daiAddress,
      USDC: usdcAddress,
      LINK: linkAddress
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
  console.log("\n🎉 ALL DONE! Happy lending! 🚀\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });

