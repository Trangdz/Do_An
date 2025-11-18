const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Initialize RewardAccumulator state for ALL existing supplies
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

  // Get all user addresses
  const userAddresses = [];
  for (let i = 0; i < 10; i++) {
    const addr = getAddress(`User${i}Address`);
    if (addr) userAddresses.push(addr);
  }

  const assets = [
    { address: DAIAddress, symbol: "DAI" },
    { address: WETHAddress, symbol: "WETH" },
    { address: USDCAddress, symbol: "USDC" }
  ].filter(a => a.address);

  console.log("🔧 Initializing RewardAccumulator state for existing supplies");
  console.log("=".repeat(70));
  console.log();

  let initialized = 0;
  let skipped = 0;
  let errors = 0;

  for (const userAddress of userAddresses) {
    for (const asset of assets) {
      try {
        // Check user supply
        const userReserve = await lendingPool.userReserves(userAddress, asset.address);
        const supplyPrincipal = userReserve.supply.principal;
        const borrowPrincipal = userReserve.borrow.principal;
        
        if (supplyPrincipal > 0n) {
          // Check if already initialized
          const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, asset.address);
          
          if (lastUpdateTime === 0n) {
            console.log(`Initializing ${asset.symbol} for ${userAddress.substring(0, 10)}...`);
            console.log(`  Supply: ${ethers.formatEther(supplyPrincipal)} ${asset.symbol}`);
            
            try {
              const initTx = await rewardAccumulator.initializeSupplyBalance(
                userAddress,
                asset.address,
                supplyPrincipal
              );
              await initTx.wait();
              console.log(`  ✅ Initialized!`);
              initialized++;
            } catch (error) {
              console.error(`  ❌ Error:`, error.message);
              errors++;
            }
          } else {
            console.log(`Skipping ${asset.symbol} for ${userAddress.substring(0, 10)}... (already initialized)`);
            skipped++;
          }
        }
        
        if (borrowPrincipal > 0n) {
          const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, asset.address);
          
          if (lastUpdateTime === 0n) {
            console.log(`Initializing borrow ${asset.symbol} for ${userAddress.substring(0, 10)}...`);
            console.log(`  Borrow: ${ethers.formatEther(borrowPrincipal)} ${asset.symbol}`);
            
            try {
              const initTx = await rewardAccumulator.initializeBorrowBalance(
                userAddress,
                asset.address,
                borrowPrincipal
              );
              await initTx.wait();
              console.log(`  ✅ Initialized!`);
              initialized++;
            } catch (error) {
              console.error(`  ❌ Error:`, error.message);
              errors++;
            }
          }
        }
      } catch (error) {
        // Skip errors
      }
    }
  }

  console.log();
  console.log("=".repeat(70));
  console.log("Summary:");
  console.log(`  ✅ Initialized: ${initialized}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log();
  console.log("🎁 Done! Users can now earn rewards on their existing supplies.");
  console.log("   Next supply/withdraw will calculate rewards for time elapsed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






