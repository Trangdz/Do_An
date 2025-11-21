const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load addresses
  const addressesPath = path.join(process.cwd(), "lendhub-frontend-nextjs", "src", "addresses.js");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ addresses.js not found");
    process.exit(1);
  }
  
  const addresses = require(addressesPath);
  const LendingPoolAddress = addresses.LendingPoolAddress;
  const PriceOracleAddress = addresses.PriceOracleAddress;

  if (!LendingPoolAddress || LendingPoolAddress === '0x0000000000000000000000000000000000000000') {
    console.error("❌ LendingPoolAddress not found in addresses.js");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const userAddress = process.env.USER_ADDRESS || deployer.address;
  
  console.log("=".repeat(60));
  console.log("🔍 Checking Health Factor for user:", userAddress);
  console.log("=".repeat(60));

  const pool = await ethers.getContractAt("LendingPool", LendingPoolAddress);
  const aggregator = await ethers.getContractAt("MultiPriceAggregator", PriceOracleAddress);

  // Get on-chain account data
  console.log("\n1️⃣ On-chain Account Data (from LendingPool.getAccountData):");
  const [collateralValue1e18, debtValue1e18, healthFactor1e18] = await pool.getAccountData(userAddress);
  const collateralUSD = Number(ethers.formatUnits(collateralValue1e18, 18));
  const debtUSD = Number(ethers.formatUnits(debtValue1e18, 18));
  const healthFactor = Number(ethers.formatUnits(healthFactor1e18, 18));

  console.log(`   Collateral: $${collateralUSD.toFixed(2)}`);
  console.log(`   Debt: $${debtUSD.toFixed(2)}`);
  console.log(`   Health Factor: ${healthFactor.toFixed(4)}`);
  console.log(`   Status: ${healthFactor < 1 ? '🔴 LIQUIDATABLE (HF < 1)' : healthFactor >= 1 && healthFactor < 1.5 ? '⚠️ AT RISK (HF < 1.5)' : '✅ SAFE'}`);

  // Get all user positions
  console.log("\n2️⃣ User Positions:");
  const tokenAddresses = {
    WETH: addresses.WETHAddress,
    DAI: addresses.DAIAddress,
    USDC: addresses.USDCAddress,
    LINK: addresses.LINKAddress,
    PEPE: addresses.PEPEAddress,
  };
  
  const tokenConfigs = [
    { symbol: 'WETH', address: tokenAddresses.WETH, decimals: 18 },
    { symbol: 'DAI', address: tokenAddresses.DAI, decimals: 18 },
    { symbol: 'USDC', address: tokenAddresses.USDC, decimals: 6 },
    { symbol: 'LINK', address: tokenAddresses.LINK, decimals: 18 },
    { symbol: 'PEPE', address: tokenAddresses.PEPE, decimals: 18 },
  ].filter(t => t.address && t.address !== '0x0000000000000000000000000000000000000000');
  
  const allAssets = tokenConfigs.map(t => t.address);
  
  let totalCollateralUSD = 0;
  let totalDebtUSD = 0;

  for (const assetAddress of allAssets) {
    const token = tokenConfigs.find(t => t.address?.toLowerCase() === assetAddress.toLowerCase());
    if (!token) continue;

    try {
      const userReserve = await pool.userReserves(userAddress, assetAddress);
      const supplyBalance = await pool.getCurrentSupplyBalance(userAddress, assetAddress);
      const debtBalance = await pool.getCurrentDebtBalance(userAddress, assetAddress);

      const supplyNum = Number(ethers.formatUnits(supplyBalance, token.decimals));
      const debtNum = Number(ethers.formatUnits(debtBalance, token.decimals));

      if (supplyNum > 0.000001 || debtNum > 0.000001) {
        // Get price
        const price1e18 = await aggregator.getAssetPrice1e18(assetAddress);
        const priceUSD = Number(ethers.formatUnits(price1e18, 18));
        
        // Get reserve data for LTV
        const reserve = await pool.reserves(assetAddress);
        const ltvBps = Number(reserve.ltvBps);
        const liqThresholdBps = Number(reserve.liqThresholdBps);
        
        const supplyUSD = supplyNum * priceUSD;
        const debtUSD_pos = debtNum * priceUSD;
        
        // Collateral value uses LTV (for borrow capacity)
        const collateralValue_pos = userReserve.useAsCollateral ? (supplyUSD * ltvBps / 10000) : 0;
        
        totalCollateralUSD += collateralValue_pos;
        totalDebtUSD += debtUSD_pos;

        console.log(`   ${token.symbol}:`);
        console.log(`      Supply: ${supplyNum.toFixed(4)} ($${supplyUSD.toFixed(2)})`);
        console.log(`      Debt: ${debtNum.toFixed(4)} ($${debtUSD_pos.toFixed(2)})`);
        console.log(`      Price: $${priceUSD.toFixed(2)}`);
        console.log(`      LTV: ${ltvBps / 100}%`);
        console.log(`      Liq Threshold: ${liqThresholdBps / 100}%`);
        console.log(`      Collateral Enabled: ${userReserve.useAsCollateral}`);
        console.log(`      Collateral Value (LTV-weighted): $${collateralValue_pos.toFixed(2)}`);
      }
    } catch (e) {
      console.warn(`   Error checking ${token.symbol}:`, e.message);
    }
  }

  // Calculate HF manually
  console.log("\n3️⃣ Manual HF Calculation:");
  console.log(`   Total Collateral (LTV-weighted): $${totalCollateralUSD.toFixed(2)}`);
  console.log(`   Total Debt: $${totalDebtUSD.toFixed(2)}`);
  
  if (totalDebtUSD === 0) {
    console.log(`   Calculated HF: Infinity (no debt)`);
  } else {
    const calculatedHF = totalCollateralUSD / totalDebtUSD;
    console.log(`   Calculated HF: ${calculatedHF.toFixed(4)}`);
    console.log(`   Difference from on-chain: ${Math.abs(calculatedHF - healthFactor).toFixed(4)}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY:");
  console.log(`   User: ${userAddress}`);
  console.log(`   On-chain HF: ${healthFactor.toFixed(4)}`);
  console.log(`   On-chain Collateral: $${collateralUSD.toFixed(2)}`);
  console.log(`   On-chain Debt: $${debtUSD.toFixed(2)}`);
  console.log(`   Manual Calculated HF: ${totalDebtUSD === 0 ? 'Infinity' : (totalCollateralUSD / totalDebtUSD).toFixed(4)}`);
  console.log(`   Status: ${healthFactor < 1 ? '🔴 LIQUIDATABLE' : '✅ Safe (HF >= 1)'}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

