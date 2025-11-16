const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // // Deploy PriceAggregator
  // const PriceAggregator = await hre.ethers.getContractFactory("MultiPriceAggregator");
  // const priceAggregator = await PriceAggregator.deploy();
  // await priceAggregator.waitForDeployment();
  // console.log("MultiPriceAggregator deployed:", priceAggregator.target);
  
  // Deploy MultiPriceAggregator
  const MultiPriceAggregator = await hre.ethers.getContractFactory("MultiPriceAggregator");
  const multiPriceAggregator = await MultiPriceAggregator.deploy();
  await multiPriceAggregator.waitForDeployment();
  const multiAddr = await multiPriceAggregator.getAddress();
  console.log("MultiPriceAggregator deployed:", multiAddr);
  
  // Set writer if NODE_ADDRESS is provided
  const nodeAddress = process.env.NODE_ADDRESS;
  if (nodeAddress) {
    console.log("\n🔐 Setting writer for MultiPriceAggregator...");
    const setWriterTx = await multiPriceAggregator.setWriter(nodeAddress, true);
    await setWriterTx.wait();
    console.log("✅ Writer set to:", nodeAddress);
    console.log("   Chainlink node can now update prices");
  } else {
    console.log("\n⚠️  NODE_ADDRESS not set - writer not configured");
    console.log("   To set writer later, run:");
    console.log("   $env:NODE_ADDRESS=\"0xYOUR_NODE_ADDRESS\"");
    console.log("   npx hardhat run scripts/set_multi_writer.cjs --network ganache");
  }
  
  // Ensure deployments directory exists
  const deploymentsDir = "deployments";
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  
  // Save PriceAggregator deployment
  // fs.writeFileSync(
  //   "deployments/local-chainlink.json",
  //   JSON.stringify({ aggregator: priceAggregator.target }, null, 2)
  // );
  
  // Save MultiPriceAggregator deployment
  fs.writeFileSync(
    "deployments/multi-price.json",
    JSON.stringify({ aggregator: multiAddr }, null, 2)
  );
  
  // Auto-update Chainlink TOML job targets to newly deployed MultiPriceAggregator
  try {
    const jobsDir = path.join(process.cwd(), "chainlink-data");
    const jobFiles = [
      "job-eth.toml",
      "job-weth.toml",
      "job-usdc.toml",
      "job-dai.toml",
      "job-link.toml",
    ];
    for (const jf of jobFiles) {
      const p = path.join(jobsDir, jf);
      if (!fs.existsSync(p)) continue;
      let content = fs.readFileSync(p, "utf8");
      // Replace any existing to="0x..." with the new aggregator address
      content = content.replace(/to="0x[a-fA-F0-9]{40}"/g, `to="${multiAddr}"`);
      // Ensure submit step has to= set (in case missing)
      content = content.replace(/(submit\s+\[type="ethtx"\s+)(data=)/, `$1to="${multiAddr}" $2`);
      fs.writeFileSync(p, content);
    }
    console.log("✅ Updated Chainlink job TOMLs with MultiPriceAggregator address:", multiAddr);
  } catch (e) {
    console.warn("⚠️  Could not auto-update Chainlink job TOMLs:", e.message);
  }
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
    console.log("  Expected Chain ID: 1337");
    
    if (chainId !== 1337) {
      console.error("\n❌ ERROR: Chain ID mismatch!");
      console.error("   Expected: 1337");
      console.error("   Got:", chainId.toString());
      console.error("\n💡 Make sure Ganache CLI is running with:");
      console.error("   --chain.chainId 1337 --chain.networkId 1337");
      console.error("\n   Or use: .\\START_GANACHE_SIMPLE.bat\n");
      process.exit(1);
    }
    
    console.log("  ✅ Chain ID correct!");
    
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("  Current Block:", blockNumber);
    console.log("  ✅ Network connection OK!\n");
  } catch (error) {
    console.error("\n❌ ERROR: Cannot connect to Ganache!");
    console.error("   Make sure Ganache CLI is running on port 7545");
    console.error("\n   Start with: .\\START_GANACHE_SIMPLE.bat\n");
    process.exit(1);
  }

  // Reuse the deployer already obtained above via hre.ethers.getSigners()
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

  // ========================================
  // 2️⃣ SET TOKEN SYMBOLS IN MultiPriceAggregator
  // ========================================
  console.log("\n2️⃣  Setting Token Symbols in MultiPriceAggregator...");
  console.log("─".repeat(70));
  
  // Set token address → symbol mapping
  // This allows MultiPriceAggregator to implement IPriceOracle interface
  const tokens = [wethAddress, daiAddress, usdcAddress, linkAddress];
  const symbols = ["WETH", "DAI", "USDC", "LINK"];
  
  await multiPriceAggregator.setTokenSymbols(tokens, symbols);
  console.log("✅ Token symbols set:");
  console.log("   WETH:", wethAddress, "→ WETH");
  console.log("   DAI: ", daiAddress, "→ DAI");
  console.log("   USDC:", usdcAddress, "→ USDC");
  console.log("   LINK:", linkAddress, "→ LINK");
  console.log("\n💡 Prices will be automatically updated by Chainlink jobs");
  console.log("   No manual price setting needed!");

  // ========================================
  // 2.5️⃣ DEPLOY LENDX TOKEN SYSTEM & GOVERNANCE
  // ========================================
  console.log("\n2.5️⃣  Deploying LENDX Token System & Governance...");
  console.log("─".repeat(70));

  // Check if LENDX token system already exists
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  let existingLENDXAddress = null;
  let existingGovernorAddress = null;
  
  if (fs.existsSync(addressesPath)) {
    const existingContent = fs.readFileSync(addressesPath, "utf8");
    const lendxMatch = existingContent.match(/LENDXTokenAddress\s*=\s*"([^"]+)"/);
    const governorMatch = existingContent.match(/GovernorAddress\s*=\s*"([^"]+)"/);
    if (lendxMatch) existingLENDXAddress = lendxMatch[1];
    if (governorMatch) existingGovernorAddress = governorMatch[1];
  }

  let lendxTokenAddress = existingLENDXAddress;
  let governorAddress = existingGovernorAddress;

  // Deploy LENDX Token System if not exists
  if (!lendxTokenAddress || lendxTokenAddress === '0x0000000000000000000000000000000000000000') {
    console.log("📦 Deploying LENDX Token System...");
    
    // Deploy LENDXToken
    const LENDXTokenFactory = await ethers.getContractFactory("LENDXToken");
    const lendxToken = await LENDXTokenFactory.deploy();
    await lendxToken.waitForDeployment();
    lendxTokenAddress = await lendxToken.getAddress();
    console.log("✅ LENDXToken deployed:", lendxTokenAddress);

    // Deploy RewardDistributor
    const RewardDistributorFactory = await ethers.getContractFactory("RewardDistributor");
    const rewardDistributor = await RewardDistributorFactory.deploy(lendxTokenAddress);
    await rewardDistributor.waitForDeployment();
    const rewardDistributorAddress = await rewardDistributor.getAddress();
    console.log("✅ RewardDistributor deployed:", rewardDistributorAddress);

    // Deploy TokenVesting
    const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    const tokenVesting = await TokenVestingFactory.deploy(lendxTokenAddress, deployer.address);
    await tokenVesting.waitForDeployment();
    const tokenVestingAddress = await tokenVesting.getAddress();
    console.log("✅ TokenVesting deployed:", tokenVestingAddress);

    // Deploy DAOTreasury
    const DAOTreasuryFactory = await ethers.getContractFactory("DAOTreasury");
    const daoTreasury = await DAOTreasuryFactory.deploy(lendxTokenAddress);
    await daoTreasury.waitForDeployment();
    const daoTreasuryAddress = await daoTreasury.getAddress();
    console.log("✅ DAOTreasury deployed:", daoTreasuryAddress);

    // Distribute tokens: 20M to proposers (hardcoded addresses), 80M to RewardDistributor
    const TOTAL_SUPPLY = ethers.parseUnits("100000000", 18); // 100M
    const PROPOSER_AMOUNT = ethers.parseUnits("20000000", 18); // 20M
    const REWARD_AMOUNT = ethers.parseUnits("80000000", 18); // 80M

    // Transfer 20M to deployer (as proposer for demo)
    await lendxToken.transfer(deployer.address, PROPOSER_AMOUNT);
    console.log("✅ Transferred 20M LENDX to deployer (proposer)");

    // Transfer 80M to RewardDistributor
    await lendxToken.transfer(rewardDistributorAddress, REWARD_AMOUNT);
    console.log("✅ Transferred 80M LENDX to RewardDistributor");

    console.log("✅ LENDX Token System deployed and distributed");
  } else {
    console.log("✅ LENDX Token System already exists:", lendxTokenAddress);
  }

  // Deploy Governor if not exists
  if (!governorAddress || governorAddress === '0x0000000000000000000000000000000000000000') {
    console.log("\n📦 Deploying LendHubGovernor...");
    const LendHubGovernorFactory = await ethers.getContractFactory("LendHubGovernor");
    const governor = await LendHubGovernorFactory.deploy(lendxTokenAddress, deployer.address);
    await governor.waitForDeployment();
    governorAddress = await governor.getAddress();
    console.log("✅ LendHubGovernor deployed:", governorAddress);
  } else {
    console.log("✅ Governor already exists:", governorAddress);
  }

  // ========================================
  // 3️⃣ DEPLOY LENDING POOL (using MultiPriceAggregator as Oracle)
  // ========================================
  console.log("\n3️⃣  Deploying LendingPool...");
  console.log("─".repeat(70));
  
  // Use MultiPriceAggregator as Oracle (it implements IPriceOracle)
  const LendingPoolFactory = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPoolFactory.deploy(
    irmAddress,
    multiAddr, // Use MultiPriceAggregator as oracle
    wethAddress,
    daiAddress
  );
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.getAddress();
  console.log("✅ LendingPool deployed:", poolAddress);
  console.log("   Using MultiPriceAggregator as Oracle (prices from Chainlink)");

  // Setup Governor: Set LendingPool and asset addresses
  if (governorAddress) {
    console.log("\n🔧 Setting up Governor...");
    try {
      const GovernorABI = [
        "function setLendingPool(address _lendingPool) external",
        "function setAssetAddress(string memory symbol, address assetAddress) external",
        "function lendingPool() external view returns (address)",
        "function assetAddresses(string memory) external view returns (address)",
      ];
      const governor = new ethers.Contract(governorAddress, GovernorABI, deployer);

      // Set LendingPool in Governor
      try {
        const currentLendingPool = await governor.lendingPool();
        if (currentLendingPool.toLowerCase() !== poolAddress.toLowerCase()) {
          const tx = await governor.setLendingPool(poolAddress);
          await tx.wait();
          console.log("✅ LendingPool set in Governor:", poolAddress);
        } else {
          console.log("✅ LendingPool already set in Governor");
        }
      } catch (error) {
        console.log("⚠️  Could not set LendingPool in Governor:", error.message);
      }

      // Set asset addresses in Governor
      const assets = [
        { symbol: "WETH", address: wethAddress },
        { symbol: "DAI", address: daiAddress },
        { symbol: "USDC", address: usdcAddress },
        { symbol: "LINK", address: linkAddress },
      ];

      for (const asset of assets) {
        try {
          const currentAddress = await governor.assetAddresses(asset.symbol);
          if (currentAddress.toLowerCase() !== asset.address.toLowerCase()) {
            const tx = await governor.setAssetAddress(asset.symbol, asset.address);
            await tx.wait();
            console.log(`✅ ${asset.symbol} address set in Governor: ${asset.address}`);
          }
        } catch (error) {
          console.log(`⚠️  Could not set ${asset.symbol} in Governor:`, error.message);
        }
      }

      // Set Governor in LendingPool
      try {
        const LendingPoolABI = [
          "function setGovernor(address _governor) external",
          "function governor() external view returns (address)",
        ];
        const lendingPoolWithGov = new ethers.Contract(poolAddress, LendingPoolABI, deployer);
        
        const currentGovernor = await lendingPoolWithGov.governor();
        if (currentGovernor.toLowerCase() !== governorAddress.toLowerCase()) {
          const tx = await lendingPoolWithGov.setGovernor(governorAddress);
          await tx.wait();
          console.log("✅ Governor set in LendingPool:", governorAddress);
          console.log("   LendingPool can now execute governance proposals");
        } else {
          console.log("✅ Governor already set in LendingPool");
        }
      } catch (error) {
        console.log("⚠️  Could not set Governor in LendingPool (may not have setGovernor function yet)");
        console.log("   This is OK if you're using an older LendingPool contract");
      }
    } catch (error) {
      console.log("⚠️  Governor setup failed:", error.message);
    }
  }

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
  // 5️⃣-B MINT TOKENS TO ADDITIONAL ACCOUNTS (Optional)
  // ========================================
  // You can add specific addresses here to mint tokens for accounts not in signers
  // Example: Uncomment and modify the addresses array below
  
  const additionalAccounts = [];
  const envFrontUser = process.env.FRONT_USER ? String(process.env.FRONT_USER) : "";
  if (envFrontUser && /^0x[0-9a-fA-F]{40}$/.test(envFrontUser)) {
    additionalAccounts.push(envFrontUser);
  }

  if (additionalAccounts.length > 0) {
    console.log("\n5️⃣-B  Minting Tokens to Additional Accounts...");
    console.log("─".repeat(70));

    for (let i = 0; i < additionalAccounts.length; i++) {
      const address = additionalAccounts[i];
      try {
        // Check if address already has tokens
        const wethBal = await weth.balanceOf(address);
        const daiBal = await dai.balanceOf(address);
        const usdcBal = await usdc.balanceOf(address);
        
        if (wethBal === 0n) {
          await weth.mint(address, ethers.parseUnits("10000", 18));
          console.log(`  ✅ Minted 10,000 WETH to ${address}`);
        }
        
        if (daiBal === 0n) {
          await dai.mint(address, ethers.parseUnits("1000000", 18));
          console.log(`  ✅ Minted 1,000,000 DAI to ${address}`);
        }
        
        if (usdcBal === 0n) {
          await usdc.mint(address, ethers.parseUnits("1000000", 6));
          console.log(`  ✅ Minted 1,000,000 USDC to ${address}`);
        }
        
        // Transfer LINK if needed
        const linkBal = await linkToken.balanceOf(address);
        if (linkBal === 0n) {
          const deployerLinkBal = await linkToken.balanceOf(deployer.address);
          const linkAmount = ethers.parseUnits("100000", 18);
          if (deployerLinkBal >= linkAmount) {
            await linkToken.transfer(address, linkAmount);
            console.log(`  ✅ Transferred 100,000 LINK to ${address}`);
          }
        }
        
        // Send ETH if balance is low
        const ethBal = await ethers.provider.getBalance(address);
        if (ethBal === 0n || ethBal < ethers.parseEther("100")) {
          const deployerEthBal = await ethers.provider.getBalance(deployer.address);
          const ethAmount = ethers.parseEther("999"); // Send 999 ETH
          // Keep some ETH for gas (at least 0.5 ETH)
          if (deployerEthBal > ethers.parseEther("1000")) {
            const tx = await deployer.sendTransaction({
              to: address,
              value: ethAmount
            });
            await tx.wait();
            console.log(`  ✅ Sent 999 ETH to ${address}`);
          } else {
            const deployerEthBalFormatted = ethers.formatEther(deployerEthBal);
            console.log(`  ⚠️  Deployer doesn't have enough ETH to send (has ${deployerEthBalFormatted} ETH)`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error minting to ${address}:`, error.message);
      }
    }
    console.log("");
  }

  console.log(`✅ Minted tokens to ${numUsers} signer accounts`);
  if (additionalAccounts.length > 0) {
    console.log(`✅ Minted tokens to ${additionalAccounts.length} additional accounts`);
  }
  console.log("💡 All accounts now have tokens ready for testing!\n");

  // ========================================
  // 6️⃣ ONLY USE MultiPriceAggregator (no single Aggregator needed)
  // ========================================
  console.log("\n6️⃣  Skipping single PriceAggregator deploy (using MultiPriceAggregator only)");

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
      priceOracle: multiAddr, // MultiPriceAggregator now serves as PriceOracle
      multiPriceAggregator: multiAddr,
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
  
  // Check if Governor exists to preserve it
  let governorAddressLine = "";
  try {
    const existingAddressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
    if (fs.existsSync(existingAddressesPath)) {
      const existingContent = fs.readFileSync(existingAddressesPath, "utf8");
      const governorMatch = existingContent.match(/export const GovernorAddress\s*=\s*"([^"]+)";/);
      if (governorMatch) {
        governorAddressLine = `export const GovernorAddress = "${governorMatch[1]}";\n`;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  // Get LENDX token system addresses (from deployment above or existing)
  let lendxTokenLines = "";
  if (lendxTokenAddress) {
    // Read existing addresses to preserve RewardDistributor, RewardAccumulator if they exist
    try {
      const existingAddressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
      if (fs.existsSync(existingAddressesPath)) {
        const existingContent = fs.readFileSync(existingAddressesPath, "utf8");
        const rewardDistributorMatch = existingContent.match(/export const RewardDistributorAddress\s*=\s*"([^"]+)";/);
        const rewardAccumulatorMatch = existingContent.match(/export const RewardAccumulatorAddress\s*=\s*"([^"]+)";/);
        
        lendxTokenLines += `export const LENDXTokenAddress = "${lendxTokenAddress}";\n`;
        if (rewardDistributorMatch) {
          lendxTokenLines += `export const RewardDistributorAddress = "${rewardDistributorMatch[1]}";\n`;
        }
        if (rewardAccumulatorMatch) {
          lendxTokenLines += `export const RewardAccumulatorAddress = "${rewardAccumulatorMatch[1]}";\n`;
        }
        if (lendxTokenLines) {
          lendxTokenLines += "\n";
        }
      } else {
        // First time deployment - add LENDX token address
        lendxTokenLines += `export const LENDXTokenAddress = "${lendxTokenAddress}";\n`;
      }
    } catch (error) {
      // If error, just add LENDX token address
      lendxTokenLines += `export const LENDXTokenAddress = "${lendxTokenAddress}";\n`;
    }
  }

  const addressesContent = `// Auto-generated for GANACHE CLI
// Network: http://127.0.0.1:7545 | Chain ID: 1337
// Mnemonic: uniform message payment medal rural toward reject resist test immune smile ridge

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${poolAddress}";
export const InterestRateModelAddress = "${irmAddress}";
export const PriceOracleAddress = "${multiAddr}"; // MultiPriceAggregator serves as PriceOracle
export const PricemultiAddr = "${multiAddr}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${wethAddress}";
export const DAIAddress = "${daiAddress}";
export const USDCAddress = "${usdcAddress}";
export const LINKAddress = "${linkAddress}";

// 10 Demo Users (each has 10K WETH, 1M DAI, 1M USDC, 100K LINK)
${userAddresses.map((addr, i) => `export const User${i}Address = "${addr}";`).join('\n')}
${lendxTokenLines}${governorAddressLine}`;

  // Always write the complete file (replace, not append) to avoid duplicates
  fs.writeFileSync(frontendAddressesPath, addressesContent, 'utf8');
  console.log("✅ Updated frontend addresses:", frontendAddressesPath);
  
  // Verify and clean duplicates after writing (safety check)
  try {
    const verifyContent = fs.readFileSync(frontendAddressesPath, 'utf8');
    const lines = verifyContent.split('\n');
    const newLines = [];
    const seenNames = new Set();
    const duplicates = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^export const (\w+Address)\s*=\s*"[^"]+";/);
      if (match) {
        const name = match[1];
        if (seenNames.has(name)) {
          duplicates.push(name);
          continue; // Skip duplicate
        } else {
          seenNames.add(name);
        }
      }
      newLines.push(line);
    }
    
    if (duplicates.length > 0) {
      console.warn(`⚠️  WARNING: Found ${duplicates.length} duplicate(s) after writing, cleaning...`);
      const cleanedContent = newLines.join('\n');
      fs.writeFileSync(frontendAddressesPath, cleanedContent, 'utf8');
      console.log(`✅ Cleaned ${duplicates.length} duplicate(s): ${[...new Set(duplicates)].join(', ')}`);
    }
  } catch (error) {
    console.warn("⚠️  Could not verify addresses.js:", error.message);
  }

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
  console.log("  PriceOracle:        ", multiAddr, "(MultiPriceAggregator)");
  // console.log("  PriceAggregator:    ", aggregatorAddress);
  
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
  console.log("  💡 Prices are automatically updated by Chainlink jobs");
  console.log("  💡 No manual price setting needed!");
  console.log("  💡 Prices will be available once Chainlink jobs run");
  
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
  console.log("  • All Ganache accounts (signers) have been minted tokens!");
  console.log("  • Frontend addresses have been auto-updated!");
  console.log("  • If you connect MetaMask with any account from Ganache, you'll see tokens!");
  console.log("  • If you need tokens for additional accounts, run:");
  console.log("    npx hardhat run scripts/mint_to_account_hardhat.cjs --network ganache");
  
  // ========================================
  // 🔗 DEPLOY CHAINLINK PRICE AGGREGATORS
  // ========================================
  console.log("\n🔗 Skipping single-token Price Aggregators (use MultiPriceAggregator only)");
  const aggregators = {}; // kept for compatibility; intentionally empty

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
  console.log("");
  // console.log("Saved to deployments/local-chainlink.json");
  console.log("Saved to deployments/multi-price.json");
}

main().catch(console.error);
