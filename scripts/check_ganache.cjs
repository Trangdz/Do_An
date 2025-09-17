const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Ganache connection...");
  
  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("✅ Connected to network:", network.name, "(Chain ID:", network.chainId.toString() + ")");
    
    // Get block info
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("📦 Current block number:", blockNumber);
    
    // Get accounts
    const accounts = await ethers.getSigners();
    console.log("👥 Available accounts:", accounts.length);
    
    // Check balances
    for (let i = 0; i < Math.min(3, accounts.length); i++) {
      const balance = await ethers.provider.getBalance(accounts[i].address);
      console.log(`💰 Account ${i}: ${accounts[i].address} - ${ethers.formatEther(balance)} ETH`);
    }
    
    // Test transaction
    console.log("\n🧪 Testing transaction...");
    const tx = await accounts[0].sendTransaction({
      to: accounts[1].address,
      value: ethers.parseEther("0.001")
    });
    await tx.wait();
    console.log("✅ Transaction successful:", tx.hash);
    
    console.log("\n🎉 Ganache connection successful!");
    
  } catch (error) {
    console.error("❌ Error connecting to Ganache:", error.message);
    console.log("\n💡 Make sure Ganache is running on http://127.0.0.1:7545");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
