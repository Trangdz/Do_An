const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const WETHAddress = "0x4140e9669e46CB8c9BF98ce574F32E79D888e9d1";
  
  console.log("Adding ETH to WETH contract...");
  console.log("WETH Address:", WETHAddress);
  console.log("Deployer:", deployer.address);
  
  // Add 10 ETH to WETH contract for deposits
  const tx = await deployer.sendTransaction({
    to: WETHAddress,
    value: ethers.parseEther("10"),
    gasLimit: 100000
  });
  
  await tx.wait();
  console.log("✅ Added 10 ETH to WETH contract");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

