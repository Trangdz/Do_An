import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy InterestRateModel
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  console.log("InterestRateModel:", await interestRateModel.getAddress());

  // 2) Deploy PriceOracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("PriceOracle:", await priceOracle.getAddress());

  // 3) Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    await interestRateModel.getAddress(),
    await priceOracle.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("LendingPool:", await lendingPool.getAddress());

  // 4) Set up prices
  const DAI = "0xf877004dC804Bd501a2627bB3b1379247B1D4950";
  const USDC = "0x8fAcF8BAb86D86C5E30CA90ba25B7E0e13342FF2";
  
  await (await priceOracle.setAssetPrice(DAI, ethers.parseEther("1"))).wait();
  await (await priceOracle.setAssetPrice(USDC, ethers.parseEther("1"))).wait();
  await (await priceOracle.setAssetPrice(ethers.ZeroAddress, ethers.parseEther("1600"))).wait();
  
  console.log("Prices set in oracle");
  console.log("Ready for Day 3 operations!");
  console.log("\n📋 Contract Addresses:");
  console.log("InterestRateModel:", await interestRateModel.getAddress());
  console.log("PriceOracle:", await priceOracle.getAddress());
  console.log("LendingPool:", await lendingPool.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});