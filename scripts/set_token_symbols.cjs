const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Read addresses
  const multiPriceData = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const localChainlinkData = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  
  const aggregatorAddress = multiPriceData.aggregator;
  const wethAddress = localChainlinkData.tokens.weth;
  const daiAddress = localChainlinkData.tokens.dai;
  const usdcAddress = localChainlinkData.tokens.usdc;
  const linkAddress = localChainlinkData.tokens.link;
  
  console.log("=== Setting Token Symbols in MultiPriceAggregator ===\n");
  console.log("Contract:", aggregatorAddress);
  console.log("");
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const [deployer] = await hre.ethers.getSigners();
  
  const tokens = [wethAddress, daiAddress, usdcAddress, linkAddress];
  const symbols = ["WETH", "DAI", "USDC", "LINK"];
  
  console.log("Setting token symbols:");
  for (let i = 0; i < tokens.length; i++) {
    try {
      // Check if already set
      const existingSymbol = await aggregator.tokenSymbols(tokens[i]);
      if (existingSymbol && existingSymbol !== "") {
        console.log(`  ${symbols[i].padEnd(6)} (${tokens[i]}): Already set to "${existingSymbol}"`);
      } else {
        const tx = await aggregator.connect(deployer).setTokenSymbol(tokens[i], symbols[i]);
        await tx.wait();
        console.log(`  ${symbols[i].padEnd(6)} (${tokens[i]}): ✅ Set to "${symbols[i]}"`);
      }
    } catch (error) {
      console.log(`  ${symbols[i].padEnd(6)} (${tokens[i]}): ❌ ERROR - ${error.message}`);
    }
  }
  
  console.log("\n✅ Token symbols configured!");
  console.log("\n💡 Now Chainlink jobs can update prices for these tokens");
}

main().catch(console.error);










