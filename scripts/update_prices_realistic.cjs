/**
 * 🎯 REALISTIC PRICE UPDATER
 * Fetches REAL prices from CoinGecko API and updates Mock Oracle
 * Makes your Mock Oracle behave like production!
 */

const hre = require("hardhat");
const axios = require("axios");

// Contract addresses (will be loaded from addresses.js if exists)
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
  console.log("⚠️  addresses.js not found, will use manual input");
}

// CoinGecko API (FREE - no API key needed!)
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Mapping: Our tokens → CoinGecko IDs
const TOKEN_TO_COINGECKO = {
  WETH: "ethereum",
  DAI: "dai",
  USDC: "usd-coin",
  LINK: "chainlink"
};

/**
 * Fetch real prices from CoinGecko
 */
async function fetchRealPrices() {
  try {
    const ids = Object.values(TOKEN_TO_COINGECKO).join(",");
    const url = `${COINGECKO_API}?ids=${ids}&vs_currencies=usd`;
    
    console.log("🌐 Fetching real prices from CoinGecko...");
    const response = await axios.get(url);
    const data = response.data;
    
    const prices = {
      WETH: data.ethereum?.usd || 2000,
      DAI: data.dai?.usd || 1,
      USDC: data["usd-coin"]?.usd || 1,
      LINK: data.chainlink?.usd || 15
    };
    
    console.log("✅ Real prices fetched:");
    console.log(`   ETH:  $${prices.WETH.toFixed(2)}`);
    console.log(`   DAI:  $${prices.DAI.toFixed(4)}`);
    console.log(`   USDC: $${prices.USDC.toFixed(4)}`);
    console.log(`   LINK: $${prices.LINK.toFixed(2)}`);
    
    return prices;
  } catch (error) {
    console.error("❌ Error fetching from CoinGecko:", error.message);
    console.log("⚠️  Using fallback prices...");
    
    // Fallback prices
    return {
      WETH: 2000,
      DAI: 1,
      USDC: 1,
      LINK: 15
    };
  }
}

/**
 * Add realistic fluctuation (±0.5% to simulate real market movement)
 */
function addFluctuation(price, maxPercent = 0.5) {
  const fluctuation = (Math.random() - 0.5) * 2 * (maxPercent / 100);
  return price * (1 + fluctuation);
}

/**
 * Update oracle with new prices
 */
async function updateOraclePrices(oracle, tokenAddresses, prices) {
  console.log("\n📝 Updating oracle prices...");
  
  const ethers = hre.ethers;
  const updates = [];
  
  for (const [symbol, address] of Object.entries(tokenAddresses)) {
    if (!address || !prices[symbol]) continue;
    
    // Add small fluctuation to make it more realistic
    const basePrice = prices[symbol];
    const fluctuatedPrice = addFluctuation(basePrice);
    
    // Convert to 1e18 format
    const price1e18 = ethers.parseUnits(fluctuatedPrice.toFixed(18), 18);
    
    console.log(`   ${symbol}: $${fluctuatedPrice.toFixed(6)} (base: $${basePrice.toFixed(2)})`);
    
    try {
      const tx = await oracle.setAssetPrice(address, price1e18);
      await tx.wait();
      updates.push({ symbol, price: fluctuatedPrice });
    } catch (error) {
      console.error(`   ❌ Failed to update ${symbol}:`, error.message);
    }
  }
  
  console.log(`✅ Updated ${updates.length} prices successfully!\n`);
  return updates;
}

/**
 * Main function
 */
async function main() {
  console.log("🎬 REALISTIC PRICE UPDATER");
  console.log("================================================\n");
  
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Updater:", deployer.address);
  
  // Get oracle address
  if (!ORACLE_ADDRESS) {
    console.log("\n❌ Oracle address not found!");
    console.log("Please run deployment script first or provide oracle address.");
    return;
  }
  
  console.log("📍 Oracle:", ORACLE_ADDRESS);
  
  // Connect to oracle
  const oracleABI = [
    "function setAssetPrice(address token, uint256 price) external",
    "function getAssetPrice1e18(address token) external view returns (uint256)"
  ];
  const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleABI, deployer);
  
  // Fetch real prices
  const prices = await fetchRealPrices();
  
  // Update oracle
  await updateOraclePrices(oracle, TOKEN_ADDRESSES, prices);
  
  // Verify updates
  console.log("🔍 Verifying prices in contract...");
  for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
    if (!address) continue;
    try {
      const price = await oracle.getAssetPrice1e18(address);
      const priceUSD = parseFloat(ethers.formatUnits(price, 18));
      console.log(`   ${symbol}: $${priceUSD.toFixed(6)}`);
    } catch (error) {
      console.log(`   ${symbol}: Not set`);
    }
  }
  
  console.log("\n✅ Price update complete!");
  console.log("💡 Tip: Run this script periodically to keep prices realistic");
  console.log("💡 Or use the auto-updater: node scripts/auto_update_prices.cjs");
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { fetchRealPrices, updateOraclePrices, addFluctuation };

