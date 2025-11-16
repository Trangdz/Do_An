const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🧪 TESTING REWARD DISPLAY - Frontend Simulation\n");
  console.log("=" .repeat(60));
  
  // Load addresses
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  const userAddress = process.env.USER_ADDRESS || addresses.User1Address;
  
  // RPC URL (same as frontend CONFIG.RPC_URL)
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:7545";
  
  console.log("\n📋 Configuration:");
  console.log("  User Address:", userAddress);
  console.log("  RPC URL:", rpcUrl);
  console.log("  RewardDistributor:", addresses.RewardDistributorAddress);
  console.log("  RewardAccumulator:", addresses.RewardAccumulatorAddress);
  console.log("  LENDX Token:", addresses.LENDXTokenAddress);
  
  // Connect using RPC provider (same as frontend)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣ Testing RPC Provider Connection");
  console.log("=".repeat(60));
  
  try {
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    console.log("  ✅ Connected to network:", network.name);
    console.log("  ✅ Chain ID:", network.chainId.toString());
    console.log("  ✅ Current block:", blockNumber);
    
    const ethBalance = await provider.getBalance(userAddress);
    console.log("  ✅ User ETH balance:", ethers.formatEther(ethBalance), "ETH");
  } catch (error) {
    console.error("  ❌ Failed to connect:", error.message);
    return;
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("2️⃣ Testing Contract Existence");
  console.log("=".repeat(60));
  
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
  console.log("  ✅ All contracts exist");
  
  console.log("\n" + "=".repeat(60));
  console.log("3️⃣ Simulating Frontend Hook: useLENDXToken");
  console.log("=".repeat(60));
  
  const LENDX_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
  ];
  
  try {
    console.log("  Creating contract instance with RPC provider...");
    const lendxContract = new ethers.Contract(
      addresses.LENDXTokenAddress,
      LENDX_ABI,
      provider // Using RPC provider, not MetaMask
    );
    
    console.log("  Calling balanceOf(", userAddress, ")...");
    const balanceWei = await lendxContract.balanceOf(userAddress);
    const balance = ethers.formatEther(balanceWei);
    
    console.log("  ✅ LENDX Balance:", balance, "LENDX");
    console.log("  ✅ Raw value (wei):", balanceWei.toString());
    
    if (parseFloat(balance) === 0) {
      console.log("  ⚠️  Balance is 0 - user hasn't claimed rewards yet");
    }
  } catch (error) {
    console.error("  ❌ Error:", error.message);
    console.error("  Stack:", error.stack);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("4️⃣ Simulating Frontend Hook: useRewardDistributor (Claimable)");
  console.log("=".repeat(60));
  
  const REWARD_DISTRIBUTOR_ABI = [
    'function getClaimableReward(address user) view returns (uint256)',
    'function totalDistributed() view returns (uint256)',
  ];
  
  try {
    console.log("  Creating contract instance with RPC provider...");
    const distributorContract = new ethers.Contract(
      addresses.RewardDistributorAddress,
      REWARD_DISTRIBUTOR_ABI,
      provider // Using RPC provider, not MetaMask
    );
    
    console.log("  Calling getClaimableReward(", userAddress, ")...");
    const rewardWei = await distributorContract.getClaimableReward(userAddress);
    const reward = ethers.formatEther(rewardWei);
    
    console.log("  ✅ Claimable Reward:", reward, "LENDX");
    console.log("  ✅ Raw value (wei):", rewardWei.toString());
    
    if (parseFloat(reward) === 0) {
      console.log("  ⚠️  No claimable reward - user needs to interact with protocol first");
    } else {
      console.log("  ✅ Reward is available! Frontend should display:", reward, "LENDX");
    }
    
    // Check total distributed
    const totalDistributed = await distributorContract.totalDistributed();
    console.log("  Total Distributed (all users):", ethers.formatEther(totalDistributed), "LENDX");
  } catch (error) {
    console.error("  ❌ Error:", error.message);
    console.error("  Stack:", error.stack);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("5️⃣ Simulating Frontend Hook: useRewardDistributor (Pending)");
  console.log("=".repeat(60));
  
  const REWARD_ACCUMULATOR_ABI = [
    'function calculatePendingReward(address user) view returns (uint256)',
  ];
  
  try {
    console.log("  Creating contract instance with RPC provider...");
    const accumulatorContract = new ethers.Contract(
      addresses.RewardAccumulatorAddress,
      REWARD_ACCUMULATOR_ABI,
      provider // Using RPC provider, not MetaMask
    );
    
    console.log("  Calling calculatePendingReward(", userAddress, ")...");
    const pendingWei = await accumulatorContract.calculatePendingReward(userAddress);
    const pending = ethers.formatEther(pendingWei);
    
    console.log("  ✅ Pending Reward:", pending, "LENDX");
    console.log("  ✅ Raw value (wei):", pendingWei.toString());
    
    if (parseFloat(pending) === 0) {
      console.log("  ⚠️  No pending reward");
    } else {
      console.log("  ✅ Pending reward available! Frontend should display:", pending, "LENDX");
    }
  } catch (error) {
    console.error("  ❌ Error:", error.message);
    console.error("  Stack:", error.stack);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("6️⃣ Checking User's Supply/Borrow Activity");
  console.log("=".repeat(60));
  
  const LENDING_POOL_ABI = [
    'function getUserReserves(address user) view returns (address[] memory)',
    'function userReserves(address user, address asset) view returns (uint128 supplyBalance, uint128 borrowBalance, bool isCollateral)',
  ];
  
  try {
    const poolContract = new ethers.Contract(
      addresses.LendingPoolAddress,
      LENDING_POOL_ABI,
      provider
    );
    
    const userReserves = await poolContract.getUserReserves(userAddress);
    console.log("  User has", userReserves.length, "active reserves");
    
    if (userReserves.length === 0) {
      console.log("  ⚠️  User has NO supply/borrow activity!");
      console.log("  💡 User needs to supply or borrow assets to earn rewards");
    } else {
      console.log("  ✅ User has active positions:");
      for (const asset of userReserves) {
        const userReserve = await poolContract.userReserves(userAddress, asset);
        const supply = ethers.formatEther(userReserve.supplyBalance);
        const borrow = ethers.formatEther(userReserve.borrowBalance);
        console.log("    - Asset:", asset);
        console.log("      Supply:", supply);
        console.log("      Borrow:", borrow);
      }
    }
  } catch (error) {
    console.error("  ❌ Error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(60));
  
  console.log("\n✅ All tests completed!");
  console.log("\n💡 If frontend still shows 0, check:");
  console.log("  1. Browser console for errors");
  console.log("  2. Network tab for failed requests");
  console.log("  3. React DevTools to see if hooks are being called");
  console.log("  4. Verify addresses.js matches deployment addresses");
  console.log("\n🔧 The fix applied:");
  console.log("  - Hooks now use RPC provider directly (not MetaMask)");
  console.log("  - This avoids MetaMask circuit breaker issues");
  console.log("  - Same pattern as other hooks (getUserAssets, etc.)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ FATAL ERROR:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  });








































