const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking deployed contracts...");
  
  const LENDING_POOL = "0x1e2725F621795Ae861D791c24120EbB96b624206";
  const PRICE_ORACLE = "0x47fcd5d24C307f464Fe1503fB8025a3907feef3c";
  const WETH = "0xCa4FE2bf2e9d42d97032cb8a53Db168CF683DC9b";
  const DAI = "0xd0dDcE1e29b0f36f820F597DeB65a4C3fA8b9360";
  
  try {
    // Check LendingPool
    console.log("📋 Checking LendingPool...");
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const poolOwner = await pool.owner();
    console.log("✅ LendingPool owner:", poolOwner);
    
    // Check WETH
    console.log("📋 Checking WETH...");
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    const wethDecimals = await weth.decimals();
    console.log("✅ WETH decimals:", wethDecimals);
    
    // Check DAI
    console.log("📋 Checking DAI...");
    const dai = await ethers.getContractAt("ERC20Mock", DAI);
    const daiDecimals = await dai.decimals();
    console.log("✅ DAI decimals:", daiDecimals);
    
    // Check PriceOracle
    console.log("📋 Checking PriceOracle...");
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    const wethPrice = await oracle.getAssetPrice1e18(WETH);
    console.log("✅ WETH price:", ethers.formatUnits(wethPrice, 18));
    
    const daiPrice = await oracle.getAssetPrice1e18(DAI);
    console.log("✅ DAI price:", ethers.formatUnits(daiPrice, 18));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
