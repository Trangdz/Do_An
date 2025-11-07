const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment address
  const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const aggregatorAddress = data.aggregator;
  
  console.log("=== MultiPriceAggregator Status ===\n");
  console.log("Contract Address:", aggregatorAddress);
  console.log("");
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  
  // Check writer
  const writer = await aggregator.writer();
  console.log("Writer (Chainlink Node):", writer);
  if (writer === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  WARNING: Writer is not set! Chainlink jobs cannot update prices.");
    console.log("   Run: npx hardhat run scripts/set_multi_writer.cjs --network ganache");
  } else {
    console.log("✅ Writer is set");
  }
  console.log("");
  
  // Check token symbols - read from local-chainlink.json
  console.log("Token Symbols Mapping:");
  let tokens = [];
  try {
    const localData = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
    tokens = [
      { name: "WETH", address: localData.tokens.weth },
      { name: "DAI", address: localData.tokens.dai },
      { name: "USDC", address: localData.tokens.usdc },
      { name: "LINK", address: localData.tokens.link }
    ];
  } catch (e) {
    console.log("⚠️  Could not read local-chainlink.json, using default addresses");
    tokens = [
      { name: "WETH", address: "0x0cc74b3941219eD38A77357febB1606Aca4a0A9C" },
      { name: "DAI", address: "0x0bfD294D1A9D8e63eb6ecf78d1828bcfFF02A693" },
      { name: "USDC", address: "0x6E114e127F460350C5f32d77E1A3e64C3aD2ABcc" },
      { name: "LINK", address: "0x836846D1793124AF06bc50b8Fc23Aac44D8BC4b3" }
    ];
  }
  
  for (const token of tokens) {
    try {
      const symbol = await aggregator.tokenSymbols(token.address);
      const symbolBytes = hre.ethers.toUtf8Bytes(symbol);
      if (symbolBytes.length > 0 && symbol !== "") {
        console.log(`  ${token.name.padEnd(6)} (${token.address}): ${symbol}`);
      } else {
        console.log(`  ${token.name.padEnd(6)} (${token.address}): ❌ NOT SET`);
      }
    } catch (error) {
      console.log(`  ${token.name.padEnd(6)} (${token.address}): ❌ ERROR - ${error.message}`);
    }
  }
  console.log("");
  
  // Check prices
  console.log("Prices:");
  const symbols = ["ETH", "WETH", "USDC", "DAI", "LINK"];
  
  for (const symbol of symbols) {
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice(symbol);
      const priceNum = Number(price);
      
      if (roundId > 0 && priceNum > 0) {
        const priceUSD = priceNum / 1e8;
        const date = new Date(Number(updatedAt) * 1000);
        const age = Math.floor((Date.now() - Number(updatedAt) * 1000) / 1000);
        console.log(`  ${symbol.padEnd(6)}: $${priceUSD.toFixed(2)} (Round ${roundId}, Updated: ${date.toLocaleTimeString()}, Age: ${age}s)`);
      } else {
        console.log(`  ${symbol.padEnd(6)}: ❌ No data yet (roundId: ${roundId})`);
      }
    } catch (error) {
      console.log(`  ${symbol.padEnd(6)}: ❌ ERROR - ${error.message}`);
    }
  }
  console.log("");
  
  // Check symbol count
  const symbolCount = await aggregator.getSymbolCount();
  console.log(`Total symbols tracked: ${symbolCount}`);
  
  // Recommendations
  console.log("\n=== Recommendations ===");
  if (writer === "0x0000000000000000000000000000000000000000") {
    console.log("1. Set writer for MultiPriceAggregator:");
    console.log("   npx hardhat run scripts/set_multi_writer.cjs --network ganache");
  }
  
  let hasNoData = false;
  for (const symbol of symbols) {
    try {
      const [price, roundId] = await aggregator.getPrice(symbol);
      if (roundId === 0 || Number(price) === 0) {
        hasNoData = true;
        break;
      }
    } catch (e) {
      hasNoData = true;
      break;
    }
  }
  
  if (hasNoData) {
    console.log("2. Check Chainlink node is running:");
    console.log("   docker compose ps");
    console.log("3. Check Chainlink jobs are created and running:");
    console.log("   Open http://localhost:6688 and check Jobs section");
    console.log("4. Verify job addresses match MultiPriceAggregator address");
  }
}

main().catch(console.error);

