/**
 * 🤖 AUTO PRICE UPDATER
 * Runs in background and updates prices every 30 seconds
 * Makes your Mock Oracle behave like real Chainlink!
 */

const hre = require("hardhat");
const { fetchRealPrices, updateOraclePrices } = require("./update_prices_realistic.cjs");

// Configuration
const UPDATE_INTERVAL = 30000; // 30 seconds (realistic for demo)
const ENABLE_FLUCTUATION = true; // Add random fluctuations

let ORACLE_ADDRESS;
let TOKEN_ADDRESSES;

try {
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  ORACLE_ADDRESS = addresses.PriceOracleAddress;
  TOKEN_ADDRESSES = {
    WETH: addresses.WETHAddress,
    DAI: addresses.DAIAddress,
    USDC: addresses.USDCAddress,
    LINK: addresses.LINKAddress
  };
} catch (e) {
  console.log("⚠️  addresses.js not found");
  process.exit(1);
}

/**
 * Update cycle
 */
async function updateCycle(oracle) {
  try {
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Starting update cycle...`);
    
    // Fetch real prices
    const prices = await fetchRealPrices();
    
    // Update oracle
    await updateOraclePrices(oracle, TOKEN_ADDRESSES, prices);
    
    console.log(`✅ Update complete. Next update in ${UPDATE_INTERVAL / 1000}s...`);
  } catch (error) {
    console.error("❌ Update failed:", error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🤖 AUTO PRICE UPDATER");
  console.log("================================================");
  console.log(`📊 Update interval: ${UPDATE_INTERVAL / 1000} seconds`);
  console.log(`🎲 Fluctuation: ${ENABLE_FLUCTUATION ? "Enabled" : "Disabled"}`);
  console.log("================================================\n");
  
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Updater:", deployer.address);
  console.log("📍 Oracle:", ORACLE_ADDRESS);
  
  // Connect to oracle
  const oracleABI = [
    "function setAssetPrice(address token, uint256 price) external",
    "function getAssetPrice1e18(address token) external view returns (uint256)"
  ];
  const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleABI, deployer);
  
  console.log("\n✅ Connected to oracle");
  console.log("🔄 Starting auto-update loop...");
  console.log("💡 Press Ctrl+C to stop\n");
  
  // Initial update
  await updateCycle(oracle);
  
  // Set up interval
  setInterval(async () => {
    await updateCycle(oracle);
  }, UPDATE_INTERVAL);
  
  // Keep process alive
  process.stdin.resume();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\n🛑 Stopping auto-updater...");
  console.log("✅ Goodbye!");
  process.exit(0);
});

// Run
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

