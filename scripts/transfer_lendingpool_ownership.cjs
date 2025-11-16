const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Transferring LendingPool ownership to Governor...");
  console.log("Deployer:", deployer.address);

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const governorMatch = addressesContent.match(/GovernorAddress\s*=\s*"([^"]+)"/);
  const lendingPoolMatch = addressesContent.match(/LendingPoolAddress\s*=\s*"([^"]+)"/);

  if (!governorMatch || !lendingPoolMatch) {
    console.error("❌ Addresses not found");
    process.exit(1);
  }

  const governorAddress = governorMatch[1];
  const lendingPoolAddress = lendingPoolMatch[1];

  console.log("\n📋 Addresses:");
  console.log(`   LendingPool: ${lendingPoolAddress}`);
  console.log(`   Governor: ${governorAddress}`);

  // Try to transfer ownership
  console.log("\n🔧 Transferring ownership...");
  try {
    const LendingPoolABI = [
      "function owner() external view returns (address)",
      "function transferOwnership(address newOwner) external",
    ];
    const lendingPool = new ethers.Contract(lendingPoolAddress, LendingPoolABI, deployer);
    
    const currentOwner = await lendingPool.owner();
    console.log(`   Current owner: ${currentOwner}`);
    console.log(`   Deployer: ${deployer.address}`);
    
    if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
      const tx = await lendingPool.transferOwnership(governorAddress);
      await tx.wait();
      console.log("✅ Ownership transferred to Governor:", governorAddress);
    } else {
      console.log("⚠️  Deployer is not the owner. Cannot transfer.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 LendingPool may not have transferOwnership function yet.");
    console.log("   You may need to redeploy LendingPool with the new code.");
  }

  console.log("\n✅ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

