const hre = require("hardhat");
const fs = require("fs");

async function main() {
const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
const aggregatorAddress = data.contracts.multiPriceAggregator;
if (!aggregatorAddress) throw new Error("multiPriceAggregator address not found in deployments/local-chainlink.json");

const [deployer] = await hre.ethers.getSigners();
const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);

const node = process.env.NODE_ADDRESS;
// const node = "0xF54c75E5aACc5d51B167701Cb33c3BCB013f4211";
if (!node) throw new Error("NODE_ADDRESS env var is required");
const tx = await aggregator.connect(deployer).setWriter(node, true);
  await tx.wait();
  
  console.log("✅ Authorized writer:", node);
console.log("Contract:", aggregatorAddress);
}

main().catch(console.error);


