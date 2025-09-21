const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const WETHAddress = "0x156728Ae8B071e292ffea68bbd9856CC21d80e39";
  
  console.log("Testing WETH deposit function...");
  console.log("WETH Address:", WETHAddress);
  console.log("Deployer:", deployer.address);
  
  // Get WETH contract
  const WETH = await ethers.getContractAt("TokenWithWithdraw", WETHAddress);
  
  // Check if contract has deposit function
  try {
    const depositFunction = WETH.interface.getFunction("deposit");
    console.log("✅ Contract has deposit function:", depositFunction.name);
  } catch (error) {
    console.log("❌ Contract does NOT have deposit function");
    return;
  }
  
  // Check contract balance before
  const balanceBefore = await ethers.provider.getBalance(WETHAddress);
  console.log("Contract ETH balance before:", ethers.formatEther(balanceBefore));
  
  // Test deposit 1 ETH
  console.log("Testing deposit of 1 ETH...");
  const tx = await WETH.deposit({ value: ethers.parseEther("1") });
  await tx.wait();
  
  // Check contract balance after
  const balanceAfter = await ethers.provider.getBalance(WETHAddress);
  console.log("Contract ETH balance after:", ethers.formatEther(balanceAfter));
  
  // Check deployer's WETH balance
  const wethBalance = await WETH.balanceOf(deployer.address);
  console.log("Deployer WETH balance:", ethers.formatEther(wethBalance));
  
  console.log("✅ Deposit test successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

