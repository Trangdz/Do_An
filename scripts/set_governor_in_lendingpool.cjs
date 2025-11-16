const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting Governor in LendingPool with account:", deployer.address);

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  // Extract addresses
  const governorMatch = addressesContent.match(/GovernorAddress\s*=\s*"([^"]+)"/);
  const lendingPoolMatch = addressesContent.match(/LendingPoolAddress\s*=\s*"([^"]+)"/);

  if (!governorMatch || !lendingPoolMatch) {
    console.error("❌ GovernorAddress or LendingPoolAddress not found");
    process.exit(1);
  }

  const governorAddress = governorMatch[1];
  const lendingPoolAddress = lendingPoolMatch[1];

  console.log("\n📋 Found addresses:");
  console.log(`   Governor: ${governorAddress}`);
  console.log(`   LendingPool: ${lendingPoolAddress}`);

  // Try to set Governor in LendingPool
  console.log("\n🔧 Setting Governor in LendingPool...");
  try {
    // Try new ABI first (with setGovernor)
    const LendingPoolABI = [
      "function setGovernor(address _governor) external",
      "function governor() external view returns (address)",
      "function owner() external view returns (address)",
    ];
    const lendingPool = new ethers.Contract(lendingPoolAddress, LendingPoolABI, deployer);
    
    try {
      const currentGovernor = await lendingPool.governor();
      if (currentGovernor.toLowerCase() !== governorAddress.toLowerCase()) {
        const tx = await lendingPool.setGovernor(governorAddress);
        await tx.wait();
        console.log("✅ Governor set in LendingPool:", governorAddress);
      } else {
        console.log("✅ Governor already set in LendingPool");
      }
    } catch (error) {
      // If setGovernor doesn't exist, try to transfer ownership
      console.log("⚠️  setGovernor not available, trying to transfer ownership...");
      const owner = await lendingPool.owner();
      console.log(`   Current owner: ${owner}`);
      console.log(`   Deployer: ${deployer.address}`);
      
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        // Try to transfer ownership to Governor
        try {
          const transferABI = ["function transferOwnership(address newOwner) external"];
          const poolWithTransfer = new ethers.Contract(lendingPoolAddress, transferABI, deployer);
          const tx = await poolWithTransfer.transferOwnership(governorAddress);
          await tx.wait();
          console.log("✅ Ownership transferred to Governor:", governorAddress);
        } catch (err) {
          console.error("❌ Error transferring ownership:", err.message);
          console.log("\n💡 You may need to redeploy LendingPool with the new code that includes setGovernor()");
        }
      } else {
        console.log("⚠️  Deployer is not the owner. Cannot transfer ownership.");
        console.log("💡 You may need to redeploy LendingPool with the new code that includes setGovernor()");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 You may need to redeploy LendingPool with the new code that includes setGovernor()");
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ SETUP COMPLETE                                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

