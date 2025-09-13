const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing LendingPool _accrue function...");
  
  const [deployer] = await ethers.getSigners();
  const LENDING_POOL = "0xD898096173C48c8bFef6677DBCC87343c4fEaD19";
  const DAI = "0x78608d72b50ebC71089C30bdf6bACe5265AA9aa3";
  
  // Get LendingPool contract
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LENDING_POOL);
  
  console.log("LendingPool:", LENDING_POOL);
  console.log("Testing with DAI:", DAI);
  
  // Try to call _accrue (this should trigger ReserveDataUpdated event)
  try {
    // Since _accrue is internal, we need to find a way to trigger it
    // Let's check if there are any public functions that call _accrue
    console.log("Checking LendingPool functions...");
    
    // Get reserve data to see current state
    const reserveData = await lendingPool.reserves(DAI);
    console.log("Current reserve data:");
    console.log("- Reserve Cash:", reserveData.reserveCash.toString());
    console.log("- Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
    console.log("- Liquidity Index:", reserveData.liquidityIndex.toString());
    console.log("- Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
    console.log("- Last Update:", reserveData.lastUpdate.toString());
    
    // Since _accrue is internal, we can't call it directly
    // But we can check if there are any public functions that might trigger it
    console.log("\nNote: _accrue is an internal function.");
    console.log("To trigger ReserveDataUpdated events, you need to implement");
    console.log("public functions in LendingPool that call _accrue internally.");
    console.log("\nExample functions that should call _accrue:");
    console.log("- supply()");
    console.log("- borrow()");
    console.log("- repay()");
    console.log("- withdraw()");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
