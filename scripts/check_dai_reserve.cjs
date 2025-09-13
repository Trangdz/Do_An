const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking DAI reserve...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Check DAI reserve
    try {
      const reserveData = await pool.reserves(DAI);
      console.log("📋 DAI reserve data:");
      console.log("  reserveCash:", reserveData.reserveCash.toString());
      console.log("  totalDebt:", reserveData.totalDebt.toString());
      console.log("  isBorrowable:", reserveData.isBorrowable);
      console.log("  decimals:", reserveData.decimals);
      
      // Check if DAI is initialized
      if (reserveData.reserveCash.toString() === "0" && reserveData.totalDebt.toString() === "0") {
        console.log("❌ DAI reserve not initialized!");
      } else {
        console.log("✅ DAI reserve initialized");
      }
    } catch (error) {
      console.log("❌ Error reading DAI reserve:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
