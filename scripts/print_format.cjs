const { ethers } = require("hardhat");

async function main() {
  console.log("📋 Contract Addresses - Copy Format");
  console.log("===================================");

  const [deployer, user, liquidator] = await ethers.getSigners();
  
  // Deploy all contracts
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  
  const weth = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
  const dai = await ERC20Mock.deploy("Dai Stablecoin", "DAI", 18);
  const usdc = await ERC20Mock.deploy("USD Coin", "USDC", 6);
  const link = await ERC20Mock.deploy("Chainlink Token", "LINK", 18);
  
  await weth.waitForDeployment();
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  await link.waitForDeployment();
  
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
  
  // Print in exact format for easy copying
  console.log("\n📋 Copy this exactly:");
  console.log("=====================");
  console.log(`export const ETHAddress = "0x0000000000000000000000000000000000000000";`);
  console.log(`export const LendingPoolAddress = "${await pool.getAddress()}";`);
  console.log(`export const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not deployed`);
  console.log(`export const WETHAddress = "${await weth.getAddress()}";`);
  console.log(`export const DAIAddress = "${await dai.getAddress()}";`);
  console.log(`export const USDCAddress = "${await usdc.getAddress()}";`);
  console.log(`export const LINKAddress = "${await link.getAddress()}";`);
  console.log(`export const PriceOracleAddress = "${await oracle.getAddress()}";`);
  
  console.log("\n✅ Ready to copy!");
}

main().catch(console.error);


