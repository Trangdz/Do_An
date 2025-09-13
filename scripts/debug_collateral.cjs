const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging collateral issue...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const WETH = "0x793787865f6f987FF9D3C2cE3c9b0337D4ECEb91";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Check user's WETH balance
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    const userWETHBalance = await weth.balanceOf(USER);
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    
    // Check hardcoded addresses
    const hardcodedWETH = await pool.WETH();
    console.log("📋 Hardcoded WETH:", hardcodedWETH);
    console.log("📋 Actual WETH:", WETH);
    console.log("📋 Match:", hardcodedWETH.toLowerCase() === WETH.toLowerCase());
    
    // Check if user has supply in hardcoded WETH
    try {
      const hardcodedUserReserveData = await pool.userReserves(USER, hardcodedWETH);
      console.log("📋 User hardcoded WETH reserve data:");
      console.log("  supplyBalance1e18:", hardcodedUserReserveData.supplyBalance1e18.toString());
      console.log("  debtBalance1e18:", hardcodedUserReserveData.debtBalance1e18.toString());
      console.log("  isCollateral:", hardcodedUserReserveData.isCollateral);
    } catch (error) {
      console.log("❌ Error reading hardcoded user WETH reserve data:", error.message);
    }
    
    // Check WETH reserve data
    try {
      const reserveData = await pool.reserves(WETH);
      console.log("📋 WETH reserve data:");
      console.log("  reserveCash:", reserveData.reserveCash.toString());
      console.log("  totalDebt:", reserveData.totalDebt.toString());
      console.log("  isBorrowable:", reserveData.isBorrowable);
    } catch (error) {
      console.log("❌ Error reading WETH reserve data:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
