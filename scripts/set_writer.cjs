const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const node = process.env.NODE_ADDRESS;
  if (!node) throw new Error("Set NODE_ADDRESS env var");

  const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
  const aggAddr = meta.priceAggregator;
  
  console.log("Aggregator:", aggAddr);
  console.log("Node:", node);
  
  const agg = await ethers.getContractAt("PriceAggregator", aggAddr);
  const tx = await agg.setWriter(node, true);
  await tx.wait();
  
  console.log("Writer authorized!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

