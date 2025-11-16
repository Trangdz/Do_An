const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Configure RewardDistributor by calling from old RewardAccumulator
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
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress"); // New one

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check current owner and rewardAccumulator
  const currentOwner = await rewardDistributor.owner();
  const currentAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("Current RewardDistributor owner:", currentOwner);
  console.log("Current RewardDistributor.rewardAccumulator:", currentAccumulator);
  console.log("New RewardAccumulator address:", RewardAccumulatorAddress);
  console.log();

  // If current accumulator is set and matches old owner, we can call from it
  if (currentAccumulator && currentAccumulator !== "0x0000000000000000000000000000000000000000") {
    console.log("✅ Current rewardAccumulator is set. Can update from it.");
    console.log("   But we need to call from that address...");
    console.log("   💡 Since we updated the contract to allow current accumulator to set new one,");
    console.log("   we can impersonate the old accumulator account if we have access.");
    console.log();
    
    // Try to impersonate (if on local network)
    if (hre.network.name === "ganache" || hre.network.name === "localhost") {
      console.log("   Attempting to impersonate old accumulator...");
      try {
        // Impersonate the old accumulator
        await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [currentAccumulator],
        });
        
        // Get signer for impersonated account
        const impersonatedSigner = await ethers.getSigner(currentAccumulator);
        
        // Fund the account if needed (for gas)
        await deployer.sendTransaction({
          to: currentAccumulator,
          value: ethers.parseEther("1.0"),
        });
        
        // Now call setRewardAccumulator from impersonated account
        const rewardDistributorWithImpersonated = rewardDistributor.connect(impersonatedSigner);
        console.log("   Calling setRewardAccumulator from old accumulator...");
        const setTx = await rewardDistributorWithImpersonated.setRewardAccumulator(RewardAccumulatorAddress);
        await setTx.wait();
        console.log("   ✅ RewardAccumulator updated!");
        
        // Verify
        const newAccumulator = await rewardDistributor.rewardAccumulator();
        console.log("   New rewardAccumulator:", newAccumulator);
        
        if (newAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()) {
          console.log("\n   ✅ Successfully configured!");
        }
        
      } catch (error) {
        console.error("   ❌ Error:", error.message);
        console.log("\n   💡 Alternative: You may need to manually call from old accumulator address");
      }
    } else {
      console.log("   ⚠️  Not on local network. Cannot impersonate.");
      console.log("   💡 You need to call setRewardAccumulator from:", currentAccumulator);
    }
  } else {
    console.log("⚠️  No current rewardAccumulator set.");
    console.log("   Need to set from owner:", currentOwner);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


