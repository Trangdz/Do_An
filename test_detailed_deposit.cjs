const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const WETHAddress = "0x156728Ae8B071e292ffea68bbd9856CC21d80e39";
  
  console.log("🔍 Detailed WETH Deposit Test");
  console.log("==============================");
  console.log("WETH Address:", WETHAddress);
  console.log("Deployer:", deployer.address);
  
  // Get WETH contract
  const WETH = await ethers.getContractAt("TokenWithWithdraw", WETHAddress);
  
  // Check initial balances
  const initialEthBalance = await ethers.provider.getBalance(deployer.address);
  const initialWethBalance = await WETH.balanceOf(deployer.address);
  const contractEthBalance = await ethers.provider.getBalance(WETHAddress);
  
  console.log("\n📊 Initial Balances:");
  console.log("Deployer ETH:", ethers.formatEther(initialEthBalance));
  console.log("Deployer WETH:", ethers.formatEther(initialWethBalance));
  console.log("Contract ETH:", ethers.formatEther(contractEthBalance));
  
  // Test deposit 12 ETH
  const depositAmount = ethers.parseEther("12");
  console.log("\n💰 Testing deposit of 12 ETH...");
  console.log("Deposit amount (wei):", depositAmount.toString());
  
  const tx = await WETH.deposit({ value: depositAmount });
  console.log("Transaction hash:", tx.hash);
  
  console.log("⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Check balances after
  const finalEthBalance = await ethers.provider.getBalance(deployer.address);
  const finalWethBalance = await WETH.balanceOf(deployer.address);
  const finalContractEthBalance = await ethers.provider.getBalance(WETHAddress);
  
  console.log("\n📊 Final Balances:");
  console.log("Deployer ETH:", ethers.formatEther(finalEthBalance));
  console.log("Deployer WETH:", ethers.formatEther(finalWethBalance));
  console.log("Contract ETH:", ethers.formatEther(finalContractEthBalance));
  
  // Calculate changes
  const ethChange = initialEthBalance - finalEthBalance;
  const wethChange = finalWethBalance - initialWethBalance;
  const contractEthChange = finalContractEthBalance - contractEthBalance;
  
  console.log("\n📈 Changes:");
  console.log("ETH spent:", ethers.formatEther(ethChange));
  console.log("WETH received:", ethers.formatEther(wethChange));
  console.log("Contract ETH received:", ethers.formatEther(contractEthChange));
  
  // Verify 1:1 ratio
  if (wethChange.toString() === depositAmount.toString()) {
    console.log("✅ SUCCESS: 1 ETH = 1 WETH ratio is correct!");
  } else {
    console.log("❌ ERROR: Ratio mismatch!");
    console.log("Expected WETH:", ethers.formatEther(depositAmount));
    console.log("Actual WETH:", ethers.formatEther(wethChange));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

