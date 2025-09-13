const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Fixing PriceOracle prices for hardcoded addresses...");
  
  const PRICE_ORACLE = "0x2B543925E0CE349e73a240EB6F2db87d0527F519";
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  
  try {
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Get hardcoded addresses from LendingPool
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    
    console.log("📋 Hardcoded addresses in LendingPool:");
    console.log("WETH:", hardcodedWETH);
    console.log("DAI:", hardcodedDAI);
    
    // Set prices for hardcoded addresses
    console.log("\n🔧 Setting prices for hardcoded addresses...");
    
    // WETH price: 1600 USD (1e18)
    await (await oracle.setAssetPrice(hardcodedWETH, ethers.parseUnits("1600", 18))).wait();
    console.log("✅ Set WETH price: 1600 USD");
    
    // DAI price: 1 USD (1e18)
    await (await oracle.setAssetPrice(hardcodedDAI, ethers.parseUnits("1", 18))).wait();
    console.log("✅ Set DAI price: 1 USD");
    
    // Verify prices
    console.log("\n🔍 Verifying prices...");
    const wethPrice = await oracle.getAssetPrice1e18(hardcodedWETH);
    const daiPrice = await oracle.getAssetPrice1e18(hardcodedDAI);
    
    console.log("✅ WETH price:", ethers.formatUnits(wethPrice, 18));
    console.log("✅ DAI price:", ethers.formatUnits(daiPrice, 18));
    
    console.log("\n🎉 PriceOracle fixed! Now getAccountData should work.");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
