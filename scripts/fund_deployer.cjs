const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  
  console.log("\n📦 Deployer:", deployerAddress);
  console.log("💰 Current balance:", ethers.formatEther(balance), "ETH\n");
  
  if (parseFloat(ethers.formatEther(balance)) < 100) {
    console.log("⚠️  Deployer has low balance. Need to restart Ganache or use different account.\n");
  } else {
    console.log("✅ Deployer has enough ETH for deployment\n");
  }
}

main().catch(console.error);



