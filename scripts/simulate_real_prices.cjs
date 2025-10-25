const { ethers } = require("hardhat");

async function main() {
  console.log("🌍 Simulating Real-World Price Updates...");
  console.log("=" .repeat(50));

  // Get deployed contracts
  const [deployer] = await ethers.getSigners();
  
  // Update these addresses with your deployed contracts
  const ETH_USD_AGGREGATOR = "0x..."; // Your deployed MockV3Aggregator address
  const USDC_USD_AGGREGATOR = "0x..."; // Your deployed MockV3Aggregator address
  const DAI_USD_AGGREGATOR = "0x..."; // Your deployed MockV3Aggregator address

  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  
  // Simulate real price movements
  const priceMovements = [
    // ETH price movements (realistic)
    { time: "09:00", eth: 2000, usdc: 1.0, dai: 1.0 },
    { time: "10:00", eth: 2050, usdc: 1.0, dai: 1.0 },
    { time: "11:00", eth: 1980, usdc: 1.0, dai: 1.0 },
    { time: "12:00", eth: 2100, usdc: 1.0, dai: 1.0 },
    { time: "13:00", eth: 2080, usdc: 1.0, dai: 1.0 },
    { time: "14:00", eth: 2150, usdc: 1.0, dai: 1.0 },
    { time: "15:00", eth: 2200, usdc: 1.0, dai: 1.0 },
    { time: "16:00", eth: 2180, usdc: 1.0, dai: 1.0 },
    { time: "17:00", eth: 2250, usdc: 1.0, dai: 1.0 },
    { time: "18:00", eth: 2300, usdc: 1.0, dai: 1.0 }
  ];

  console.log("📈 Simulating price movements throughout the day...");
  
  for (const movement of priceMovements) {
    console.log(`\n⏰ ${movement.time} - Updating prices...`);
    
    try {
      // Update ETH price
      const ethAggregator = MockV3Aggregator.attach(ETH_USD_AGGREGATOR);
      await ethAggregator.updateAnswer(ethers.parseUnits(movement.eth.toString(), 8));
      console.log(`   💰 ETH: $${movement.eth}`);
      
      // Update USDC price (stable)
      const usdcAggregator = MockV3Aggregator.attach(USDC_USD_AGGREGATOR);
      await usdcAggregator.updateAnswer(ethers.parseUnits(movement.usdc.toString(), 8));
      console.log(`   💰 USDC: $${movement.usdc}`);
      
      // Update DAI price (stable)
      const daiAggregator = MockV3Aggregator.attach(DAI_USD_AGGREGATOR);
      await daiAggregator.updateAnswer(ethers.parseUnits(movement.dai.toString(), 8));
      console.log(`   💰 DAI: $${movement.dai}`);
      
      // Wait 2 seconds between updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   ❌ Failed to update prices: ${error.message}`);
    }
  }
  
  console.log("\n✅ Price simulation completed!");
  console.log("🎯 This simulates how real Chainlink feeds work in production");
  console.log("💡 In production, these would be real Chainlink nodes updating prices");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Simulation failed:", error);
    process.exit(1);
  });

