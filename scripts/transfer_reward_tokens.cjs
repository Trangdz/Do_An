const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Transfer LENDX tokens to new RewardDistributor
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

  const LENDXTokenAddress = getAddress("LENDXTokenAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");

  const LENDXToken = await hre.ethers.getContractFactory("LENDXToken");
  const lendxToken = LENDXToken.attach(LENDXTokenAddress);

  // Check deployer balance
  const deployerBalance = await lendxToken.balanceOf(deployer.address);
  console.log("Deployer LENDX balance:", ethers.formatEther(deployerBalance), "LENDX");

  // Check distributor balance
  const distributorBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("RewardDistributor LENDX balance:", ethers.formatEther(distributorBalance), "LENDX");

  // Transfer 80M to distributor (or whatever is available)
  const targetAmount = ethers.parseUnits("80000000", 18); // 80M
  const needed = targetAmount - distributorBalance;

  if (needed > 0n) {
    if (deployerBalance >= needed) {
      console.log(`\nTransferring ${ethers.formatEther(needed)} LENDX to RewardDistributor...`);
      const transferTx = await lendxToken.transfer(RewardDistributorAddress, needed);
      await transferTx.wait();
      console.log("✅ Transfer complete!");
    } else {
      console.log(`\n⚠️  Deployer doesn't have enough LENDX.`);
      console.log(`   Needed: ${ethers.formatEther(needed)}`);
      console.log(`   Have: ${ethers.formatEther(deployerBalance)}`);
      console.log("\n💡 Options:");
      console.log("   1. Mint more LENDX tokens (if deployer is minter)");
      console.log("   2. Transfer from old RewardDistributor");
    }
  } else {
    console.log("\n✅ RewardDistributor already has enough tokens!");
  }

  // Final check
  const finalBalance = await lendxToken.balanceOf(RewardDistributorAddress);
  console.log("\nFinal RewardDistributor balance:", ethers.formatEther(finalBalance), "LENDX");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });











