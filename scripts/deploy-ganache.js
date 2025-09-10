const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying LendHub v1 to Ganache...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy MockOracle
  console.log("\n📊 Deploying MockOracle...");
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const oracle = await MockOracle.deploy();
  await oracle.deployed();
  console.log("MockOracle deployed to:", oracle.address);

  // Deploy MockTokens
  console.log("\n🪙 Deploying MockTokens...");
  
  // USDC (6 decimals)
  const USDC = await ethers.getContractFactory("MockToken");
  const usdc = await USDC.deploy("USD Coin", "USDC", 6);
  await usdc.deployed();
  console.log("USDC deployed to:", usdc.address);

  // DAI (18 decimals)
  const DAI = await ethers.getContractFactory("MockToken");
  const dai = await DAI.deploy("Dai Stablecoin", "DAI", 18);
  await dai.deployed();
  console.log("DAI deployed to:", dai.address);

  // WETH (18 decimals)
  const WETH = await ethers.getContractFactory("MockToken");
  const weth = await WETH.deploy("Wrapped Ether", "WETH", 18);
  await weth.deployed();
  console.log("WETH deployed to:", weth.address);

  // LINK (18 decimals)
  const LINK = await ethers.getContractFactory("MockToken");
  const link = await LINK.deploy("ChainLink Token", "LINK", 18);
  await link.deployed();
  console.log("LINK deployed to:", link.address);

  // Deploy RiskManager
  console.log("\n🛡️ Deploying RiskManager...");
  const RiskManager = await ethers.getContractFactory("RiskManager");
  const riskManager = await RiskManager.deploy(oracle.address);
  await riskManager.deployed();
  console.log("RiskManager deployed to:", riskManager.address);

  // Configure tokens in RiskManager
  console.log("\n⚙️ Configuring tokens in RiskManager...");
  
  // Add USDC (collateral, LTV=90%, LT=95%, Bonus=3%)
  await riskManager.addToken(usdc.address, true, 9000, 9500, 300);
  console.log("USDC added to RiskManager");

  // Add DAI (collateral, LTV=80%, LT=85%, Bonus=5%)
  await riskManager.addToken(dai.address, true, 8000, 8500, 500);
  console.log("DAI added to RiskManager");

  // Add WETH (collateral, LTV=80%, LT=82.5%, Bonus=5%)
  await riskManager.addToken(weth.address, true, 8000, 8250, 500);
  console.log("WETH added to RiskManager");

  // Add LINK (collateral, LTV=70%, LT=75%, Bonus=8%)
  await riskManager.addToken(link.address, true, 7000, 7500, 800);
  console.log("LINK added to RiskManager");

  // Deploy LendingPoolV2
  console.log("\n🏦 Deploying LendingPoolV2...");
  const LendingPoolV2 = await ethers.getContractFactory("LendingPoolV2");
  const lendingPool = await LendingPoolV2.deploy(riskManager.address);
  await lendingPool.deployed();
  console.log("LendingPoolV2 deployed to:", lendingPool.address);

  // Add tokens to LendingPool
  console.log("\n➕ Adding tokens to LendingPool...");
  await lendingPool.addToken(usdc.address);
  await lendingPool.addToken(dai.address);
  await lendingPool.addToken(weth.address);
  await lendingPool.addToken(link.address);
  console.log("All tokens added to LendingPool");

  // Distribute tokens to test accounts
  console.log("\n💰 Distributing tokens to test accounts...");
  const testAccounts = [
    "0x5A61D0993a1068A57152c8e0af44B17D6b2E2B11",
    "0x876FF3A3A5cD015BA6B407d53Ad004A5827a13B0",
    "0x9BeD0F4C7bD54a9A9531Ac6aAf4C9B3CD335e364"
  ];

  const tokenAmounts = {
    [usdc.address]: ethers.utils.parseUnits("10000", 6), // 10K USDC
    [dai.address]: ethers.utils.parseEther("10000"), // 10K DAI
    [weth.address]: ethers.utils.parseEther("10"), // 10 WETH
    [link.address]: ethers.utils.parseEther("1000") // 1K LINK
  };

  for (const account of testAccounts) {
    for (const [tokenAddress, amount] of Object.entries(tokenAmounts)) {
      const token = await ethers.getContractAt("MockToken", tokenAddress);
      await token.transfer(account, amount);
    }
    console.log(`Tokens distributed to ${account}`);
  }

  // Output addresses for frontend
  console.log("\n📋 Contract Addresses:");
  console.log("=====================");
  console.log(`MockOracle: ${oracle.address}`);
  console.log(`RiskManager: ${riskManager.address}`);
  console.log(`LendingPoolV2: ${lendingPool.address}`);
  console.log(`USDC: ${usdc.address}`);
  console.log(`DAI: ${dai.address}`);
  console.log(`WETH: ${weth.address}`);
  console.log(`LINK: ${link.address}`);

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n🔧 Next steps:");
  console.log("1. Update addresses.js with new contract addresses");
  console.log("2. Update frontend to use LendingPoolV2");
  console.log("3. Test the protocol with the distributed tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
