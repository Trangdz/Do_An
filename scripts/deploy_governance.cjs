const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { updateAddresses } = require("./utils/update_addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  let addresses = {};
  
  if (fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    // Extract LENDXTokenAddress from the file
    const lendxMatch = addressesContent.match(/LENDXTokenAddress\s*=\s*"([^"]+)"/);
    if (lendxMatch) {
      addresses.LENDXTokenAddress = lendxMatch[1];
    }
  }

  if (!addresses.LENDXTokenAddress || addresses.LENDXTokenAddress === '0x0000000000000000000000000000000000000000') {
    console.error("❌ LENDXTokenAddress not found. Please deploy LENDX token system first.");
    process.exit(1);
  }

  console.log("\n📋 Found LENDX Token:", addresses.LENDXTokenAddress);

  // Deploy LendHubGovernor
  console.log("\n🚀 Deploying LendHubGovernor...");
  const LendHubGovernor = await ethers.getContractFactory("LendHubGovernor");
  const governor = await LendHubGovernor.deploy(
    addresses.LENDXTokenAddress,
    deployer.address // initial owner
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();

  console.log("✅ LendHubGovernor deployed to:", governorAddress);

  // Update addresses.js safely
  console.log("\n📝 Updating addresses.js...");
  try {
    const result = updateAddresses({ GovernorAddress: governorAddress }, addressesPath);
    console.log("✅ Updated addresses.js");
    if (result.duplicates) {
      console.warn("⚠️  WARNING: Found duplicates:", result.duplicates);
    }
  } catch (error) {
    console.error("❌ Error updating addresses.js:", error.message);
    throw error;
  }

  // Save deployment info
  const deploymentInfo = {
    network: "ganache",
    deployer: deployer.address,
    contracts: {
      governor: governorAddress,
      lendxToken: addresses.LENDXTokenAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../local-governance.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved deployment info to local-governance.json");

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ GOVERNANCE DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 LendHubGovernor: ${governorAddress}`);
  console.log(`📍 LENDX Token:     ${addresses.LENDXTokenAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Next steps:");
  console.log("   1. Update frontend to use Governor contract");
  console.log("   2. Test creating proposals");
  console.log("   3. Test voting on proposals");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

