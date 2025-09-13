const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking hardcoded addresses in LendingPool...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const WETH = "0x793787865f6f987FF9D3C2cE3c9b0337D4ECEb91";
  const DAI = "0xC220f370c8005CF63Ed206146fE2B0732D498124";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    
    // Check hardcoded addresses
    const hardcodedWETH = await pool.WETH();
    const hardcodedDAI = await pool.DAI();
    
    console.log("📋 Hardcoded addresses in LendingPool:");
    console.log("WETH:", hardcodedWETH);
    console.log("DAI:", hardcodedDAI);
    
    console.log("\n📋 Actual deployed addresses:");
    console.log("WETH:", WETH);
    console.log("DAI:", DAI);
    
    console.log("\n🔍 Comparison:");
    console.log("WETH match:", hardcodedWETH.toLowerCase() === WETH.toLowerCase());
    console.log("DAI match:", hardcodedDAI.toLowerCase() === DAI.toLowerCase());
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
