const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const node = process.env.NODE_ADDRESS;
  if (!node) throw new Error("Set NODE_ADDRESS env var (sending address from Chainlink node)");

  const meta = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8"));
  
  console.log("Node address:", node);
  console.log("\nAuthorizing node for all aggregators...\n");

  for (const [symbol, address] of Object.entries(meta.aggregators)) {
    console.log(`${symbol}: ${address}`);
    const agg = await ethers.getContractAt("PriceAggregator", address);
    const tx = await agg.setWriter(node, true);
    await tx.wait();
    console.log(`  ✅ Authorized`);
  }

  console.log("\n✅ All aggregators authorized!");
  console.log("\nNext: Fund node with ETH");
  console.log(`  NODE_ADDRESS=${node} npx hardhat run scripts/fund_node.cjs --network ganache`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});










