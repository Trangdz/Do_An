const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Ganache connection...\n");
  
  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("✅ Connected to network:");
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Name:", network.name);
    
    // Get signers (ethers v6)
    const signers = await ethers.getSigners();
    console.log("\n✅ Found", signers.length, "signers:");
    
    // Check balances
    for (let i = 0; i < Math.min(5, signers.length); i++) {
      const signer = signers[i];
      const address = await signer.getAddress();
      const balance = await ethers.provider.getBalance(address);
      console.log(`   [${i}] ${address}: ${ethers.formatEther(balance)} ETH`);
    }
    
    // Get block number
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("\n✅ Current block:", blockNumber);
    
    console.log("\n🎉 Ganache is ready for deployment!");
    
  } catch (error) {
    console.error("\n❌ Cannot connect to Ganache:");
    console.error("   Error:", error.message);
    console.error("\n💡 Make sure Ganache is running at http://127.0.0.1:7545");
    console.error("   You can start it with: ganache-cli -p 7545 -i 1337");
    process.exit(1);
  }
}

main().catch(console.error);
