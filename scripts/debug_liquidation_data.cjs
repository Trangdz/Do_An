const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Script to debug liquidation data - check what data is being read
 * 
 * Usage:
 *   npx hardhat run scripts/debug_liquidation_data.cjs --network ganache
 * 
 * Or with specific user:
 *   USER_ADDRESS=0x... npx hardhat run scripts/debug_liquidation_data.cjs --network ganache
 */
async function main() {
  console.log("=== Debug Liquidation Data ===\n");

  // Read addresses
  let poolAddress, oracleAddress, linkAddress;
  try {
    const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
    poolAddress = addresses.LendingPoolAddress;
    oracleAddress = addresses.PriceOracleAddress;
    linkAddress = addresses.LINKAddress;
  } catch (e) {
    console.error("❌ Could not read addresses.js");
    process.exit(1);
  }

  console.log("LendingPool:", poolAddress);
  console.log("PriceOracle:", oracleAddress);
  console.log("LINK Address:", linkAddress);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("");

  // Get contracts
  const pool = await hre.ethers.getContractAt("LendingPool", poolAddress);
  const oracle = await hre.ethers.getContractAt("IPriceOracle", oracleAddress);

  // Get user address from env or use deployer
  const userAddress = process.env.USER_ADDRESS || deployer.address;
  console.log("Checking user:", userAddress);
  console.log("");

  try {
    // 1. Get account data from LendingPool
    console.log("1️⃣ Getting account data from LendingPool...");
    const [collateral, debt, hf] = await pool.getAccountData(userAddress);
    const collateralNum = Number(ethers.formatUnits(collateral, 18));
    const debtNum = Number(ethers.formatUnits(debt, 18));
    const hfNum = Number(ethers.formatUnits(hf, 18));
    
    console.log(`   Collateral: $${collateralNum.toFixed(2)}`);
    console.log(`   Debt: $${debtNum.toFixed(2)}`);
    console.log(`   Health Factor: ${hfNum.toFixed(4)}`);
    console.log(`   Status: ${hfNum < 1.0 ? '🔴 LIQUIDATABLE' : '✅ Safe'}`);
    console.log("");

    // 2. Check prices from oracle
    console.log("2️⃣ Checking prices from Oracle...");
    const tokens = [
      { symbol: "WETH", address: require("../lendhub-frontend-nextjs/src/addresses.js").WETHAddress },
      { symbol: "DAI", address: require("../lendhub-frontend-nextjs/src/addresses.js").DAIAddress },
      { symbol: "USDC", address: require("../lendhub-frontend-nextjs/src/addresses.js").USDCAddress },
      { symbol: "LINK", address: linkAddress },
    ];

    for (const token of tokens) {
      try {
        const price = await oracle.getAssetPrice1e18(token.address);
        const priceNum = Number(ethers.formatUnits(price, 18));
        console.log(`   ${token.symbol}: $${priceNum.toFixed(2)}`);
      } catch (e) {
        console.log(`   ${token.symbol}: ❌ Error - ${e.message}`);
      }
    }
    console.log("");

    // 3. Check user's supply and borrow for each asset
    console.log("3️⃣ Checking user's positions...");
    for (const token of tokens) {
      try {
        const supply = await pool.getCurrentSupply(userAddress, token.address);
        const borrow = await pool.getCurrentDebt(userAddress, token.address);
        const supplyNum = Number(ethers.formatUnits(supply, 18));
        const borrowNum = Number(ethers.formatUnits(borrow, 18));
        
        if (supplyNum > 0.000001 || borrowNum > 0.000001) {
          console.log(`   ${token.symbol}:`);
          if (supplyNum > 0.000001) {
            console.log(`     Supply: ${supplyNum.toFixed(6)} ${token.symbol}`);
          }
          if (borrowNum > 0.000001) {
            console.log(`     Borrow: ${borrowNum.toFixed(6)} ${token.symbol}`);
          }
        }
      } catch (e) {
        // Skip errors
      }
    }
    console.log("");

    // 4. Check if oracle is MultiPriceAggregator
    console.log("4️⃣ Checking Oracle type...");
    try {
      const code = await hre.ethers.provider.getCode(oracleAddress);
      if (code === '0x' || code === '0x0') {
        console.log("   ❌ Oracle contract not found at address");
      } else {
        // Try to check if it's MultiPriceAggregator
        try {
          const multiAgg = await hre.ethers.getContractAt("MultiPriceAggregator", oracleAddress);
          const writer = await multiAgg.writer();
          console.log("   Oracle type: MultiPriceAggregator");
          console.log("   Writer:", writer);
          
          // Check LINK price in MultiPriceAggregator
          try {
            const [linkPrice, roundId, updatedAt] = await multiAgg.getPrice("LINK");
            const linkPriceNum = Number(linkPrice) / 1e8;
            const updatedAtDate = new Date(Number(updatedAt) * 1000);
            console.log(`   LINK price in MultiPriceAggregator: $${linkPriceNum.toFixed(2)} (Round ${roundId})`);
            console.log(`   LINK last updated: ${updatedAtDate.toLocaleString()}`);
          } catch (e) {
            console.log("   ❌ Could not get LINK price from MultiPriceAggregator");
          }
        } catch (e) {
          console.log("   Oracle type: Unknown (not MultiPriceAggregator)");
        }
      }
    } catch (e) {
      console.log("   ❌ Error checking oracle:", e.message);
    }
    console.log("");

    // 5. Summary
    console.log("=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log(`   User: ${userAddress}`);
    console.log(`   Health Factor: ${hfNum.toFixed(4)}`);
    console.log(`   Collateral: $${collateralNum.toFixed(2)}`);
    console.log(`   Debt: $${debtNum.toFixed(2)}`);
    console.log(`   Status: ${hfNum < 1.0 ? '🔴 LIQUIDATABLE (should appear in liquidation list)' : '✅ Safe (HF >= 1)'}`);
    
    if (hfNum < 1.0) {
      console.log("\n⚠️  If this position is NOT showing in liquidation list:");
      console.log("   1. Check if user address is in the list of users being checked");
      console.log("   2. Check if liquidation page is refreshing (auto-refresh every 15s)");
      console.log("   3. Check browser console for errors");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("execution reverted")) {
      console.error("   This might mean the user has no account data or oracle failed");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

