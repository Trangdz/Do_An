const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging PriceOracle...");
  
  const LENDING_POOL = "0x9803B5332a54292472D500d14C1f00f347dF17E0";
  const PRICE_ORACLE = "0x23Aa915B1de1edeec1DCcca9135Dc75F12cb0Daf";
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";
  
  try {
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    
    console.log("\n📋 Checking prices in PriceOracle:");
    console.log("WETH address:", WETH);
    console.log("DAI address:", DAI);
    
    // Check WETH price
    try {
      const wethPrice = await oracle.getAssetPrice1e18(WETH);
      console.log("✅ WETH price:", ethers.formatUnits(wethPrice, 18));
    } catch (error) {
      console.log("❌ WETH price error:", error.message);
    }
    
    // Check DAI price
    try {
      const daiPrice = await oracle.getAssetPrice1e18(DAI);
      console.log("✅ DAI price:", ethers.formatUnits(daiPrice, 18));
    } catch (error) {
      console.log("❌ DAI price error:", error.message);
    }
    
    // Check hardcoded addresses in LendingPool
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    
    console.log("\n📋 Hardcoded addresses in LendingPool:");
    console.log("WETH:", hardcodedWETH);
    console.log("DAI:", hardcodedDAI);
    
    // Check prices for hardcoded addresses
    console.log("\n📋 Checking prices for hardcoded addresses:");
    try {
      const hardcodedWETHPrice = await oracle.getAssetPrice1e18(hardcodedWETH);
      console.log("✅ Hardcoded WETH price:", ethers.formatUnits(hardcodedWETHPrice, 18));
    } catch (error) {
      console.log("❌ Hardcoded WETH price error:", error.message);
    }
    
    try {
      const hardcodedDAIPrice = await oracle.getAssetPrice1e18(hardcodedDAI);
      console.log("✅ Hardcoded DAI price:", ethers.formatUnits(hardcodedDAIPrice, 18));
    } catch (error) {
      console.log("❌ Hardcoded DAI price error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
