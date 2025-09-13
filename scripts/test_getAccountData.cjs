const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing getAccountData function...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    console.log("📋 Testing getAccountData for user:", USER);
    
    try {
      const [col, debt, hf] = await pool.getAccountData(USER);
      console.log("✅ getAccountData success:");
      console.log("  Collateral:", ethers.formatUnits(col, 18));
      console.log("  Debt:", ethers.formatUnits(debt, 18));
      console.log("  Health Factor:", ethers.formatUnits(hf, 18));
    } catch (error) {
      console.log("❌ getAccountData error:", error.message);
      
      // Check if it's the price oracle error
      if (error.message.includes("PriceOracle: price not set")) {
        console.log("\n🔍 This confirms the issue: LendingPool is using hardcoded addresses");
        console.log("   that don't have prices set in the PriceOracle!");
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
