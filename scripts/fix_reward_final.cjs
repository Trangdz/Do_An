const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Final fix: Transfer ownership from old RewardAccumulator and configure
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("📋 Current addresses:");
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   RewardAccumulator (new):", RewardAccumulatorAddress);
  console.log();

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check current owner
  const currentOwner = await rewardDistributor.owner();
  console.log("Current RewardDistributor owner:", currentOwner);
  console.log();

  // Try to call transferOwnership from old owner (if it's a contract)
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("1️⃣  Trying to transfer ownership from old owner...");
    
    try {
      // Try to call transferOwnership on RewardDistributor from old owner's perspective
      // We'll use a low-level call
      const RewardDistributorInterface = new ethers.Interface([
        "function transferOwnership(address newOwner) external"
      ]);
      
      const data = RewardDistributorInterface.encodeFunctionData("transferOwnership", [deployer.address]);
      
      // We can't directly call from old owner, but we can check if old owner is the old RewardAccumulator
      // and if it has any way to transfer
      
      // Alternative: Check if we can directly set rewardAccumulator using the new authorization
      // But wait, the function still requires onlyOwner...
      
      // Best solution: Use the old RewardAccumulator to set the new one, or transfer ownership
      // Let's try a different approach: check if old contract has any admin functions
      
      console.log("   ⚠️  Cannot automatically transfer from contract owner.");
      console.log("   💡 Solution: Use the old RewardAccumulator address to call setRewardAccumulator");
      console.log("   Or manually call transferOwnership from:", currentOwner);
      console.log();
      
      // Actually, let's try to see if we can use the new authorization in accumulateReward
      // But that won't help with setRewardAccumulator which still needs owner
      
      // Final solution: We need to either:
      // 1. Get old RewardAccumulator to transfer ownership
      // 2. Or update RewardDistributor to allow setting accumulator differently
      // 3. Or just use the old accumulator address and update it
      
      // Let's try option 3: Use old accumulator and update LendingPool to point to new one
      // But RewardDistributor needs to know about new accumulator for authorization
      
      // Actually, the simplest: Update RewardDistributor code to allow setting accumulator
      // But that requires redeploy...
      
      // OR: Check if old accumulator can call setRewardAccumulator
      console.log("   Trying to call setRewardAccumulator from old owner contract...");
      
      // Create a contract instance pointing to old owner
      const OldAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
      try {
        const oldAccumulator = OldAccumulator.attach(currentOwner);
        // Try to call setRewardAccumulator through old accumulator (if it has this function)
        // But old accumulator might not have this function...
        console.log("   Old accumulator contract found, but may not have setRewardAccumulator function");
      } catch (e) {
        console.log("   Old owner is not a RewardAccumulator contract");
      }
      
    } catch (error) {
      console.error("   Error:", error.message);
    }
  }

  // Alternative: Since RewardDistributor.accumulateReward now allows rewardAccumulator to call,
  // we can work around by having LendingPool call the new accumulator, which calls RewardDistributor
  // But RewardDistributor still needs rewardAccumulator to be set for authorization check
  
  // Best solution: Manually set rewardAccumulator using a transaction from the old owner
  // Or update the contract to allow setting without owner check (temporary)
  
  // Let's check if we can at least verify the new accumulator is set in LendingPool
  console.log("\n2️⃣  Verifying LendingPool configuration...");
  try {
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = LendingPool.attach(getAddress("LendingPoolAddress"));
    const poolAccumulator = await lendingPool.rewardAccumulator();
    console.log("   LendingPool.rewardAccumulator:", poolAccumulator);
    
    if (poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()) {
      console.log("   ✅ LendingPool is configured correctly");
    } else {
      console.log("   ⚠️  LendingPool accumulator mismatch");
    }
  } catch (error) {
    console.error("   Error:", error.message);
  }

  console.log("\n3️⃣  Manual fix required:");
  console.log("   To complete the setup, you need to:");
  console.log("   1. Call RewardDistributor.setRewardAccumulator(newAddress) from owner:", currentOwner);
  console.log("   2. Or transfer ownership of RewardDistributor to deployer first");
  console.log("\n   You can do this via:");
  console.log("   - MetaMask: Connect with old owner account and call setRewardAccumulator");
  console.log("   - Or use a script that signs with old owner's private key");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });











