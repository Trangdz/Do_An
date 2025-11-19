const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Initialize Rewards for Existing Users ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const WETHAddress = getAddress("WETHAddress");
  const DAIAddress = getAddress("DAIAddress");
  const USDCAddress = getAddress("USDCAddress");
  const LINKAddress = getAddress("LINKAddress");
  
  // Get contracts
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);
  
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);
  
  // Get all signers (test accounts)
  const signers = await hre.ethers.getSigners();
  const assets = [
    { name: "WETH", address: WETHAddress },
    { name: "DAI", address: DAIAddress },
    { name: "USDC", address: USDCAddress },
    { name: "LINK", address: LINKAddress },
  ];
  
  console.log("📋 Initializing rewards for users with existing supply...\n");
  
  let initializedCount = 0;
  
  for (let i = 0; i < Math.min(10, signers.length); i++) {
    const user = signers[i];
    const userAddress = await user.getAddress();
    
    console.log(`\n👤 User ${i}: ${userAddress.substring(0, 10)}...`);
    
    for (const asset of assets) {
      try {
        // Check if user has supply
        const userReserve = await lendingPool.userReserves(userAddress, asset.address);
        const supplyPrincipal = userReserve.supply.principal;
        
        if (supplyPrincipal > 0n) {
          // Check if already initialized
          const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, asset.address);
          
          if (lastUpdateTime === 0n) {
            console.log(`   📝 Initializing ${asset.name} supply: ${ethers.formatEther(supplyPrincipal)}`);
            try {
              const tx = await rewardAccumulator.initializeSupplyBalance(
                userAddress,
                asset.address,
                supplyPrincipal
              );
              await tx.wait();
              console.log(`   ✅ Initialized ${asset.name} rewards`);
              initializedCount++;
            } catch (error) {
              console.log(`   ⚠️  Could not initialize ${asset.name}:`, error.message);
            }
          } else {
            console.log(`   ✅ ${asset.name} already initialized`);
          }
        }
      } catch (error) {
        // Ignore errors for assets user doesn't have
      }
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ Initialized ${initializedCount} reward states`);
  console.log("=".repeat(60));
  console.log("\n💡 Now when users make their NEXT transaction, rewards will be calculated!");
  console.log("   Rewards accumulate based on time elapsed since last update.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




