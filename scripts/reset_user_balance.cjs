const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Resetting user balance...");
  
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  const LIQUIDATOR = "0x437f8fd0b38B3b9cbF51fbad5e9d3d49e50Ab1ca";
  
  try {
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    const dai = await ethers.getContractAt("ERC20Mock", DAI);
    
    // Get current balances
    const currentUserWETH = await weth.balanceOf(USER);
    const currentLiquidatorDAI = await dai.balanceOf(LIQUIDATOR);
    
    // Reset user's WETH balance to 100
    if (currentUserWETH > ethers.parseUnits("100", 18)) {
      // Transfer excess to deployer
      const [deployer] = await ethers.getSigners();
      await (await weth.connect(await ethers.getSigner(USER)).transfer(deployer.address, currentUserWETH - ethers.parseUnits("100", 18))).wait();
    } else if (currentUserWETH < ethers.parseUnits("100", 18)) {
      await (await weth.mint(USER, ethers.parseUnits("100", 18) - currentUserWETH)).wait();
    }
    console.log("✅ User WETH balance reset to 100");
    
    // Reset liquidator's DAI balance to 200k
    if (currentLiquidatorDAI > ethers.parseUnits("200000", 18)) {
      // Transfer excess to deployer
      const [deployer] = await ethers.getSigners();
      await (await dai.connect(await ethers.getSigner(LIQUIDATOR)).transfer(deployer.address, currentLiquidatorDAI - ethers.parseUnits("200000", 18))).wait();
    } else if (currentLiquidatorDAI < ethers.parseUnits("200000", 18)) {
      await (await dai.mint(LIQUIDATOR, ethers.parseUnits("200000", 18) - currentLiquidatorDAI)).wait();
    }
    console.log("✅ Liquidator DAI balance reset to 200k");
    
    // Check balances
    const userWETHBalance = await weth.balanceOf(USER);
    const liquidatorDAIBalance = await dai.balanceOf(LIQUIDATOR);
    
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    console.log("📋 Liquidator DAI balance:", ethers.formatUnits(liquidatorDAIBalance, 18));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
