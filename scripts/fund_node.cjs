const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  let node;
  const nodeFromEnv = process.env.NODE_ADDRESS;
  
  // Method 1: Use NODE_ADDRESS from environment if provided
  if (nodeFromEnv) {
    node = nodeFromEnv;
    console.log(`Using node address from NODE_ADDRESS env var: ${node}`);
  } else {
    // Method 2: Get node address from MultiPriceAggregator writer
    try {
      const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
      const aggregatorAddress = data.contracts.multiPriceAggregator;
      const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
      node = await aggregator.writer();
      
      if (node === "0x0000000000000000000000000000000000000000") {
        throw new Error("Writer not set! Run: npx hardhat run scripts/find_and_set_writer.cjs --network ganache");
      }
      console.log(`Using node address from MultiPriceAggregator writer: ${node}`);
    } catch (err) {
      console.error("❌ Error getting node address:", err.message);
      console.error("\n💡 Please set NODE_ADDRESS environment variable:");
      console.error("   $env:NODE_ADDRESS=\"0xYOUR_NODE_ADDRESS\" npx hardhat run scripts/fund_node.cjs --network ganache");
      process.exit(1);
    }
  }
  
  const amountEth = process.env.AMOUNT_ETH || "1.0";
  const amount = hre.ethers.parseEther(amountEth);
  
  console.log("\n📋 Funding Chainlink node:");
  console.log("   From:", deployer.address);
  console.log("   To (node):", node);
  console.log("   Amount:", amountEth, "ETH");
  
  // Check current balance
  const balanceBefore = await hre.ethers.provider.getBalance(node);
  console.log("   Current balance:", hre.ethers.formatEther(balanceBefore), "ETH");
  
  // Send transaction
  const tx = await deployer.sendTransaction({ 
    to: node, 
    value: amount 
  });
  
  console.log("   Transaction hash:", tx.hash);
  console.log("   Waiting for confirmation...");
  
  await tx.wait();
  
  // Verify new balance
  const balanceAfter = await hre.ethers.provider.getBalance(node);
  console.log("\n✅ Funded successfully!");
  console.log("   New balance:", hre.ethers.formatEther(balanceAfter), "ETH");
  console.log("   Added:", hre.ethers.formatEther(balanceAfter - balanceBefore), "ETH");
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});
