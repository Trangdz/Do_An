const { ethers } = require("hardhat");

async function main() {
  console.log("🎮 Simulating Trading Activity in LendHub v2...");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses
  const LENDING_POOL = "0x9182437bd8ef67A7375D05e86793e232AB5c416d";
  const DAI = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";
  
  // Get contracts
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LENDING_POOL);
  
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const dai = ERC20Mock.attach(DAI);
  
  console.log("📊 Current Reserve Data:");
  const initialReserve = await lendingPool.reserves(DAI);
  console.log("- Reserve Cash:", initialReserve.reserveCash.toString());
  console.log("- Total Debt Principal:", initialReserve.totalDebtPrincipal.toString());
  console.log("- Liquidity Index:", initialReserve.liquidityIndex.toString());
  console.log("- Variable Borrow Index:", initialReserve.variableBorrowIndex.toString());
  
  console.log("\n🔄 Simulating different utilization scenarios...");
  
  // Simulate different scenarios by calling accruePublic with different reserve states
  // Note: In a real implementation, these would be triggered by actual supply/borrow operations
  
  console.log("\n📈 Scenario 1: Triggering accrue with current state (0% utilization)");
  const tx1 = await lendingPool.accruePublic(DAI, { gasLimit: 1000000 });
  await tx1.wait();
  console.log("✅ Transaction 1 completed:", tx1.hash);
  
  // Wait a bit to see the event
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("\n📈 Scenario 2: Triggering accrue again (simulating time passage)");
  const tx2 = await lendingPool.accruePublic(DAI, { gasLimit: 1000000 });
  await tx2.wait();
  console.log("✅ Transaction 2 completed:", tx2.hash);
  
  // Wait a bit to see the event
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("\n📈 Scenario 3: Triggering accrue again (simulating more time passage)");
  const tx3 = await lendingPool.accruePublic(DAI, { gasLimit: 1000000 });
  await tx3.wait();
  console.log("✅ Transaction 3 completed:", tx3.hash);
  
  // Wait a bit to see the event
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("\n📊 Final Reserve Data:");
  const finalReserve = await lendingPool.reserves(DAI);
  console.log("- Reserve Cash:", finalReserve.reserveCash.toString());
  console.log("- Total Debt Principal:", finalReserve.totalDebtPrincipal.toString());
  console.log("- Liquidity Index:", finalReserve.liquidityIndex.toString());
  console.log("- Variable Borrow Index:", finalReserve.variableBorrowIndex.toString());
  console.log("- Last Update:", finalReserve.lastUpdate.toString());
  
  console.log("\n🎯 What happened:");
  console.log("✅ Each accruePublic call triggered a ReserveDataUpdated event");
  console.log("✅ The event listener should have displayed rate tables");
  console.log("✅ Since there's no actual supply/borrow, utilization remains 0%");
  console.log("✅ But the indices and rates are still calculated and updated");
  
  console.log("\n🚀 To see real rate changes, you need to:");
  console.log("1. Implement supply() function to add liquidity");
  console.log("2. Implement borrow() function to create debt");
  console.log("3. These functions should call _accrue() internally");
  console.log("4. Then you'll see utilization > 0% and dynamic rates");
  
  console.log("\n✅ Simulation completed! Check the event listener terminal for rate tables.");
}

main().catch(console.error);
