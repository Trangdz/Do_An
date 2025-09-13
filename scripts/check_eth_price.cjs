const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking ETH price...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const PRICE_ORACLE = "0x2B543925E0CE349e73a240EB6F2db87d0527F519";
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    
    // Check current ETH price in PriceOracle
    const ethPrice = await oracle.getAssetPrice1e18(WETH);
    console.log("📋 ETH price in PriceOracle:", ethers.formatUnits(ethPrice, 18));
    
    // Check user's account data
    const user = "0x6BeF74348688912534cc00a696e5cc5428576afC";
    const [col, debt, hf] = await pool.getAccountData(user);
    console.log("📋 User account data:");
    console.log("  Collateral(USD):", ethers.formatUnits(col, 18));
    console.log("  Debt(USD):", ethers.formatUnits(debt, 18));
    console.log("  Health Factor:", ethers.formatUnits(hf, 18));
    
    // Calculate expected collateral value
    const userWETHBalance = 50; // 50 WETH
    const expectedCollateralValue = userWETHBalance * parseFloat(ethers.formatUnits(ethPrice, 18));
    console.log("📋 Expected collateral value (50 WETH * price):", expectedCollateralValue);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
