const hre = require("hardhat");

async function main() {
  const RewardDistributorAddress = "0xA48BDbf65d0A2800f16e493CAb80e8444B9821b6";
  const RewardAccumulatorAddress = "0x57fA393D927f7a4e229B7532F882B49A2F26f8E8";
  const provider = hre.ethers.provider;
  
  console.log("=== Verifying Reward Contracts ===\n");
  
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
      const testAddress = "0x3A716b4DeeA7dcdAAdd42b90BaA30E0A7B2fd412";
      const reward = await contract.getClaimableReward(testAddress);
      console.log(`   ✅ getClaimableReward works: ${hre.ethers.formatEther(reward)} LENDX`);
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
    try {
      const ABI = ['function calculatePendingReward(address user) view returns (uint256)'];
      const contract = new hre.ethers.Contract(RewardAccumulatorAddress, ABI, provider);
      const testAddress = "0x3A716b4DeeA7dcdAAdd42b90BaA30E0A7B2fd412";
      const pending = await contract.calculatePendingReward(testAddress);
      console.log(`   ✅ calculatePendingReward works: ${hre.ethers.formatEther(pending)} LENDX`);
    } catch (e) {
      console.log(`   ⚠️  calculatePendingReward: ${e.message}`);
    }
  }
  
  console.log("\n✅ Verification complete!");
}

main().catch(console.error);





