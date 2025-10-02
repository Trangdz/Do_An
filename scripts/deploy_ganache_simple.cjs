const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOY TO GANACHE - 10 USERS WITH ALL TOKENS");
  console.log("=".repeat(60));

  // Get 10 signers from mnemonic
  const signers = await ethers.getSigners();
  const numUsers = Math.min(10, signers.length);
  
  console.log(`\n👥 Found ${signers.length} accounts, using ${numUsers} for demo\n`);

  // ============================================
  // STEP 1: DEPLOY TOKENS
  // ============================================
  console.log("📦 STEP 1: DEPLOYING TOKENS");
  console.log("─".repeat(40));
  
  const TokenWithWithdraw = await ethers.getContractFactory("TokenWithWithdraw");
  
  const weth = await TokenWithWithdraw.deploy("Wrapped ETH", "WETH", 18, 1000000);
  await weth.waitForDeployment();
  console.log("✅ WETH:", await weth.getAddress());
  
  const dai = await TokenWithWithdraw.deploy("Dai Stablecoin", "DAI", 18, 1000000);
  await dai.waitForDeployment();
  console.log("✅ DAI:", await dai.getAddress());
  
  const usdc = await TokenWithWithdraw.deploy("USD Coin", "USDC", 6, 1000000);
  await usdc.waitForDeployment();
  console.log("✅ USDC:", await usdc.getAddress());
  
  const link = await TokenWithWithdraw.deploy("Chainlink Token", "LINK", 18, 1000000);
  await link.waitForDeployment();
  console.log("✅ LINK:", await link.getAddress());

  // ============================================
  // STEP 2: DEPLOY CORE CONTRACTS
  // ============================================
  console.log("\n📦 STEP 2: DEPLOYING CORE CONTRACTS");
  console.log("─".repeat(40));
  
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const irm = await InterestRateModel.deploy();
  await irm.waitForDeployment();
  console.log("✅ InterestRateModel:", await irm.getAddress());
  
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();
  console.log("✅ PriceOracle:", await oracle.getAddress());
  
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(
    await irm.getAddress(),
    await oracle.getAddress(),
    await weth.getAddress(),
    await dai.getAddress()
  );
  await pool.waitForDeployment();
  console.log("✅ LendingPool:", await pool.getAddress());

  // ============================================
  // STEP 3: SETUP CONTRACTS
  // ============================================
  console.log("\n⚙️  STEP 3: SETUP CONTRACTS");
  console.log("─".repeat(40));
  
  // Set oracle prices
  await oracle.setAssetPrice(await weth.getAddress(), ethers.parseUnits("1600", 18));
  await oracle.setAssetPrice(await dai.getAddress(), ethers.parseUnits("1", 18));
  await oracle.setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18));
  await oracle.setAssetPrice(await link.getAddress(), ethers.parseUnits("6", 18));
  console.log("✅ Oracle prices set");
  
  // Initialize reserves
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));
  const base = toRayPerSec(0.001);
  const s1 = toRayPerSec(0.002);
  const s2 = toRayPerSec(0.01);
  
  await pool.initReserve(await weth.getAddress(), 18, 1000, 7500, 8000, 500, 5000, false, 8000, base, s1, s2);
  await pool.initReserve(await dai.getAddress(), 18, 1000, 7500, 8000, 500, 5000, true, 8000, base, s1, s2);
  await pool.initReserve(await usdc.getAddress(), 6, 1000, 7500, 8000, 500, 5000, true, 8000, base, s1, s2);
  await pool.initReserve(await link.getAddress(), 18, 1000, 7500, 8000, 500, 5000, true, 8000, base, s1, s2);
  console.log("✅ All reserves initialized");

  // ============================================
  // STEP 4: MINT TOKENS TO 10 USERS
  // ============================================
  console.log("\n💰 STEP 4: MINT TOKENS TO 10 USERS");
  console.log("─".repeat(40));
  
  for (let i = 0; i < numUsers; i++) {
    const user = signers[i];
    const address = await user.getAddress();
    
    // Mint tokens to each user
    await weth.mint(address, ethers.parseUnits("100", 18));   // 100 WETH
    await dai.mint(address, ethers.parseUnits("50000", 18));  // 50K DAI
    await usdc.mint(address, ethers.parseUnits("50000", 6));  // 50K USDC
    await link.mint(address, ethers.parseUnits("10000", 18)); // 10K LINK
    
    const ethBalance = await ethers.provider.getBalance(address);
    console.log(`✅ User ${i}: ${address}`);
    console.log(`   ETH: ${ethers.formatEther(ethBalance)} | WETH: 100 | DAI: 50K | USDC: 50K | LINK: 10K`);
  }

  // ============================================
  // STEP 5: UPDATE FRONTEND CONFIG
  // ============================================
  console.log("\n📝 STEP 5: UPDATE FRONTEND CONFIG");
  console.log("─".repeat(40));
  
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
  
  // Update addresses.js
  const addressesJsPath = path.join(frontendDir, 'src', 'addresses.js');
  const addressesJs = `// Auto-generated for GANACHE
// Network: http://127.0.0.1:7545 | Chain ID: 1337
// Mnemonic: test test test test test test test test test test test junk

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddr}";
export const InterestRateModelAddress = "${irmAddr}";
export const PriceOracleAddress = "${oracleAddr}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${wethAddr}";
export const DAIAddress = "${daiAddr}";
export const USDCAddress = "${usdcAddr}";
export const LINKAddress = "${linkAddr}";

// 10 Demo Users (each has 100 WETH, 50K DAI, 50K USDC, 10K LINK)
${signers.slice(0, numUsers).map((s, i) => `export const User${i}Address = "${s.address}";`).join('\n')}
`;
  fs.writeFileSync(addressesJsPath, addressesJs);
  console.log("✅ Updated addresses.js");
  
  // Update .env.local
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
  console.log("✅ Updated .env.local");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log("LendingPool:", poolAddr);
  console.log("WETH:", wethAddr);
  console.log("DAI:", daiAddr);
  console.log("USDC:", usdcAddr);
  console.log("LINK:", linkAddr);
  
  console.log("\n👥 10 DEMO USERS (all have full tokens):");
  for (let i = 0; i < numUsers; i++) {
    console.log(`User ${i}: ${signers[i].address}`);
  }
  
  console.log("\n🔧 GANACHE MNEMONIC:");
  console.log("test test test test test test test test test test test junk");
  
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Start Ganache with this command:");
  console.log('   ganache-cli -p 7545 -i 1337 -m "test test test test test test test test test test test junk"');
  console.log("2. Import any of the 10 accounts to MetaMask");
  console.log("3. Start frontend: cd lendhub-frontend-nextjs && npm run dev");
  console.log("4. Connect MetaMask to Ganache (localhost:7545, Chain ID: 1337)");
  console.log("5. Start testing!");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error.message);
    process.exit(1);
  });

