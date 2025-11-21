const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Deploy LENDX Token ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Deploy LENDXToken
  console.log("\n📋 Deploying LENDXToken...");
  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = await LENDXToken.deploy(deployer.address);
  
  console.log("   Transaction hash:", lendxToken.deploymentTransaction().hash);
  console.log("   Waiting for deployment...");
  
  await lendxToken.waitForDeployment();
  const lendxTokenAddress = await lendxToken.getAddress();
  
  console.log("\n✅ LENDXToken deployed!");
  console.log("   Address:", lendxTokenAddress);
  
  // Verify contract
  const code = await hre.ethers.provider.getCode(lendxTokenAddress);
  if (code === '0x' || code === '0x0') {
    console.log("\n❌ ERROR: Contract has no code!");
    process.exit(1);
  }
  
  // Test contract
  console.log("\n📋 Testing contract...");
  try {
    const name = await lendxToken.name();
    const symbol = await lendxToken.symbol();
    const decimals = await lendxToken.decimals();
    const totalSupply = await lendxToken.totalSupply();
    const owner = await lendxToken.owner();
    
    console.log("   ✅ name():", name);
    console.log("   ✅ symbol():", symbol);
    console.log("   ✅ decimals():", decimals);
    console.log("   ✅ totalSupply():", hre.ethers.formatEther(totalSupply), symbol);
    console.log("   ✅ owner():", owner);
    
    // Test balanceOf
    const balance = await lendxToken.balanceOf(deployer.address);
    console.log("   ✅ balanceOf(deployer):", hre.ethers.formatEther(balance), symbol);
    
  } catch (err) {
    console.log("   ❌ Error testing contract:", err.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    lendxToken: lendxTokenAddress,
    deployedAt: new Date().toISOString()
  };
  
  const deploymentFile = path.join(__dirname, "../deployments/lendx-token-system.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentFile);
  
  // Update addresses.js
  console.log("\n📝 Updating addresses.js...");
  const addressesFile = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  if (fs.existsSync(addressesFile)) {
    let addressesContent = fs.readFileSync(addressesFile, "utf8");
    
    // Replace LENDXTokenAddress
    addressesContent = addressesContent.replace(
      /export const LENDXTokenAddress = "0x[a-fA-F0-9]{40}";/,
      `export const LENDXTokenAddress = "${lendxTokenAddress}";`
    );
    
    fs.writeFileSync(addressesFile, addressesContent);
    console.log("   ✅ Updated LENDXTokenAddress in addresses.js");
  } else {
    console.log("   ⚠️  addresses.js not found, skipping update");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nLENDX Token Address:", lendxTokenAddress);
  console.log("\n💡 Next steps:");
  console.log("   1. Restart Next.js frontend to pick up new address");
  console.log("   2. Test balanceOf in frontend");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});






