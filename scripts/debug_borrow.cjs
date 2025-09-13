const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging borrow function...");
  
  const LENDING_POOL = "0x83f3271DD8F332fa7F71927B496f1b18ad964470";
  const WETH = "0x0E38272e13fCc35273889b432c67CDFA7F13Ac3B";
  const DAI = "0xb11c613A491a907bdec0023A173FE95B2Ada58d9";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    const dai = await ethers.getContractAt("ERC20Mock", DAI);
    
    // Check user's WETH balance
    const userWETHBalance = await weth.balanceOf(USER);
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    
    // Check user's WETH supply in pool
    try {
      const userReserveData = await pool.userReserves(USER, WETH);
      console.log("📋 User WETH supply:", ethers.formatUnits(userReserveData.supplyBalance1e18, 18));
      console.log("📋 User WETH isCollateral:", userReserveData.isCollateral);
    } catch (error) {
      console.log("❌ Error reading user WETH reserve:", error.message);
    }
    
    // Check DAI reserve
    try {
      const daiReserve = await pool.reserves(DAI);
      console.log("📋 DAI reserve cash:", ethers.formatUnits(daiReserve.reserveCash, 18));
      console.log("📋 DAI isBorrowable:", daiReserve.isBorrowable);
    } catch (error) {
      console.log("❌ Error reading DAI reserve:", error.message);
    }
    
    // Check hardcoded addresses
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    console.log("📋 Hardcoded WETH:", hardcodedWETH);
    console.log("📋 Hardcoded DAI:", hardcodedDAI);
    console.log("📋 WETH match:", hardcodedWETH.toLowerCase() === WETH.toLowerCase());
    console.log("📋 DAI match:", hardcodedDAI.toLowerCase() === DAI.toLowerCase());
    
    // Try to borrow small amount
    console.log("\n🔧 Trying to borrow 1000 DAI...");
    try {
      await (await pool.connect(await ethers.getSigner(USER)).borrow(DAI, ethers.parseUnits("1000", 18))).wait();
      console.log("✅ Borrow successful");
    } catch (error) {
      console.log("❌ Borrow error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
