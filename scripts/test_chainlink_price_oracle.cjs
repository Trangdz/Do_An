const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🧪 TEST CHAINLINKPRICEORACLE                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Read deployment info
  const deploymentInfo = JSON.parse(
    fs.readFileSync("deployments/chainlink-price-oracle.json", "utf8")
  );
  const oracleAddress = deploymentInfo.chainlinkPriceOracle;

  console.log(`📋 ChainlinkPriceOracle Address: ${oracleAddress}\n`);

  const ChainlinkPriceOracleABI = [
    "function getAssetPrice1e18(address token) external view returns (uint256)",
    "function getPriceFeed(address token) external view returns (address)",
    "function priceFeeds(address token) external view returns (address)"
  ];

  const oracle = new ethers.Contract(oracleAddress, ChainlinkPriceOracleABI, ethers.provider);

  // Read token addresses
  const frontendAddressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(frontendAddressesPath, "utf8");

  const wethMatch = addressesContent.match(/WETHAddress\s*=\s*"([^"]+)"/);
  const daiMatch = addressesContent.match(/DAIAddress\s*=\s*"([^"]+)"/);
  const usdcMatch = addressesContent.match(/USDCAddress\s*=\s*"([^"]+)"/);
  const linkMatch = addressesContent.match(/LINKAddress\s*=\s*"([^"]+)"/);

  const tokens = [
    { symbol: "ETH", address: "0x0000000000000000000000000000000000000000" },
    { symbol: "WETH", address: wethMatch ? wethMatch[1] : null },
    { symbol: "USDC", address: usdcMatch ? usdcMatch[1] : null },
    { symbol: "DAI", address: daiMatch ? daiMatch[1] : null },
    { symbol: "LINK", address: linkMatch ? linkMatch[1] : null }
  ];

  console.log("📊 Testing getAssetPrice1e18() for each token:\n");
  console.log("─".repeat(70));

  for (const token of tokens) {
    if (!token.address) {
      console.log(`⚠️  ${token.symbol}: Token address not found\n`);
      continue;
    }

    try {
      // Check price feed mapping
      const feedAddr = await oracle.getPriceFeed(token.address);
      console.log(`${token.symbol}:`);
      console.log(`   Token: ${token.address}`);
      console.log(`   PriceFeed: ${feedAddr}`);

      if (feedAddr === ethers.ZeroAddress) {
        console.log(`   ⚠️  No price feed mapped\n`);
        continue;
      }

      // Try to get price
      try {
        const price = await oracle.getAssetPrice1e18(token.address);
        const priceUSD = ethers.formatUnits(price, 18);
        console.log(`   ✅ Price: $${parseFloat(priceUSD).toFixed(2)} USD`);
      } catch (error) {
        if (error.message.includes("price too old") || error.message.includes("round not complete")) {
          console.log(`   ⚠️  Price feed exists but data chưa update (chờ Chainlink)`);
        } else if (error.message.includes("no data present") || error.message.includes("NoData")) {
          console.log(`   ⚠️  Aggregator chưa có data (chờ Chainlink update)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      console.log();
    } catch (error) {
      console.log(`${token.symbol}: ❌ ${error.message}\n`);
    }
  }

  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ TEST HOÀN TẤT                                     ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);



