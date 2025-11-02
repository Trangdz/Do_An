const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const node1 = process.env.NODE1_ADDRESS;
  const node2 = process.env.NODE2_ADDRESS;
  
  if (!node1 || !node2) {
    throw new Error("Set NODE1_ADDRESS and NODE2_ADDRESS env vars");
  }

  const meta = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8"));
  
  console.log("Node 1:", node1);
  console.log("Node 2:", node2);
  console.log("\nAuthorizing both nodes for all aggregators...\n");

  for (const [symbol, address] of Object.entries(meta.aggregators)) {
    console.log(`${symbol}: ${address}`);
    const agg = await ethers.getContractAt("PriceAggregator", address);
    
    // Authorize Node 1
    const tx1 = await agg.setWriter(node1, true);
    await tx1.wait();
    console.log(`  ✅ Node 1 authorized`);
    
    // Authorize Node 2
    const tx2 = await agg.setWriter(node2, true);
    await tx2.wait();
    console.log(`  ✅ Node 2 authorized\n`);
  }

  console.log("✅ Both nodes authorized for all aggregators!");
  console.log("\nNext: Fund both nodes with ETH");
  console.log(`  NODE_ADDRESS=${node1} npx hardhat run scripts/fund_node.cjs --network localhost`);
  console.log(`  NODE_ADDRESS=${node2} npx hardhat run scripts/fund_node.cjs --network localhost`);
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});






