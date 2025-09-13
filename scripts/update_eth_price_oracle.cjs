const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Updating ETH price in PriceOracle...");
  
  const PRICE_ORACLE = "0x2B543925E0CE349e73a240EB6F2db87d0527F519";
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  
  try {
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Get hardcoded WETH address
    const hardcodedWETH = await pool.WETH();
    console.log("📋 Hardcoded WETH:", hardcodedWETH);
    
    // Update ETH price from $1600 to $1100
    console.log("🔧 Updating ETH price from $1600 to $1100...");
    await (await oracle.setAssetPrice(hardcodedWETH, ethers.parseUnits("1100", 18))).wait();
    console.log("✅ ETH price updated to $1100");
    
    // Verify price
    const newPrice = await oracle.getAssetPrice1e18(hardcodedWETH);
    console.log("📋 New ETH price:", ethers.formatUnits(newPrice, 18));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
