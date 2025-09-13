import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing LendingPool accruePublic function...");
  
  const [deployer] = await ethers.getSigners();
  const LENDING_POOL = "0xCA06292bec157877D20B424fDB88f742cd3D0946";
  const DAI = "0xf877004dC804Bd501a2627bB3b1379247B1D4950";
  
  // Get LendingPool contract
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LENDING_POOL);
  
  console.log("LendingPool:", LENDING_POOL);
  console.log("Testing with DAI:", DAI);
  
  // Call accruePublic to trigger ReserveDataUpdated event
  console.log("\n🔄 Calling accruePublic...");
  const tx = await lendingPool.accruePublic(DAI);
  await tx.wait();
  
  console.log("✅ accruePublic called successfully!");
  console.log("Transaction hash:", tx.hash);
  
  // Get updated reserve data
  const reserveData = await lendingPool.reserves(DAI);
  console.log("\n📊 Updated Reserve Data:");
  console.log("- Reserve Cash:", reserveData.reserveCash.toString());
  console.log("- Total Debt Principal:", reserveData.totalDebtPrincipal.toString());
  console.log("- Liquidity Index:", reserveData.liquidityIndex.toString());
  console.log("- Variable Borrow Index:", reserveData.variableBorrowIndex.toString());
  console.log("- Last Update:", reserveData.lastUpdate.toString());
  
  console.log("\n🎉 ReserveDataUpdated event should have been emitted!");
  console.log("Check the event listener terminal to see the rate table.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});