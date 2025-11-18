const hre = require("hardhat");

async function main() {
  const RewardDistributorAddress = "0x134AD6FBd05b5d92b71f7e48D77de2567cc096C0";
  const RewardAccumulatorAddress = "0xC19bA1b723323cC3E0E270E42592AF0Ead13f661";
  const provider = hre.ethers.provider;
  
  console.log("=== Checking Reward Contracts ===\n");
  
  // Check RewardDistributor
  console.log("📋 RewardDistributor:");
  console.log(`   Address: ${RewardDistributorAddress}`);
  const distributorCode = await provider.getCode(RewardDistributorAddress);
  console.log(`   Has code: ${distributorCode !== '0x' && distributorCode !== '0x0'}`);
  
  if (distributorCode === '0x' || distributorCode === '0x0') {
    console.log("   ❌ NOT DEPLOYED!");
  } else {
    console.log("   ✅ Deployed");
    // Try to call getClaimableReward
    try {
      const ABI = ['function getClaimableReward(address user) view returns (uint256)'];
      const contract = new hre.ethers.Contract(RewardDistributorAddress, ABI, provider);
      const reward = await contract.getClaimableReward("0x0000000000000000000000000000000000000000");
      console.log(`   ✅ getClaimableReward works: ${hre.ethers.formatEther(reward)}`);
    } catch (e) {
      console.log(`   ❌ getClaimableReward failed: ${e.message}`);
    }
  }
  
  // Check RewardAccumulator
  console.log("\n📋 RewardAccumulator:");
  console.log(`   Address: ${RewardAccumulatorAddress}`);
  const accumulatorCode = await provider.getCode(RewardAccumulatorAddress);
  console.log(`   Has code: ${accumulatorCode !== '0x' && accumulatorCode !== '0x0'}`);
  
  if (accumulatorCode === '0x' || accumulatorCode === '0x0') {
    console.log("   ❌ NOT DEPLOYED!");
  } else {
    console.log("   ✅ Deployed");
  }
}

main().catch(console.error);



