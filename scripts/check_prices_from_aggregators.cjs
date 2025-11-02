const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n🔍 Checking prices from PriceAggregator contracts...\n");
  
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  const aggregatorABI = [
    'function latestAnswer() external view returns (int256)',
    'function decimals() external view returns (uint8)',
    'function description() external view returns (string)'
  ];
  
  for (const [symbol, address] of Object.entries(aggregators)) {
    try {
      const aggregator = await ethers.getContractAt(aggregatorABI, address);
      const latestAnswer = await aggregator.latestAnswer();
      const decimals = await aggregator.decimals();
      const description = await aggregator.description();
      
      // Convert from int256 (with decimals) to USD price
      const price = Number(latestAnswer) / Math.pow(10, Number(decimals));
      
      console.log(`${symbol.padEnd(6)}: $${price.toFixed(6)} (${description})`);
      console.log(`  Address: ${address}`);
      console.log(`  Raw value: ${latestAnswer.toString()}`);
      console.log(`  Decimals: ${decimals}`);
      
      if (latestAnswer.toString() === "0") {
        console.log(`  ⚠️  WARNING: Price is 0 - Chainlink has not updated yet!\n`);
      } else {
        console.log(`  ✅ Price updated by Chainlink\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error reading ${symbol}: ${error.message}\n`);
    }
  }
  
  // Also check PriceOracle
  console.log("📍 Checking PriceOracle prices...\n");
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  const oracleABI = ['function getAssetPrice1e18(address asset) external view returns (uint256)'];
  const oracle = await ethers.getContractAt(oracleABI, addresses.PriceOracleAddress);
  
  const tokens = {
    WETH: addresses.WETHAddress,
    DAI: addresses.DAIAddress,
    USDC: addresses.USDCAddress,
    LINK: addresses.LINKAddress
  };
  
  for (const [symbol, address] of Object.entries(tokens)) {
    try {
      const price1e18 = await oracle.getAssetPrice1e18(address);
      const price = parseFloat(ethers.formatUnits(price1e18, 18));
      console.log(`${symbol.padEnd(6)}: $${price.toFixed(6)} (from PriceOracle)`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
}

main().catch(console.error);


