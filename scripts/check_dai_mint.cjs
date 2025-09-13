const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking DAI mint function...");
  
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";
  const USER = "0x6222039E9862D4AC591861Bd6A1a086c08252f58";
  
  try {
    const dai = await ethers.getContractAt("ERC20Mock", DAI);
    
    // Check if mint function exists
    console.log("📋 Checking DAI contract...");
    const balance = await dai.balanceOf(USER);
    console.log("Current balance:", ethers.formatUnits(balance, 18));
    
    // Try to mint
    console.log("📋 Trying to mint DAI...");
    await (await dai.mint(USER, ethers.parseUnits("1000", 18))).wait();
    console.log("✅ Mint successful");
    
    const newBalance = await dai.balanceOf(USER);
    console.log("New balance:", ethers.formatUnits(newBalance, 18));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
