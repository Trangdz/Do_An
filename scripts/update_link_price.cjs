const hre = require("hardhat");
const fs = require("fs");

/**
 * Script to update LINK price in MultiPriceAggregator for liquidation demo
 * 
 * Usage (Bash/Linux/Mac):
 *   LINK_PRICE=10.50 npx hardhat run scripts/update_link_price.cjs --network ganache
 * 
 * Usage (PowerShell/Windows):
 *   $env:LINK_PRICE="10.50"; npx hardhat run scripts/update_link_price.cjs --network ganache
 * 
 * Usage (with command line argument):
 *   npx hardhat run scripts/update_link_price.cjs --network ganache --price 10.50
 * 
 * Default price: $15.00
 */
async function main() {
  // Get LINK price from command line argument, environment variable, or use default
  let linkPriceUSD = 15.00;
  
  // Check for --price argument first
  const args = process.argv.slice(2);
  const priceIndex = args.findIndex(arg => arg === '--price' || arg.startsWith('--price='));
  if (priceIndex !== -1) {
    const priceArg = args[priceIndex];
    if (priceArg.includes('=')) {
      linkPriceUSD = parseFloat(priceArg.split('=')[1]);
    } else if (args[priceIndex + 1]) {
      linkPriceUSD = parseFloat(args[priceIndex + 1]);
    }
  } else if (process.env.LINK_PRICE) {
    // Fallback to environment variable
    linkPriceUSD = parseFloat(process.env.LINK_PRICE);
  }
  
  if (isNaN(linkPriceUSD) || linkPriceUSD <= 0) {
    console.error("❌ Invalid price. Please provide a valid positive number.");
    console.error("   Example: npx hardhat run scripts/update_link_price.cjs --network ganache --price 10.50");
    process.exit(1);
  }
  
  // Read deployment address
  let aggregatorAddress;
  try {
    const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
    aggregatorAddress = data.contracts.multiPriceAggregator;
  } catch (e) {
    try {
      const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
      aggregatorAddress = data.aggregator;
    } catch (e2) {
      console.error("❌ Could not find MultiPriceAggregator address in deployments");
      console.error("   Make sure you've deployed the contract first");
      process.exit(1);
    }
  }

  console.log("=== Update LINK Price for Liquidation Demo ===\n");
  console.log("Contract Address:", aggregatorAddress);
  console.log("Target LINK Price: $" + linkPriceUSD.toFixed(2));
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("");

  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);

  // Check current writer
  const writer = await aggregator.writer();
  console.log("Current writer:", writer);
  console.log("Deployer address:", deployer.address);
  console.log("");

  // If deployer is not the writer, we need to set it temporarily
  let needsWriterChange = false;
  if (writer.toLowerCase() !== deployer.address.toLowerCase() && writer !== "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Deployer is not the writer. Setting deployer as writer temporarily...");
    const tx = await aggregator.setWriter(deployer.address, true);
    await tx.wait();
    console.log("✅ Writer set to deployer");
    needsWriterChange = true;
  } else if (writer === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  No writer set. Setting deployer as writer...");
    const tx = await aggregator.setWriter(deployer.address, true);
    await tx.wait();
    console.log("✅ Writer set to deployer");
  }

  // Convert price to 8 decimals (e.g., $15.00 = 1500000000)
  const price8dec = BigInt(Math.floor(linkPriceUSD * 1e8));

  console.log("\n📊 Updating LINK price:");
  console.log("─".repeat(50));

  try {
    console.log(`\nUpdating LINK to $${linkPriceUSD.toFixed(2)}...`);
    
    const tx = await aggregator.updatePrice("LINK", price8dec);
    console.log(`  Transaction: ${tx.hash}`);
    await tx.wait();
    
    // Verify the update
    const [updatedPrice, roundId, updatedAt] = await aggregator.getPrice("LINK");
    const verifiedPrice = Number(updatedPrice) / 1e8;
    const updatedAtDate = new Date(Number(updatedAt) * 1000);
    console.log(`  ✅ LINK: $${verifiedPrice.toFixed(2)} (Round ${roundId})`);
    console.log(`  📅 Updated at: ${updatedAtDate.toLocaleString()}`);
    
    // Also check current price via getAssetPrice1e18 (what LendingPool uses)
    try {
      const { LINKAddress } = require("../lendhub-frontend-nextjs/src/addresses.js");
      const price1e18 = await aggregator.getAssetPrice1e18(LINKAddress);
      const priceFromOracle = Number(hre.ethers.formatUnits(price1e18, 18));
      console.log(`  🔍 Price via getAssetPrice1e18: $${priceFromOracle.toFixed(2)}`);
    } catch (e) {
      console.log(`  ⚠️  Could not verify via getAssetPrice1e18: ${e.message}`);
    }
  } catch (error) {
    console.error(`  ❌ Error updating LINK:`, error.message);
    if (error.message.includes("Not authorized")) {
      console.error("     Make sure deployer is set as writer");
    }
    process.exit(1);
  }

  // Restore original writer if we changed it
  if (needsWriterChange && writer !== "0x0000000000000000000000000000000000000000") {
    console.log("\n⚠️  Restoring original writer...");
    const restoreTx = await aggregator.setWriter(writer, true);
    await restoreTx.wait();
    console.log("✅ Original writer restored:", writer);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ LINK price update complete!");
  console.log("\n💡 Note: This price is used for liquidation calculations.");
  console.log("   To change price again, run:");
  console.log(`   npx hardhat run scripts/update_link_price.cjs --network ganache --price <new_price>`);
  console.log("\n📝 Example for liquidation demo:");
  console.log("   # Drop LINK price to trigger liquidation:");
  console.log("   npx hardhat run scripts/update_link_price.cjs --network ganache --price 5.00");
  console.log("   # Restore normal price:");
  console.log("   npx hardhat run scripts/update_link_price.cjs --network ganache --price 15.00");
  console.log("\n💻 Alternative (PowerShell):");
  console.log("   $env:LINK_PRICE=\"5.00\"; npx hardhat run scripts/update_link_price.cjs --network ganache");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

