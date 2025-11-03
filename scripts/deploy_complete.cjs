const { ethers } = require("hardhat");

async function main() {
  console.log("🎬 Deploy Complete - All Contracts");
  console.log("===================================");

  const [deployer, user, liquidator] = await ethers.getSigners();
  
  console.log("📦 Deploying all available contracts...");
  
  // Deploy ERC20 tokens with withdraw functionality
  const TokenWithWithdraw = await ethers.getContractFactory("TokenWithWithdraw");
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  
  // WETH uses TokenWithWithdraw for deposit/withdraw functionality
  const weth = await TokenWithWithdraw.deploy("Wrapped ETH", "WETH", 18, 1000000); // 1M initial supply
  const dai = await TokenWithWithdraw.deploy("Dai Stablecoin", "DAI", 18, 1000000);
  const usdc = await TokenWithWithdraw.deploy("USD Coin", "USDC", 6, 1000000);
  const link = await TokenWithWithdraw.deploy("Chainlink Token", "LINK", 18, 1000000);
  
  await weth.waitForDeployment();
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  await link.waitForDeployment();
  
  // Deploy core contracts
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  
  const irm = await InterestRateModel.deploy();
  const oracle = await PriceOracle.deploy();
  const pool = await LendingPool.deploy(
    await irm.getAddress(), 
    await oracle.getAddress(),
    await weth.getAddress(),
    await dai.getAddress()
  );
  
  await irm.waitForDeployment();
  await oracle.waitForDeployment();
  await pool.waitForDeployment();
  
  // Deploy MockV3Aggregator if available
  let mockAggregator = null;
  try {
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockAggregator = await MockV3Aggregator.deploy(8, ethers.parseUnits("1600", 8)); // 8 decimals, $1600
    await mockAggregator.waitForDeployment();
  } catch (error) {
    console.log("⚠️ MockV3Aggregator not available");
  }
  
  // Print all addresses
  console.log("\n📋 Complete Contract Addresses:");
  console.log("================================");
  console.log(`// Core Contracts`);
  console.log(`export const LendingPoolAddress = "${await pool.getAddress()}";`);
  console.log(`export const InterestRateModelAddress = "${await irm.getAddress()}";`);
  console.log(`export const PriceOracleAddress = "${await oracle.getAddress()}";`);
  
  console.log(`\n// ERC20 Tokens`);
  console.log(`export const ETHAddress = "0x0000000000000000000000000000000000000000";`);
  console.log(`export const WETHAddress = "${await weth.getAddress()}";`);
  console.log(`export const DAIAddress = "${await dai.getAddress()}";`);
  console.log(`export const USDCAddress = "${await usdc.getAddress()}";`);
  console.log(`export const LINKAddress = "${await link.getAddress()}";`);
  
  if (mockAggregator) {
    console.log(`\n// Mock Contracts`);
    console.log(`export const MockV3AggregatorAddress = "${await mockAggregator.getAddress()}";`);
  }
  
  console.log(`\n// Not Deployed (Interfaces/Libraries)`);
  console.log(`export const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not available`);
  
  console.log(`\n// Account Addresses`);
  console.log(`export const DeployerAddress = "${deployer.address}";`);
  console.log(`export const UserAddress = "${user.address}";`);
  console.log(`export const LiquidatorAddress = "${liquidator.address}";`);
  
  // Set up contracts
  console.log("\n🔧 Setting up contracts...");
  
  // Set prices
  await (await oracle.setAssetPrice(await weth.getAddress(), ethers.parseUnits("1600", 18))).wait();
  await (await oracle.setAssetPrice(await dai.getAddress(), ethers.parseUnits("1", 18))).wait();
  await (await oracle.setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18))).wait();
  await (await oracle.setAssetPrice(await link.getAddress(), ethers.parseUnits("6", 18))).wait();
  
  // Initialize reserves
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
  
  const base = toRayPerSec(0.001);
  const s1 = toRayPerSec(0.002);
  const s2 = toRayPerSec(0.01);
  
  // Init WETH (collateral only)
  await (await pool.initReserve(
    await weth.getAddress(), 18,
    1000, 7500, 8000, 500, 5000,
    false, // isBorrowable = false
    8000, base, s1, s2
  )).wait();
  
  // Init DAI (borrowable)
  await (await pool.initReserve(
    await dai.getAddress(), 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  
  // Init USDC (borrowable)
  await (await pool.initReserve(
    await usdc.getAddress(), 6,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  
  // Init LINK (borrowable)
  await (await pool.initReserve(
    await link.getAddress(), 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  
  console.log("✅ All contracts deployed and configured!");
  
  // Mint tokens to users
  await (await weth.mint(user.address, ethers.parseUnits("100", 18))).wait();
  await (await dai.mint(liquidator.address, ethers.parseUnits("200000", 18))).wait();
  await (await dai.mint(deployer.address, ethers.parseUnits("100000", 18))).wait();
  await (await usdc.mint(liquidator.address, ethers.parseUnits("200000", 6))).wait();
  await (await usdc.mint(deployer.address, ethers.parseUnits("100000", 6))).wait();
  await (await link.mint(liquidator.address, ethers.parseUnits("10000", 18))).wait();
  await (await link.mint(deployer.address, ethers.parseUnits("5000", 18))).wait();
  
  console.log("✅ Tokens minted to users");

  // Auto-update frontend configs
  try {
    const fs = require('fs');
    const path = require('path');
    const frontendDir = path.join(__dirname, '..', 'lendhub-frontend-nextjs');

    const poolAddr = await pool.getAddress();
    const oracleAddr = await oracle.getAddress();
    const irmAddr = await irm.getAddress();
    const wethAddr = await weth.getAddress();
    const daiAddr = await dai.getAddress();
    const usdcAddr = await usdc.getAddress();
    const linkAddr = await link.getAddress();

    // 1) Write src/addresses.js
    const addressesJsPath = path.join(frontendDir, 'src', 'addresses.js');
    const mockAggLine = mockAggregator ? `export const MockV3AggregatorAddress = "${await mockAggregator.getAddress()}";\n` : '';
    const addressesJs = `// Contract addresses (auto-updated by deploy script)\nexport const ETHAddress = "0x0000000000000000000000000000000000000000";\nexport const LendingPoolAddress = "${poolAddr}";\nexport const InterestRateModelAddress = "${irmAddr}";\nexport const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not deployed\nexport const WETHAddress = "${wethAddr}";\nexport const DAIAddress = "${daiAddr}";\nexport const USDCAddress = "${usdcAddr}";\nexport const LINKAddress = "${linkAddr}";\nexport const PriceOracleAddress = "${oracleAddr}";\n${mockAggLine}`;
    fs.writeFileSync(addressesJsPath, addressesJs);

    // 2) Write .env.local to override config/contracts.ts
    const envLocalPath = path.join(frontendDir, '.env.local');
    const envLocal = `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:7545\nNEXT_PUBLIC_CHAIN_ID=1337\nNEXT_PUBLIC_POOL=${poolAddr}\nNEXT_PUBLIC_ORACLE=${oracleAddr}\nNEXT_PUBLIC_IRM=${irmAddr}\nNEXT_PUBLIC_WETH=${wethAddr}\nNEXT_PUBLIC_DAI=${daiAddr}\nNEXT_PUBLIC_USDC=${usdcAddr}\n`;
    fs.writeFileSync(envLocalPath, envLocal);

    console.log("\n🛠️ Frontend updated:");
    console.log(`- Updated ${path.relative(process.cwd(), addressesJsPath)}`);
    console.log(`- Updated ${path.relative(process.cwd(), envLocalPath)}`);
    console.log("🔄 Next.js will pick up .env.local on restart; addresses.js is updated immediately.");
  } catch (e) {
    console.log("⚠️ Failed to auto-update frontend files:", e.message);
  }

  console.log("\n🎉 Complete deployment finished! ✅");
}

main().catch(console.error);


