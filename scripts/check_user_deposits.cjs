const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking user's deposits...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    
    // Check user's WETH balance
    const userWETHBalance = await weth.balanceOf(USER);
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    
    // Check WETH reserve cash
    const reserveData = await pool.reserves(WETH);
    console.log("📋 WETH reserve cash:", ethers.formatUnits(reserveData.reserveCash, 18));
    
    // Calculate how much user deposited
    const userDeposited = 100 - parseFloat(ethers.formatUnits(userWETHBalance, 18));
    console.log("📋 User deposited WETH:", userDeposited);
    
    // Check if this matches reserve cash
    const reserveCash = parseFloat(ethers.formatUnits(reserveData.reserveCash, 18));
    console.log("📋 Reserve cash matches user deposit:", Math.abs(reserveCash - userDeposited) < 0.01);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
