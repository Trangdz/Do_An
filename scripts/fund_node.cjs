const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Get node address from MultiPriceAggregator writer
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const node = await aggregator.writer();
  
  if (node === "0x0000000000000000000000000000000000000000") {
    throw new Error("Writer not set! Run: npx hardhat run scripts/find_and_set_writer.cjs --network ganache");
  }
  
  const amount = hre.ethers.parseEther(process.env.AMOUNT_ETH || "5.0");
  console.log(`Funding Chainlink node ${node} with ${process.env.AMOUNT_ETH || "5.0"} ETH...`);
  const tx = await deployer.sendTransaction({ to: node, value: amount });
  await tx.wait();
  console.log(`✅ Funded ${node} with ${process.env.AMOUNT_ETH || "5.0"} ETH`);
  
  // Verify balance
  const balance = await hre.ethers.provider.getBalance(node);
  console.log(`   New balance: ${hre.ethers.formatEther(balance)} ETH`);
}

main().catch(console.error);
