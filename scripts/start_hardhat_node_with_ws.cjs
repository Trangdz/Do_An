const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Starting Hardhat node for Chainlink...");
  console.log("   - Host: 0.0.0.0");
  console.log("   - Port: 8545");
  console.log("   - Chain ID: 5777");
  console.log("   - WebSocket: Enabled\n");
  
  // Hardhat node sẽ tự động start với config từ hardhat.config.cjs
  // Nhưng hardhat node không có API để start programmatically
  // Nên chúng ta cần user chạy: npx hardhat node --hostname 0.0.0.0 --port 8545
  
  console.log("⚠️  Hardhat node needs to be started manually:");
  console.log("   npx hardhat node --hostname 0.0.0.0 --port 8545");
  console.log("\n   Or run: START_HARDHAT_FOR_CHAINLINK.bat\n");
}

main().catch(console.error);


