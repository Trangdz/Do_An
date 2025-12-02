const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Deploy Reward System ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Load LENDX token address
  let lendxTokenAddress;
  try {
    const lendxSystem = JSON.parse(fs.readFileSync("./deployments/lendx-token-system.json", "utf8"));
    lendxTokenAddress = lendxSystem.lendxToken;
    console.log("\n📋 Found LENDX Token:", lendxTokenAddress);
  } catch (e) {
    console.error("❌ Could not find LENDX token deployment.");
    console.error("   Please deploy LENDX token first:");
    console.error("   npx hardhat run scripts/deploy_lendx_simple.cjs --network ganache");
    process.exit(1);
  }
  
  // Verify LENDX token exists
  const lendxCode = await hre.ethers.provider.getCode(lendxTokenAddress);
  if (lendxCode === '0x' || lendxCode === '0x0') {
    console.error("❌ LENDX token contract not deployed at:", lendxTokenAddress);
    process.exit(1);
  }
  
  // 1. Deploy RewardDistributor
  console.log("\n📋 Deploying RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(lendxTokenAddress, deployer.address);
  
  console.log("   Transaction hash:", rewardDistributor.deploymentTransaction().hash);
  console.log("   Waiting for deployment...");
  
  await rewardDistributor.waitForDeployment();
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  
  console.log("\n✅ RewardDistributor deployed!");
  console.log("   Address:", rewardDistributorAddress);
  
  // Verify contract
  const distributorCode = await hre.ethers.provider.getCode(rewardDistributorAddress);
  if (distributorCode === '0x' || distributorCode === '0x0') {
    console.log("\n❌ ERROR: RewardDistributor has no code!");
    process.exit(1);
  }
  
  // Test contract
  console.log("\n📋 Testing RewardDistributor...");
  try {
    const totalDistributed = await rewardDistributor.totalDistributed();
    const claimableReward = await rewardDistributor.getClaimableReward(deployer.address);
    console.log("   ✅ totalDistributed():", hre.ethers.formatEther(totalDistributed), "LENDX");
    console.log("   ✅ getClaimableReward(deployer):", hre.ethers.formatEther(claimableReward), "LENDX");
  } catch (err) {
    console.log("   ❌ Error testing contract:", err.message);
  }
  
  // 2. Deploy RewardAccumulator
  console.log("\n📋 Deploying RewardAccumulator...");
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = await RewardAccumulator.deploy(rewardDistributorAddress, deployer.address);
  
  console.log("   Transaction hash:", rewardAccumulator.deploymentTransaction().hash);
  console.log("   Waiting for deployment...");
  
  await rewardAccumulator.waitForDeployment();
  const rewardAccumulatorAddress = await rewardAccumulator.getAddress();
  
  console.log("\n✅ RewardAccumulator deployed!");
  console.log("   Address:", rewardAccumulatorAddress);
  
  // Verify contract
  const accumulatorCode = await hre.ethers.provider.getCode(rewardAccumulatorAddress);
  if (accumulatorCode === '0x' || accumulatorCode === '0x0') {
    console.log("\n❌ ERROR: RewardAccumulator has no code!");
    process.exit(1);
  }
  
  // Test contract
  console.log("\n📋 Testing RewardAccumulator...");
  try {
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
    console.log("   ✅ supplyRewardRatePerTokenPerSecond():", supplyRate.toString());
    console.log("   ✅ borrowRewardRatePerTokenPerSecond():", borrowRate.toString());
  } catch (err) {
    console.log("   ❌ Error testing contract:", err.message);
  }
  
  // 3. Configure RewardDistributor to allow RewardAccumulator
  console.log("\n📋 Configuring RewardDistributor...");
  try {
    const setAccumulatorTx = await rewardDistributor.setRewardAccumulator(rewardAccumulatorAddress);
    await setAccumulatorTx.wait();
    console.log("   ✅ Set RewardAccumulator in RewardDistributor");
  } catch (err) {
    console.log("   ⚠️  Could not set RewardAccumulator:", err.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    lendxToken: lendxTokenAddress,
    rewardDistributor: rewardDistributorAddress,
    rewardAccumulator: rewardAccumulatorAddress,
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
    
    // Replace RewardDistributorAddress
    addressesContent = addressesContent.replace(
      /export const RewardDistributorAddress = "0x[a-fA-F0-9]{40}";/,
      `export const RewardDistributorAddress = "${rewardDistributorAddress}";`
    );
    
    // Replace RewardAccumulatorAddress
    addressesContent = addressesContent.replace(
      /export const RewardAccumulatorAddress = "0x[a-fA-F0-9]{40}";/,
      `export const RewardAccumulatorAddress = "${rewardAccumulatorAddress}";`
    );
    
    fs.writeFileSync(addressesFile, addressesContent);
    console.log("   ✅ Updated RewardDistributorAddress and RewardAccumulatorAddress in addresses.js");
  } else {
    console.log("   ⚠️  addresses.js not found, skipping update");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nRewardDistributor Address:", rewardDistributorAddress);
  console.log("RewardAccumulator Address:", rewardAccumulatorAddress);
  console.log("\n💡 Next steps:");
  console.log("   1. Restart Next.js frontend to pick up new addresses");
  console.log("   2. Test getClaimableReward in frontend");
  console.log("   3. (Optional) Configure LendingPool to use RewardAccumulator");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});












