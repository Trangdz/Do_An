const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking hardcoded reserves...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Get hardcoded addresses
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    
    console.log("📋 Hardcoded addresses:");
    console.log("WETH:", hardcodedWETH);
    console.log("DAI:", hardcodedDAI);
    
    // Check WETH reserve
    try {
      const wethReserve = await pool.reserves(hardcodedWETH);
      console.log("\n📋 WETH reserve:");
      console.log("  reserveCash:", wethReserve.reserveCash.toString());
      console.log("  isBorrowable:", wethReserve.isBorrowable);
    } catch (error) {
      console.log("❌ WETH reserve error:", error.message);
    }
    
    // Check DAI reserve
    try {
      const daiReserve = await pool.reserves(hardcodedDAI);
      console.log("\n📋 DAI reserve:");
      console.log("  reserveCash:", daiReserve.reserveCash.toString());
      console.log("  isBorrowable:", daiReserve.isBorrowable);
    } catch (error) {
      console.log("❌ DAI reserve error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
