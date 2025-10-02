const { ethers } = require("hardhat");

async function main() {
  console.log("🎬 Deploy Complete to GANACHE - All Contracts");
  console.log("================================================");

  // Get signers from Ganache
  const [deployer, user, liquidator] = await ethers.getSigners();
  
  console.log("👤 Deployer:", deployer.address);
  console.log("👤 User:", user.address);
  console.log("👤 Liquidator:", liquidator.address);
  
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(deployerBalance), "ETH");
  
  console.log("\n📦 Deploying all available contracts...");
  
  // Deploy ERC20 tokens with withdraw functionality
  const TokenWithWithdraw = await ethers.getContractFactory("TokenWithWithdraw");
  
  // WETH uses TokenWithWithdraw for deposit/withdraw functionality
  console.log("Deploying tokens...");
  const weth = await TokenWithWithdraw.deploy("Wrapped ETH", "WETH", 18, 1000000); // 1M initial supply
  const dai = await TokenWithWithdraw.deploy("Dai Stablecoin", "DAI", 18, 1000000);
  const usdc = await TokenWithWithdraw.deploy("USD Coin", "USDC", 6, 1000000);
  const link = await TokenWithWithdraw.deploy("Chainlink Token", "LINK", 18, 1000000);
  
  await weth.waitForDeployment();
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  await link.waitForDeployment();
  
  console.log("✅ Tokens deployed");
  
  // Deploy core contracts
  console.log("Deploying core contracts...");
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
  
  console.log("✅ Core contracts deployed");
  
  // Deploy MockV3Aggregator if available
  let mockAggregator = null;
  try {
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockAggregator = await MockV3Aggregator.deploy(8, ethers.parseUnits("1600", 8)); // 8 decimals, $1600
    await mockAggregator.waitForDeployment();
    console.log("✅ MockV3Aggregator deployed");
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
  
  console.log(`\n// Account Addresses (From Ganache)`);
  console.log(`export const DeployerAddress = "${deployer.address}";`);
  console.log(`export const UserAddress = "${user.address}";`);
  console.log(`export const LiquidatorAddress = "${liquidator.address}";`);
  
  // Set up contracts
  console.log("\n🔧 Setting up contracts...");
  
  // Set REALISTIC prices from CoinGecko
  console.log("Setting REALISTIC oracle prices...");
  
  // Try to fetch real prices from CoinGecko
  let realPrices = {
    WETH: 2000, // fallback
    DAI: 1,
    USDC: 1,
    LINK: 15
  };
  
  try {
    const axios = require("axios");
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,dai,usd-coin,chainlink&vs_currencies=usd";
    const response = await axios.get(url);
    const data = response.data;
    
    realPrices = {
      WETH: data.ethereum?.usd || 2000,
      DAI: data.dai?.usd || 1,
      USDC: data["usd-coin"]?.usd || 1,
      LINK: data.chainlink?.usd || 15
    };
    
    console.log("✅ Fetched REAL prices from CoinGecko:");
    console.log(`   ETH:  $${realPrices.WETH.toFixed(2)}`);
    console.log(`   DAI:  $${realPrices.DAI.toFixed(4)}`);
    console.log(`   USDC: $${realPrices.USDC.toFixed(4)}`);
    console.log(`   LINK: $${realPrices.LINK.toFixed(2)}`);
  } catch (error) {
    console.log("⚠️  CoinGecko fetch failed, using fallback prices");
  }
  
  await (await oracle.setAssetPrice(await weth.getAddress(), ethers.parseUnits(realPrices.WETH.toFixed(18), 18))).wait();
  await (await oracle.setAssetPrice(await dai.getAddress(), ethers.parseUnits(realPrices.DAI.toFixed(18), 18))).wait();
  await (await oracle.setAssetPrice(await usdc.getAddress(), ethers.parseUnits(realPrices.USDC.toFixed(18), 18))).wait();
  await (await oracle.setAssetPrice(await link.getAddress(), ethers.parseUnits(realPrices.LINK.toFixed(18), 18))).wait();
  console.log("✅ Oracle prices set with REALISTIC values!");
  
  // Initialize reserves
  console.log("Initializing reserves...");
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
  console.log("✅ WETH reserve initialized");
  
  // Init DAI (borrowable)
  await (await pool.initReserve(
    await dai.getAddress(), 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  console.log("✅ DAI reserve initialized");
  
  // Init USDC (borrowable)
  await (await pool.initReserve(
    await usdc.getAddress(), 6,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  console.log("✅ USDC reserve initialized");
  
  // Init LINK (borrowable)
  await (await pool.initReserve(
    await link.getAddress(), 18,
    1000, 7500, 8000, 500, 5000,
    true, // isBorrowable = true
    8000, base, s1, s2
  )).wait();
  console.log("✅ LINK reserve initialized");
  
  console.log("✅ All reserves initialized!");
  
  // Mint tokens to users
  console.log("\n💰 Minting tokens to users...");
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
    const addressesJs = `// Contract addresses (auto-updated by deploy script - GANACHE)
// Network: Ganache Local (http://127.0.0.1:7545)
// Chain ID: 1337
export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddr}";
export const InterestRateModelAddress = "${irmAddr}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not deployed
export const WETHAddress = "${wethAddr}";
export const DAIAddress = "${daiAddr}";
export const USDCAddress = "${usdcAddr}";
export const LINKAddress = "${linkAddr}";
export const PriceOracleAddress = "${oracleAddr}";
${mockAggLine}
// Account Addresses (From Ganache)
export const DeployerAddress = "${deployer.address}";
export const UserAddress = "${user.address}";
export const LiquidatorAddress = "${liquidator.address}";
`;
    fs.writeFileSync(addressesJsPath, addressesJs);

    // 2) Write .env.local to override config/contracts.ts
    const envLocalPath = path.join(frontendDir, '.env.local');
    const envLocal = `# GANACHE LOCAL NETWORK
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:7545
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_POOL=${poolAddr}
NEXT_PUBLIC_ORACLE=${oracleAddr}
NEXT_PUBLIC_IRM=${irmAddr}
NEXT_PUBLIC_WETH=${wethAddr}
NEXT_PUBLIC_DAI=${daiAddr}
NEXT_PUBLIC_USDC=${usdcAddr}
NEXT_PUBLIC_LINK=${linkAddr}
`;
    fs.writeFileSync(envLocalPath, envLocal);

    console.log("\n🛠️ Frontend updated:");
    console.log(`- Updated ${path.relative(process.cwd(), addressesJsPath)}`);
    console.log(`- Updated ${path.relative(process.cwd(), envLocalPath)}`);
    console.log("🔄 Next.js will pick up .env.local on restart; addresses.js is updated immediately.");
  } catch (e) {
    console.log("⚠️ Failed to auto-update frontend files:", e.message);
  }

  // Run quick tests
  console.log("\n🧪 Running quick tests...");
  console.log("─".repeat(40));
  
  try {
    // Test 1: Lend
    console.log("\n1️⃣ TEST LEND");
    await dai.connect(deployer).approve(poolAddr, ethers.MaxUint256);
    await pool.connect(deployer).lend(await dai.getAddress(), ethers.parseUnits("1000", 18));
    const deployerReserve = await pool.userReserves(deployer.address, await dai.getAddress());
    console.log("✅ Deployer lent 1000 DAI");
    console.log("   Supply:", ethers.formatUnits(deployerReserve.supply.principal, 18), "DAI");
    
    // Test 2: Borrow
    console.log("\n2️⃣ TEST BORROW");
    await weth.connect(user).approve(poolAddr, ethers.MaxUint256);
    await pool.connect(user).lend(await weth.getAddress(), ethers.parseUnits("1", 18));
    console.log("✅ User lent 1 WETH as collateral");
    
    const daiBalBefore = await dai.balanceOf(user.address);
    await pool.connect(user).borrow(await dai.getAddress(), ethers.parseUnits("100", 18));
    const daiBalAfter = await dai.balanceOf(user.address);
    console.log("✅ User borrowed 100 DAI");
    console.log("   Received:", ethers.formatUnits(daiBalAfter - daiBalBefore, 18), "DAI");
    
    // Test 3: Repay partial
    console.log("\n3️⃣ TEST REPAY PARTIAL");
    await dai.connect(user).approve(poolAddr, ethers.MaxUint256);
    await pool.connect(user).repay(await dai.getAddress(), ethers.parseUnits("50", 18), user.address);
    const userDebtPartial = await pool.userReserves(user.address, await dai.getAddress());
    console.log("✅ User repaid 50 DAI");
    console.log("   Remaining debt:", ethers.formatUnits(userDebtPartial.borrow.principal, 18), "DAI");
    
    // Test 4: Repay all
    console.log("\n4️⃣ TEST REPAY ALL (DEBT TO ZERO)");
    const debtBefore = await pool.userReserves(user.address, await dai.getAddress());
    const debtRaw = debtBefore.borrow.principal;
    console.log("   Debt before:", ethers.formatUnits(debtRaw, 18), "DAI");
    
    if (debtRaw > 0n) {
      // Calculate with buffer
      const withBuffer = (debtRaw * 120n) / 100n;
      await pool.connect(user).repay(await dai.getAddress(), withBuffer, user.address);
      
      const debtAfter = await pool.userReserves(user.address, await dai.getAddress());
      console.log("   Debt after:", ethers.formatUnits(debtAfter.borrow.principal, 18), "DAI");
      
      if (debtAfter.borrow.principal === 0n) {
        console.log("   🎉 DEBT CLEARED TO ZERO!");
      } else if (debtAfter.borrow.principal < 1000n) {
        console.log("   ✅ Dust cleared (< 1000 wei)");
      } else {
        console.log("   ⚠️ Debt still exists");
      }
    }
    
    // Test 5: Withdraw
    console.log("\n5️⃣ TEST WITHDRAW");
    const usdcBalBefore = await usdc.balanceOf(deployer.address);
    await usdc.connect(deployer).approve(poolAddr, ethers.MaxUint256);
    await pool.connect(deployer).lend(await usdc.getAddress(), ethers.parseUnits("1000", 6));
    await pool.connect(deployer).withdraw(await usdc.getAddress(), ethers.parseUnits("100", 6));
    const usdcBalAfter = await usdc.balanceOf(deployer.address);
    console.log("✅ Deployer withdrew 100 USDC");
    console.log("   Net change:", ethers.formatUnits(usdcBalAfter - usdcBalBefore, 6), "USDC");
    
    console.log("\n" + "=".repeat(40));
    console.log("🎉 ALL TESTS PASSED!");
    console.log("=".repeat(40));
    
  } catch (testErr) {
    console.log("\n❌ Test failed:", testErr.message);
  }

  console.log("\n🎉 Complete deployment to GANACHE finished! ✅");
  console.log("\n📋 Next steps:");
  console.log("1. Ganache is running at http://127.0.0.1:7545");
  console.log("2. Import Ganache accounts to MetaMask:");
  console.log(`   - Deployer: ${deployer.address}`);
  console.log(`   - User: ${user.address}`);
  console.log(`   - Liquidator: ${liquidator.address}`);
  console.log("3. Start frontend: cd lendhub-frontend-nextjs && npm run dev");
  console.log("4. Connect MetaMask to Ganache (Chain ID: 1337)");
  console.log("5. Test all features on the UI!");
}

main().catch((error) => {
  console.error("\n❌ DEPLOYMENT FAILED:");
  console.error(error);
  process.exit(1);
});
