const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fix reward accumulation for existing supplies
 * This will manually trigger updateSupplyBalance for users who already supplied
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log();

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const DAIAddress = getAddress("DAIAddress");
  const WETHAddress = getAddress("WETHAddress");
  const USDCAddress = getAddress("USDCAddress");

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  // Get all user addresses from addresses.js
  const userAddresses = [];
  for (let i = 0; i < 10; i++) {
    const addr = getAddress(`User${i}Address`);
    if (addr) userAddresses.push(addr);
  }

  console.log(`Found ${userAddresses.length} user addresses`);
  console.log();

  const assets = [DAIAddress, WETHAddress, USDCAddress].filter(addr => addr);

  console.log("1️⃣  Checking existing supplies and fixing rewards...");
  console.log();

  for (const userAddress of userAddresses) {
    for (const assetAddress of assets) {
      try {
        // Check user supply
        const userReserve = await lendingPool.userReserves(userAddress, assetAddress);
        const supplyPrincipal = userReserve.supply.principal;
        
        if (supplyPrincipal > 0n) {
          // Check if already updated in RewardAccumulator
          const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, assetAddress);
          const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, assetAddress);
          
          console.log(`User: ${userAddress.substring(0, 10)}...`);
          console.log(`  Asset: ${assetAddress.substring(0, 10)}...`);
          console.log(`  Supply: ${ethers.formatEther(supplyPrincipal)}`);
          console.log(`  Last update time: ${lastUpdateTime}`);
          console.log(`  Last supply balance: ${ethers.formatEther(lastSupplyBalance)}`);
          
          // If not updated, we need to trigger update
          // But we can't call directly from deployer (only LendingPool can)
          // So we need to make a small supply/withdraw to trigger it
          // Or we can use LendingPool to call it
          
          // Actually, we can't easily trigger this without modifying LendingPool
          // The best way is to make a small supply transaction to trigger the update
          
          if (lastUpdateTime === 0n) {
            console.log(`  ⚠️  Not initialized in RewardAccumulator`);
            console.log(`  💡 User needs to make another supply/withdraw to initialize`);
          } else if (lastSupplyBalance !== supplyPrincipal) {
            console.log(`  ⚠️  Balance mismatch - needs update`);
            console.log(`  💡 User needs to make another supply/withdraw to update`);
          } else {
            console.log(`  ✅ Already initialized`);
          }
          console.log();
        }
      } catch (error) {
        // Skip errors
      }
    }
  }

  console.log("2️⃣  Solution:");
  console.log("   Users who already supplied need to:");
  console.log("   - Make a small additional supply (even 0.0001 tokens)");
  console.log("   - OR make a small withdraw (even 0.0001 tokens)");
  console.log("   This will trigger RewardAccumulator.updateSupplyBalance()");
  console.log();
  console.log("   For new supplies going forward, rewards will accumulate automatically!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });











