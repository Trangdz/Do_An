const { ethers } = require("hardhat");

async function main() {
  console.log("📋 Getting All Contract Addresses");
  console.log("==================================");
  
  const [deployer, user, liquidator] = await ethers.getSigners();
  
  // Deploy all ERC20 tokens
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  
  const freshWETH = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
  const freshDAI = await ERC20Mock.deploy("Dai Stablecoin", "DAI", 18);
  const freshUSDC = await ERC20Mock.deploy("USD Coin", "USDC", 6);
  const freshLINK = await ERC20Mock.deploy("Chainlink Token", "LINK", 18);
  
  await freshWETH.waitForDeployment();
  await freshDAI.waitForDeployment();
  await freshUSDC.waitForDeployment();
  await freshLINK.waitForDeployment();
  
  // Deploy core contracts
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  
  const irm = await InterestRateModel.deploy();
  const oracle = await PriceOracle.deploy();
  const pool = await LendingPool.deploy(
    await irm.getAddress(), 
    await oracle.getAddress(),
    await freshWETH.getAddress(),
    await freshDAI.getAddress()
  );
  
  await irm.waitForDeployment();
  await oracle.waitForDeployment();
  await pool.waitForDeployment();
  
  // Print all addresses
  console.log("\n📋 All Contract Addresses:");
  console.log("==========================");
  console.log(`export const ETHAddress = "0x0000000000000000000000000000000000000000";`);
  console.log(`export const LendingPoolAddress = "${await pool.getAddress()}";`);
  console.log(`export const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not available`);
  console.log(`export const WETHAddress = "${await freshWETH.getAddress()}";`);
  console.log(`export const DAIAddress = "${await freshDAI.getAddress()}";`);
  console.log(`export const USDCAddress = "${await freshUSDC.getAddress()}";`);
  console.log(`export const LINKAddress = "${await freshLINK.getAddress()}";`);
  console.log(`export const PriceOracleAddress = "${await oracle.getAddress()}";`);
  console.log(`export const InterestRateModelAddress = "${await irm.getAddress()}";`);
  
  console.log("\n📋 Additional Info:");
  console.log("==================");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User: ${user.address}`);
  console.log(`Liquidator: ${liquidator.address}`);
  
  console.log("\n✅ All addresses ready!");
}

main().catch(console.error);


