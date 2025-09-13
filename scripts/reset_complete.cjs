const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Complete reset...");
  
  const LENDING_POOL = "0x732b99385F3DA721b637644C320A9B50026096a5";
  const WETH = "0xF9E67A61159208D059E6d33e0f1572Eb2F21f9C2";
  const DAI = "0x63Ec6D3Ce1b069D3889018F44109f38768B0FD8F";
  const USER = "0x6BeF74348688912534cc00a696e5cc5428576afC";
  const LIQUIDATOR = "0x437f8fd0b38B3b9cbF51fbad5e9d3d49e50Ab1ca";
  
  try {
    const pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    const weth = await ethers.getContractAt("ERC20Mock", WETH);
    const dai = await ethers.getContractAt("ERC20Mock", DAI);
    
    // Reset user's WETH balance to 100
    const currentUserWETH = await weth.balanceOf(USER);
    if (currentUserWETH > ethers.parseUnits("100", 18)) {
      const [deployer] = await ethers.getSigners();
      await (await weth.connect(await ethers.getSigner(USER)).transfer(deployer.address, currentUserWETH - ethers.parseUnits("100", 18))).wait();
    }
    console.log("✅ User WETH balance reset to 100");
    
    // Reset liquidator's DAI balance to 200k
    const currentLiquidatorDAI = await dai.balanceOf(LIQUIDATOR);
    if (currentLiquidatorDAI > ethers.parseUnits("200000", 18)) {
      const [deployer] = await ethers.getSigners();
      await (await dai.connect(await ethers.getSigner(LIQUIDATOR)).transfer(deployer.address, currentLiquidatorDAI - ethers.parseUnits("200000", 18))).wait();
    }
    console.log("✅ Liquidator DAI balance reset to 200k");
    
    // Reset ETH price to $1600
    const PRICE_ORACLE = "0x2B543925E0CE349e73a240EB6F2db87d0527F519";
    const oracle = await ethers.getContractAt("PriceOracle", PRICE_ORACLE);
    await (await oracle.setAssetPrice(WETH, ethers.parseUnits("1600", 18))).wait();
    console.log("✅ ETH price reset to $1600");
    
    // Check balances
    const userWETHBalance = await weth.balanceOf(USER);
    const liquidatorDAIBalance = await dai.balanceOf(LIQUIDATOR);
    const ethPrice = await oracle.getAssetPrice1e18(WETH);
    
    console.log("📋 User WETH balance:", ethers.formatUnits(userWETHBalance, 18));
    console.log("📋 Liquidator DAI balance:", ethers.formatUnits(liquidatorDAIBalance, 18));
    console.log("📋 ETH price:", ethers.formatUnits(ethPrice, 18));
    
    console.log("\n🎉 Complete reset done! Ready for fresh E2E test.");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
