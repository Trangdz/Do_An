const { ethers } = require("hardhat");

async function main() {
  console.log("🏦 Testing LendHub v2 contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Deploy mock tokens
  console.log("\n💰 Deploying mock tokens...");
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const dai = await ERC20Mock.deploy("Mock DAI", "DAI", 18);
  const usdc = await ERC20Mock.deploy("Mock USDC", "USDC", 6);
  
  await dai.waitForDeployment();
  await usdc.waitForDeployment();
  
  console.log("📄 DAI deployed at:", await dai.getAddress());
  console.log("📄 USDC deployed at:", await usdc.getAddress());
  
  // Deploy price oracles
  console.log("\n📊 Deploying price oracles...");
  const Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const ethUsd = await Aggregator.deploy(8, 1600n * 10n ** 8n);
  const daiUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);
  const usdcUsd = await Aggregator.deploy(8, 1n * 10n ** 8n);
  
  await ethUsd.waitForDeployment();
  await daiUsd.waitForDeployment();
  await usdcUsd.waitForDeployment();
  
  console.log("📄 ETH/USD oracle:", await ethUsd.getAddress());
  console.log("📄 DAI/USD oracle:", await daiUsd.getAddress());
  console.log("📄 USDC/USD oracle:", await usdcUsd.getAddress());
  
  // Test token functionality
  console.log("\n🧪 Testing token functionality...");
  
  // Mint tokens
  await dai.mint(deployer.address, ethers.parseEther("1000000"));
  await usdc.mint(deployer.address, 1_000_000n * 10n ** 6n);
  
  const daiBalance = await dai.balanceOf(deployer.address);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  
  console.log("💰 DAI balance:", ethers.formatEther(daiBalance));
  console.log("💰 USDC balance:", ethers.formatUnits(usdcBalance, 6));
  
  // Test price oracles
  console.log("\n📈 Testing price oracles...");
  
  const [, ethPrice] = await ethUsd.latestRoundData();
  const [, daiPrice] = await daiUsd.latestRoundData();
  const [, usdcPrice] = await usdcUsd.latestRoundData();
  
  console.log("💲 ETH price: $", ethers.formatUnits(ethPrice, 8));
  console.log("💲 DAI price: $", ethers.formatUnits(daiPrice, 8));
  console.log("💲 USDC price: $", ethers.formatUnits(usdcPrice, 8));
  
  // Test token transfers
  console.log("\n🔄 Testing token transfers...");
  
  const transferAmount = ethers.parseEther("1000");
  await dai.transfer("0x0000000000000000000000000000000000000001", transferAmount);
  
  const newBalance = await dai.balanceOf(deployer.address);
  console.log("💰 DAI balance after transfer:", ethers.formatEther(newBalance));
  
  // Test price oracle updates
  console.log("\n🔄 Testing price oracle updates...");
  
  const newEthPrice = 2000n * 10n ** 8n;
  await ethUsd.updateAnswer(newEthPrice);
  
  const [, updatedEthPrice] = await ethUsd.latestRoundData();
  console.log("💲 Updated ETH price: $", ethers.formatUnits(updatedEthPrice, 8));
  
  console.log("\n🎉 LendHub v2 contracts test completed successfully!");
  console.log("\n📋 Summary:");
  console.log("✅ Mock tokens deployed and working");
  console.log("✅ Price oracles deployed and working");
  console.log("✅ Token transfers working");
  console.log("✅ Price updates working");
  console.log("\n🚀 Ready for LendHub v2 development!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
