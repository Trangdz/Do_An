const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying and testing Counter contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Deploy Counter
  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.waitForDeployment();
  
  const counterAddress = await counter.getAddress();
  console.log("📄 Counter deployed at:", counterAddress);
  
  // Test Counter functionality
  console.log("\n🧪 Testing Counter functionality...");
  
  // Initial value
  let value = await counter.x();
  console.log("📊 Initial value:", value.toString());
  
  // Test inc()
  console.log("➕ Testing inc()...");
  await counter.inc();
  value = await counter.x();
  console.log("📊 Value after inc():", value.toString());
  
  // Test incBy()
  console.log("➕ Testing incBy(5)...");
  await counter.incBy(5);
  value = await counter.x();
  console.log("📊 Value after incBy(5):", value.toString());
  
  // Test incBy(0) - should revert
  console.log("❌ Testing incBy(0) - should revert...");
  try {
    await counter.incBy(0);
    console.log("❌ ERROR: incBy(0) should have reverted!");
  } catch (error) {
    console.log("✅ incBy(0) correctly reverted:", error.message);
  }
  
  // Final value
  value = await counter.x();
  console.log("📊 Final value:", value.toString());
  
  console.log("\n🎉 Counter contract test completed successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
