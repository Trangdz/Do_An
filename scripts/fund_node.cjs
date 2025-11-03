const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const node = process.env.NODE_ADDRESS;
  const amount = hre.ethers.parseEther(process.env.AMOUNT_ETH || "5.0");
  const tx = await deployer.sendTransaction({ to: node, value: amount });
  await tx.wait();
  console.log(`Funded ${node} with ${process.env.AMOUNT_ETH} ETH`);
}

main().catch(console.error);
