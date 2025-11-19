const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  
  // Get recent transactions from Chainlink address
  const chainlinkAddress = "0x3e058341c9f39Ee3fc80B9ED2BA12e0fca04f8C5";
  const contractAddress = "0x9CFaEEa783636619263929CCAc45372ACDC60e26";
  
  console.log("=== Checking Transaction Status ===\n");
  console.log(`Chainlink address: ${chainlinkAddress}`);
  console.log(`Contract address: ${contractAddress}\n`);
  
  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);
  
  // Check recent transactions
  console.log("\n📋 Checking recent transactions...");
  let foundTxs = 0;
  
  for (let i = currentBlock; i > Math.max(0, currentBlock - 20); i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.from && tx.from.toLowerCase() === chainlinkAddress.toLowerCase()) {
            foundTxs++;
            const receipt = await provider.getTransactionReceipt(txHash);
            console.log(`\n✅ Transaction found in block ${i}:`);
            console.log(`   Hash: ${txHash}`);
            console.log(`   To: ${tx.to}`);
            console.log(`   Status: ${receipt ? (receipt.status === 1 ? "✅ Success" : "❌ Failed") : "⏳ Pending"}`);
            if (receipt && receipt.status === 0) {
              console.log(`   ⚠️  Transaction reverted!`);
            }
          }
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (foundTxs === 0) {
    console.log("❌ No confirmed transactions found in recent blocks");
    console.log("\n💡 This means transactions are stuck in mempool or not being mined.");
  }
  
  // Check pending transactions
  console.log("\n📋 Checking pending transactions...");
  const pendingTxs = await provider.send("eth_getBlockByNumber", ["pending", false]);
  if (pendingTxs && pendingTxs.transactions) {
    const pendingCount = pendingTxs.transactions.length;
    console.log(`   Found ${pendingCount} pending transactions in mempool`);
  }
}

main().catch(console.error);




