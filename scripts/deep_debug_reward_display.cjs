const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🔍 DEEP DEBUG: Reward Display Issue\n");
  
  // Load addresses
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  const userAddress = process.env.USER_ADDRESS || addresses.User1Address;
  
  console.log("📋 Configuration:");
  console.log("  User Address:", userAddress);
  console.log("  RewardDistributor:", addresses.RewardDistributorAddress);
  console.log("  RewardAccumulator:", addresses.RewardAccumulatorAddress);
  console.log("  LENDX Token:", addresses.LENDXTokenAddress);
  console.log("  RPC URL:", hre.network.config.url);
  console.log();
  
  // Connect to network
  const provider = new ethers.JsonRpcProvider(hre.network.config.url);
  
  // Check if contracts exist
  console.log("1️⃣ Checking contract existence...");
  const distributorCode = await provider.getCode(addresses.RewardDistributorAddress);
  const accumulatorCode = await provider.getCode(addresses.RewardAccumulatorAddress);
  const lendxCode = await provider.getCode(addresses.LENDXTokenAddress);
  
  console.log("  RewardDistributor code length:", distributorCode.length);
  console.log("  RewardAccumulator code length:", accumulatorCode.length);
  console.log("  LENDX Token code length:", lendxCode.length);
  
  if (distributorCode === "0x" || accumulatorCode === "0x" || lendxCode === "0x") {
    console.log("  ❌ ERROR: One or more contracts are not deployed!");
    return;
  }
  console.log("  ✅ All contracts exist\n");
  
  // Test 1: Direct contract calls (same as frontend)
  console.log("2️⃣ Testing direct contract calls (simulating frontend)...");
  
  const REWARD_DISTRIBUTOR_ABI = [
    'function getClaimableReward(address user) view returns (uint256)',
    'function totalDistributed() view returns (uint256)',
  ];
  
  const REWARD_ACCUMULATOR_ABI = [
    'function calculatePendingReward(address user) view returns (uint256)',
  ];
  
  const LENDX_ABI = [
    'function balanceOf(address account) view returns (uint256)',
  ];
  
  try {
    const distributorContract = new ethers.Contract(
      addresses.RewardDistributorAddress,
      REWARD_DISTRIBUTOR_ABI,
      provider
    );
    
    const accumulatorContract = new ethers.Contract(
      addresses.RewardAccumulatorAddress,
      REWARD_ACCUMULATOR_ABI,
      provider
    );
    
    const lendxContract = new ethers.Contract(
      addresses.LENDXTokenAddress,
      LENDX_ABI,
      provider
    );
    
    console.log("  Calling getClaimableReward...");
    const claimableWei = await distributorContract.getClaimableReward(userAddress);
    const claimable = ethers.formatEther(claimableWei);
    console.log("  ✅ Claimable Reward:", claimable, "LENDX");
    
    console.log("  Calling calculatePendingReward...");
    const pendingWei = await accumulatorContract.calculatePendingReward(userAddress);
    const pending = ethers.formatEther(pendingWei);
    console.log("  ✅ Pending Reward:", pending, "LENDX");
    
    console.log("  Calling balanceOf...");
    const balanceWei = await lendxContract.balanceOf(userAddress);
    const balance = ethers.formatEther(balanceWei);
    console.log("  ✅ LENDX Balance:", balance, "LENDX");
    
    console.log();
    
    // Test 2: Check if provider is working
    console.log("3️⃣ Testing provider connection...");
    const blockNumber = await provider.getBlockNumber();
    const ethBalance = await provider.getBalance(userAddress);
    console.log("  ✅ Current block:", blockNumber);
    console.log("  ✅ User ETH balance:", ethers.formatEther(ethBalance), "ETH");
    console.log();
    
    // Test 3: Check contract state
    console.log("4️⃣ Checking contract state...");
    const totalDistributed = await distributorContract.totalDistributed();
    console.log("  Total Distributed:", ethers.formatEther(totalDistributed), "LENDX");
    console.log();
    
    // Test 4: Simulate frontend hook logic
    console.log("5️⃣ Simulating frontend hook logic...");
    console.log("  Step 1: Check if user address exists");
    if (!userAddress || userAddress === "0x0000000000000000000000000000000000000000") {
      console.log("  ❌ User address is invalid!");
      return;
    }
    console.log("  ✅ User address is valid");
    
    console.log("  Step 2: Check if provider exists");
    if (!provider) {
      console.log("  ❌ Provider is null!");
      return;
    }
    console.log("  ✅ Provider exists");
    
    console.log("  Step 3: Check if RewardDistributor address is valid");
    if (!addresses.RewardDistributorAddress || addresses.RewardDistributorAddress === '0x0000000000000000000000000000000000000000') {
      console.log("  ❌ RewardDistributor address is invalid!");
      return;
    }
    console.log("  ✅ RewardDistributor address is valid");
    
    console.log("  Step 4: Create contract instance");
    const testContract = new ethers.Contract(
      addresses.RewardDistributorAddress,
      REWARD_DISTRIBUTOR_ABI,
      provider
    );
    console.log("  ✅ Contract instance created");
    
    console.log("  Step 5: Call getClaimableReward");
    try {
      const result = await testContract.getClaimableReward(userAddress);
      const formatted = ethers.formatEther(result);
      console.log("  ✅ Result:", formatted, "LENDX");
      console.log("  ✅ Raw value:", result.toString());
    } catch (err) {
      console.log("  ❌ Error calling getClaimableReward:", err.message);
    }
    
    console.log();
    console.log("📊 SUMMARY:");
    console.log("  All contract calls succeeded!");
    console.log("  If frontend still shows 0, the issue is likely:");
    console.log("    1. Provider not set correctly in React context");
    console.log("    2. Hook not being called (component not mounted)");
    console.log("    3. Error being caught and silently set to 0");
    console.log("    4. Addresses not matching between frontend and backend");
    
  } catch (error) {
    console.error("❌ ERROR:", error);
    console.error("Stack:", error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








































