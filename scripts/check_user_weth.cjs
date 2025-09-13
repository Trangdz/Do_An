const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking user's WETH balance...");
  
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  
  try {
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    
    // Check user's WETH balance
    const userWETHBalance = await weth.balanceOf(USER);
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    
    // Check user's WETH supply in pool
    const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    try {
      const userReserveData = await pool.userReserves(USER, WETH);
      console.log("📋 User WETH supply in pool:", ethers.formatUnits(userReserveData.supplyBalance1e18, 18));
    } catch (error) {
      console.log("❌ Error reading user reserve data:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
