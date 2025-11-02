const { ethers } = require("hardhat");

const DEPLOYER_ADDRESS = "0x38ceaD2cB294F3D881C122e16578BBBc781ECa06";

async function main() {
  const signers = await ethers.getSigners();
  
  // Lấy account đầu tiên (luôn có 1000 ETH từ Ganache)
  const funder = signers[0];
  const funderAddr = await funder.getAddress();
  const funderBal = await ethers.provider.getBalance(funderAddr);
  
  console.log("\n💰 Sending ETH to deployer...\n");
  console.log("Funder:", funderAddr);
  console.log("Funder balance:", ethers.formatEther(funderBal), "ETH");
  console.log("Deployer:", DEPLOYER_ADDRESS);
  
  const deployerBal = await ethers.provider.getBalance(DEPLOYER_ADDRESS);
  console.log("Deployer balance (before):", ethers.formatEther(deployerBal), "ETH\n");
  
  if (parseFloat(ethers.formatEther(deployerBal)) > 100) {
    console.log("✅ Deployer already has enough ETH\n");
    return;
  }
  
  // Send 500 ETH
  const amount = ethers.parseEther("500");
  
  if (funderBal < amount + ethers.parseEther("0.1")) {
    console.log("❌ Funder doesn't have enough ETH\n");
    return;
  }
  
  try {
    const tx = await funder.sendTransaction({
      to: DEPLOYER_ADDRESS,
      value: amount
    });
    console.log("⏳ Sending...", tx.hash);
    await tx.wait();
    
    const newBal = await ethers.provider.getBalance(DEPLOYER_ADDRESS);
    console.log("✅ Sent", ethers.formatEther(amount), "ETH");
    console.log("Deployer balance (after):", ethers.formatEther(newBal), "ETH\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);



