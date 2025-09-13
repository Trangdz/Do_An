const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy 2 token mock (DAI 18d, USDC 6d)
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
  await dai.waitForDeployment();
  const usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("DAI:", await dai.getAddress());
  console.log("USDC:", await usdc.getAddress());

  // Mint một ít cho deployer
  await (await dai.mint(deployer.address, ethers.parseEther("1000000"))).wait();
  await (await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n)).wait();

  // Deploy oracle feed mock (decimals=8)
  const Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const ethUsd = await Aggregator.deploy(8, 1600n * 10n ** 8n); // 1600$
  const daiUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);    // 1$
  const usdcUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);   // 1$
  await ethUsd.waitForDeployment();
  await daiUsd.waitForDeployment();
  await usdcUsd.waitForDeployment();

  console.log("ETH/USD feed:", await ethUsd.getAddress());
  console.log("DAI/USD feed:", await daiUsd.getAddress());
  console.log("USDC/USD feed:", await usdcUsd.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
