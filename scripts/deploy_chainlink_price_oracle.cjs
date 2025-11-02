const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🚀 DEPLOY CHAINLINKPRICEORACLE & MAP WITH PRICEAGGREGATORS    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📦 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // 1. Deploy ChainlinkPriceOracle
  console.log("1️⃣  Deploying ChainlinkPriceOracle...");
  console.log("─".repeat(70));
  
  const ChainlinkPriceOracleFactory = await ethers.getContractFactory("ChainlinkPriceOracle");
  const chainlinkOracle = await ChainlinkPriceOracleFactory.deploy();
  await chainlinkOracle.waitForDeployment();
  const oracleAddress = await chainlinkOracle.getAddress();
  console.log(`✅ ChainlinkPriceOracle deployed: ${oracleAddress}\n`);

  // 2. Read aggregators and token addresses
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  // Read token addresses from addresses.js
  const frontendAddressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(frontendAddressesPath, "utf8");
  
  const wethMatch = addressesContent.match(/WETHAddress\s*=\s*"([^"]+)"/);
  const daiMatch = addressesContent.match(/DAIAddress\s*=\s*"([^"]+)"/);
  const usdcMatch = addressesContent.match(/USDCAddress\s*=\s*"([^"]+)"/);
  const linkMatch = addressesContent.match(/LINKAddress\s*=\s*"([^"]+)"/);
  
  const tokenAddresses = {
    WETH: wethMatch ? wethMatch[1] : null,
    DAI: daiMatch ? daiMatch[1] : null,
    USDC: usdcMatch ? usdcMatch[1] : null,
    LINK: linkMatch ? linkMatch[1] : null,
    ETH: "0x0000000000000000000000000000000000000000" // Native ETH
  };

  // 3. Map tokens to aggregators
  console.log("2️⃣  Mapping tokens to PriceAggregators...");
  console.log("─".repeat(70));
  
  const mappings = [
    { token: "ETH", tokenAddr: tokenAddresses.ETH, aggregator: aggregators.ETH },
    { token: "WETH", tokenAddr: tokenAddresses.WETH, aggregator: aggregators.WETH },
    { token: "USDC", tokenAddr: tokenAddresses.USDC, aggregator: aggregators.USDC },
    { token: "DAI", tokenAddr: tokenAddresses.DAI, aggregator: aggregators.DAI },
    { token: "LINK", tokenAddr: tokenAddresses.LINK, aggregator: aggregators.LINK }
  ];

  for (const mapping of mappings) {
    if (!mapping.tokenAddr || !mapping.aggregator) {
      console.log(`⚠️  ${mapping.token}: Missing address, skipping`);
      continue;
    }

    try {
      const tx = await chainlinkOracle.setPriceFeed(mapping.tokenAddr, mapping.aggregator);
      await tx.wait();
      console.log(`✅ ${mapping.token.padEnd(6)} → ${mapping.aggregator}`);
    } catch (error) {
      console.log(`❌ ${mapping.token}: ${error.message}`);
    }
  }

  // 4. Verify mappings
  console.log("\n3️⃣  Verifying mappings...");
  console.log("─".repeat(70));
  
  for (const mapping of mappings) {
    if (!mapping.tokenAddr || !mapping.aggregator) continue;
    
    try {
      const feedAddr = await chainlinkOracle.getPriceFeed(mapping.tokenAddr);
      if (feedAddr.toLowerCase() === mapping.aggregator.toLowerCase()) {
        console.log(`✅ ${mapping.token}: ${feedAddr}`);
      } else {
        console.log(`⚠️  ${mapping.token}: Expected ${mapping.aggregator}, got ${feedAddr}`);
      }
    } catch (error) {
      console.log(`❌ ${mapping.token}: ${error.message}`);
    }
  }

  // 5. Test getAssetPrice1e18
  console.log("\n4️⃣  Testing getAssetPrice1e18()...");
  console.log("─".repeat(70));
  
  for (const mapping of mappings) {
    if (!mapping.tokenAddr || !mapping.aggregator) continue;
    
    try {
      // Check if aggregator has data first
      const AggregatorABI = ["function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"];
      const aggregator = new ethers.Contract(mapping.aggregator, AggregatorABI, ethers.provider);
      
      try {
        const [roundId, answer] = await aggregator.latestRoundData();
        if (roundId === 0n) {
          console.log(`⚠️  ${mapping.token}: Aggregator chưa có data (chờ Chainlink update)`);
          continue;
        }
        
        // Try to get price from ChainlinkPriceOracle
        const price = await chainlinkOracle.getAssetPrice1e18(mapping.tokenAddr);
        const priceFormatted = ethers.formatUnits(price, 18);
        console.log(`✅ ${mapping.token}: ${priceFormatted} USD (from ChainlinkPriceOracle)`);
      } catch (aggError) {
        console.log(`⚠️  ${mapping.token}: Aggregator chưa có data (chờ Chainlink update)`);
      }
    } catch (error) {
      console.log(`❌ ${mapping.token}: ${error.message}`);
    }
  }

  // 6. Save deployment info
  console.log("\n5️⃣  Saving deployment info...");
  console.log("─".repeat(70));
  
  const deploymentInfo = {
    chainlinkPriceOracle: oracleAddress,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).chainId.toString()
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/chainlink-price-oracle.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Saved to: ${deploymentPath}`);

  // 7. Update frontend addresses.js
  console.log("\n6️⃣  Updating frontend addresses...");
  console.log("─".repeat(70));
  
  let updatedAddressesContent = fs.readFileSync(frontendAddressesPath, "utf8");
  
  // Update ChainlinkPriceOracle address
  updatedAddressesContent = updatedAddressesContent.replace(
    /(export const ChainlinkPriceOracleAddress\s*=\s*)"[^"]*"/,
    `$1"${oracleAddress}"`
  );
  
  // Add if doesn't exist
  if (!updatedAddressesContent.includes("ChainlinkPriceOracleAddress")) {
    updatedAddressesContent = updatedAddressesContent.replace(
      /(export const PriceOracleAddress[^;]+;)/,
      `$1\nexport const ChainlinkPriceOracleAddress = "${oracleAddress}";`
    );
  }
  
  fs.writeFileSync(frontendAddressesPath, updatedAddressesContent);
  console.log(`✅ Updated: ${frontendAddressesPath}`);

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ DEPLOYMENT COMPLETE!                                ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  
  console.log("📋 CHAINLINKPRICEORACLE ADDRESS:");
  console.log(`   ${oracleAddress}\n`);
  
  console.log("⚠️  LƯU Ý:");
  console.log("   ChainlinkPriceOracle đã được deploy và map với PriceAggregators.");
  console.log("   Tuy nhiên, LendingPool vẫn đang dùng PriceOracle cũ.");
  console.log("   Cần một trong các giải pháp sau:\n");
  console.log("   Option 1: Deploy LendingPool mới với ChainlinkPriceOracle");
  console.log("   Option 2: Tạo migration script để update LendingPool");
  console.log("   Option 3: Dùng ChainlinkPriceOracle làm PriceOracle (same interface)\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

