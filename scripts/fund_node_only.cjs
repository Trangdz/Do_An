const { ethers } = require("hardhat");

const NODE_ADDRESS = "0xD0d849E6C1eF1b2dDD174f05f779F883546d6133";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("\n💰 Funding Chainlink node...\n");
  console.log("Node:", NODE_ADDRESS);
  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");
  
  const amount = ethers.parseEther("5.0");
  
  if (balance < amount + ethers.parseEther("0.01")) {
    console.log("❌ Not enough ETH. Need to restart Ganache.\n");
    return;
  }
  
  try {
    const tx = await deployer.sendTransaction({
      to: NODE_ADDRESS,
      value: amount
    });
    console.log("⏳ Sending...", tx.hash);
    await tx.wait();
    console.log("✅ Funded node with", ethers.formatEther(amount), "ETH\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);



