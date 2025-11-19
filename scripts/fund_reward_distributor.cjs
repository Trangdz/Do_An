const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fund RewardDistributor with LENDX tokens for testing
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LENDXTokenAddress = getAddress("LENDXTokenAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");

  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = LENDXToken.attach(LENDXTokenAddress);

  // Check current balances
  const deployerBalance = await lendxToken.balanceOf(deployer.address);
  const distributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  
  console.log("Deployer LENDX balance:", ethers.formatEther(deployerBalance), "LENDX");
  console.log("RewardDistributor LENDX balance:", ethers.formatEther(distributorBalance), "LENDX");
  console.log();

  // Transfer 10M LENDX to distributor (enough for testing)
  const transferAmount = ethers.parseUnits("10000000", 18); // 10M
  
  if (deployerBalance >= transferAmount) {
    console.log(`Transferring ${ethers.formatEther(transferAmount)} LENDX to RewardDistributor...`);
    const transferTx = await lendxToken.transfer(RewardDistributorAddress, transferAmount);
    await transferTx.wait();
    console.log("✅ Transfer complete!");
  } else {
    // Try to mint if deployer is owner
    try {
      const owner = await lendxToken.owner();
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("Deployer is owner. Minting tokens...");
        const mintTx = await lendxToken.mint(RewardDistributorAddress, transferAmount);
        await mintTx.wait();
        console.log("✅ Minted and transferred to RewardDistributor!");
      } else {
        console.log("⚠️  Deployer is not owner. Cannot mint.");
        console.log("   Owner:", owner);
        // Transfer whatever is available
        if (deployerBalance > 0n) {
          const available = deployerBalance / 2n; // Transfer half
          console.log(`Transferring ${ethers.formatEther(available)} LENDX (half of deployer balance)...`);
          const transferTx = await lendxToken.transfer(RewardDistributorAddress, available);
          await transferTx.wait();
          console.log("✅ Transfer complete!");
        }
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  // Final check
  const finalBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("\n✅ Final RewardDistributor balance:", ethers.formatEther(finalBalance), "LENDX");
  console.log("\n🎁 Reward system is ready! Users can now earn and claim rewards.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });









