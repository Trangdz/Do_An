const { ethers } = require("hardhat");

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // ==== Deploy Mock Tokens ====
  console.log("\n📦 Deploying Mock Tokens...");
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  
  // DAI (18 decimals)
  const dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
  await dai.waitForDeployment();
  console.log("✅ DAI:", await dai.getAddress());
  
  // USDC (6 decimals)
  const usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("✅ USDC:", await usdc.getAddress());
  
  // WETH (18 decimals)
  const weth = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
  await weth.waitForDeployment();
  console.log("✅ WETH:", await weth.getAddress());

  // Mint tokens
  await dai.mint(deployer.address, ethers.parseEther("1000000"));
  await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n);
  await weth.mint(deployer.address, ethers.parseEther("1000000"));
  console.log("✅ Tokens minted");

  // ==== Deploy Price Feeds ====
  console.log("\n📊 Deploying Price Feeds...");
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  
  // DAI/USD feed (8 decimals, $1.00)
  const daiUsdFeed = await MockV3Aggregator.deploy(8, ethers.parseUnits("1.00", 8));
  await daiUsdFeed.waitForDeployment();
  console.log("✅ DAI/USD Feed:", await daiUsdFeed.getAddress());
  
  // USDC/USD feed (8 decimals, $1.00)
  const usdcUsdFeed = await MockV3Aggregator.deploy(8, ethers.parseUnits("1.00", 8));
  await usdcUsdFeed.waitForDeployment();
  console.log("✅ USDC/USD Feed:", await usdcUsdFeed.getAddress());
  
  // ETH/USD feed (8 decimals, $1600.00)
  const ethUsdFeed = await MockV3Aggregator.deploy(8, ethers.parseUnits("1600.00", 8));
  await ethUsdFeed.waitForDeployment();
  console.log("✅ ETH/USD Feed:", await ethUsdFeed.getAddress());

  // ==== Deploy Price Oracle ====
  console.log("\n💲 Deploying Price Oracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("✅ PriceOracle:", await priceOracle.getAddress());

  // Set asset prices
  await priceOracle.setAssetPrice(await dai.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(await usdc.getAddress(), ethers.parseEther("1"));
  await priceOracle.setAssetPrice(await weth.getAddress(), ethers.parseEther("1600"));
  console.log("✅ Prices set in oracle");

  // ==== Deploy Core Contracts ====
  console.log("\n🏦 Deploying Core Contracts...");
  const IRM = await ethers.getContractFactory("InterestRateModel");
  const irm = await IRM.deploy();
  await irm.waitForDeployment();
  console.log("✅ InterestRateModel:", await irm.getAddress());

  const Pool = await ethers.getContractFactory("LendingPool");
  const pool = await Pool.deploy(await irm.getAddress(), await priceOracle.getAddress());
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("✅ LendingPool:", poolAddr);

  // ==== Interest Rate Parameters ====
  console.log("\n📈 Setting Interest Rate Parameters...");
  // baseAPR ~ 0.1%/năm, slope1 ~ 0.2%/năm, slope2 ~ 1%/năm
  const base = toRayPerSec(0.001);
  const s1 = toRayPerSec(0.002);
  const s2 = toRayPerSec(0.01);

  // Risk parameters
  const reserveFactorBps = 1000; // 10%
  const ltvBps = 7500; // 75%
  const liqThresholdBps = 8000; // 80%
  const liqBonusBps = 500; // 5%
  const closeFactorBps = 5000; // 50%
  const optimalUBps = 8000; // 80%

  // ==== Initialize Reserves ====
  console.log("\n🔧 Initializing Reserves...");
  
  // Init DAI (18 decimals, borrowable = true)
  let tx = await pool.initReserve(
    await dai.getAddress(), 18,
    reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
    true, // isBorrowable
    optimalUBps, base, s1, s2
  );
  await tx.wait();
  console.log("✅ DAI reserve initialized");

  // Init USDC (6 decimals, borrowable = true)
  tx = await pool.initReserve(
    await usdc.getAddress(), 6,
    reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
    true, // isBorrowable
    optimalUBps, base, s1, s2
  );
  await tx.wait();
  console.log("✅ USDC reserve initialized");

  // Init WETH (18 decimals, borrowable = false, chỉ dùng làm collateral)
  tx = await pool.initReserve(
    await weth.getAddress(), 18,
    reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
    false, // isBorrowable = false (chỉ collateral)
    optimalUBps, base, s1, s2
  );
  await tx.wait();
  console.log("✅ WETH reserve initialized (collateral only)");

  // ==== Summary ====
  console.log("\n🎉 Enhanced LendHub v2 Deployment Complete!");
  console.log("=" .repeat(60));
  console.log("📋 Contract Addresses:");
  console.log("LendingPool:", poolAddr);
  console.log("InterestRateModel:", await irm.getAddress());
  console.log("PriceOracle:", await priceOracle.getAddress());
  console.log("\n📦 Token Addresses:");
  console.log("DAI:", await dai.getAddress());
  console.log("USDC:", await usdc.getAddress());
  console.log("WETH:", await weth.getAddress());
  console.log("\n📊 Price Feed Addresses:");
  console.log("DAI/USD Feed:", await daiUsdFeed.getAddress());
  console.log("USDC/USD Feed:", await usdcUsdFeed.getAddress());
  console.log("ETH/USD Feed:", await ethUsdFeed.getAddress());
  
  console.log("\n🔒 Security Features:");
  console.log("✅ ReentrancyGuard enabled");
  console.log("✅ Pausable functionality");
  console.log("✅ SafeERC20 with fee-on-transfer handling");
  console.log("✅ Liquidation function implemented");
  
  console.log("\n🎯 Reserve Configuration:");
  console.log("DAI: 18 decimals, borrowable=true");
  console.log("USDC: 6 decimals, borrowable=true");
  console.log("WETH: 18 decimals, borrowable=false (collateral only)");
  
  console.log("\n📈 Interest Rate Model:");
  console.log("Base APR: 0.1%/year");
  console.log("Slope1 APR: 0.2%/year");
  console.log("Slope2 APR: 1.0%/year");
  console.log("Optimal Utilization: 80%");
  
  console.log("\n🚀 Ready for testing!");
  console.log("Save LendingPool address:", poolAddr);
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});
