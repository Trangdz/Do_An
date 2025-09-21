const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const WETHAddress = "0x156728Ae8B071e292ffea68bbd9856CC21d80e39";
  
  console.log("🔍 Checking WETH Balance");
  console.log("========================");
  console.log("WETH Address:", WETHAddress);
  console.log("User Address:", deployer.address);
  
  // Get WETH contract
  const WETH = await ethers.getContractAt("TokenWithWithdraw", WETHAddress);
  
  // Check user's WETH balance
  const userBalance = await WETH.balanceOf(deployer.address);
  console.log("User WETH balance (wei):", userBalance.toString());
  console.log("User WETH balance (ETH):", ethers.formatEther(userBalance));
  
  // Check total supply
  const totalSupply = await WETH.totalSupply();
  console.log("Total WETH supply (wei):", totalSupply.toString());
  console.log("Total WETH supply (ETH):", ethers.formatEther(totalSupply));
  
  // Check contract ETH balance
  const contractEthBalance = await ethers.provider.getBalance(WETHAddress);
  console.log("Contract ETH balance:", ethers.formatEther(contractEthBalance));
  
  // Check if this matches what frontend shows
  const frontendShows = "1.0M WETH";
  console.log("\n📊 Comparison:");
  console.log("Frontend shows:", frontendShows);
  console.log("Actual balance:", ethers.formatEther(userBalance));
  
  if (ethers.formatEther(userBalance).includes("1000000")) {
    console.log("✅ This explains the 1.0M WETH display!");
    console.log("The contract has 1M initial supply + deposits");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

