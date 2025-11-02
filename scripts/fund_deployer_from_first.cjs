const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  
  // Account đầu tiên (index 0) luôn có 1000 ETH từ Ganache
  const funder = signers[0];
  const deployer = signers[0]; // Deployer cũng là account đầu tiên
  
  console.log("\n💰 Funding deployer...\n");
  console.log("Funder:", await funder.getAddress());
  console.log("Deployer:", await deployer.getAddress());
  
  const funderBal = await ethers.provider.getBalance(funder.address);
  console.log("Funder balance:", ethers.formatEther(funderBal), "ETH\n");
  
  // Nếu deployer là account đầu tiên, không cần fund
  if (funder.address.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("✅ Deployer is already the first account (has 1000 ETH)\n");
    return;
  }
  
  // Fund deployer với 500 ETH
  const amount = ethers.parseEther("500");
  
  if (funderBal < amount + ethers.parseEther("0.1")) {
    console.log("❌ Funder doesn't have enough ETH\n");
    return;
  }
  
  try {
    const tx = await funder.sendTransaction({
      to: deployer.address,
      value: amount
    });
    console.log("⏳ Sending...", tx.hash);
    await tx.wait();
    console.log("✅ Funded deployer with", ethers.formatEther(amount), "ETH\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);



