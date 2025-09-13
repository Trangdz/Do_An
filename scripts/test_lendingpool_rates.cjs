const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing LendingPool Rate Calculation...");
  
  const [deployer] = await ethers.getSigners();
  const LENDING_POOL = "0xCA06292bec157877D20B424fDB88f742cd3D0946";
  const DAI = "0xf877004dC804Bd501a2627bB3b1379247B1D4950";
  
  // Get LendingPool contract
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LENDING_POOL);
  
  console.log("LendingPool:", LENDING_POOL);
  console.log("Testing with DAI:", DAI);
  
  // Get current reserve data
  const reserveData = await lendingPool.reserves(DAI);
  console.log("\n📊 Current Reserve Data:");
  console.log("- Reserve Cash:", reserveData.reserveCash.toString());
  console.log("- Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
  console.log("- Liquidity Index:", reserveData.liquidityIndex.toString());
  console.log("- Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
  console.log("- Last Update:", reserveData.lastUpdate.toString());
  
  // Test Interest Rate Model directly
  console.log("\n📈 Testing Interest Rate Model...");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = InterestRateModel.attach("0x21Bf5E9ca5AeC6BC9e53Ce30F7101d6750e08da8");
  
  const cash = ethers.parseEther("1000000");
  const debt = ethers.parseEther("500000");
  const reserveFactor = 1000; // 10%
  const optimalU = 8000; // 80%
  const baseRate = 1000000000000000000n; // Very small rate
  const slope1 = 2000000000000000000n;
  const slope2 = 10000000000000000000n;
  
  const [borrowRate, supplyRate] = await interestRateModel.getRates(
    cash,
    debt,
    reserveFactor,
    optimalU,
    baseRate,
    slope1,
    slope2
  );
  
  console.log("✅ Borrow Rate (RAY):", borrowRate.toString());
  console.log("✅ Supply Rate (RAY):", supplyRate.toString());
  
  // Convert to APR
  const RAY = 1e27;
  const SECONDS_PER_YEAR = 365 * 24 * 3600;
  const borrowAPR = Number(borrowRate) * SECONDS_PER_YEAR / RAY * 100;
  const supplyAPR = Number(supplyRate) * SECONDS_PER_YEAR / RAY * 100;
  
  console.log("\n📊 Rate Summary:");
  console.log("Borrow APR:", borrowAPR.toFixed(6), "%");
  console.log("Supply APR:", supplyAPR.toFixed(6), "%");
  
  console.log("\n💡 Note: ReserveDataUpdated events will only be emitted when _accrue() is called");
  console.log("This happens when supply/borrow/repay functions are implemented in LendingPool");
  console.log("\nTo trigger events, you need to implement public functions that call _accrue() internally");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
