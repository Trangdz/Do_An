const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Checking Wallet Token Balances");
  console.log("═".repeat(70));
  
  // Get addresses from deployment
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  
  const WETH_ADDRESS = addresses.WETHAddress;
  const DAI_ADDRESS = addresses.DAIAddress;
  const USDC_ADDRESS = addresses.USDCAddress;
  const LINK_ADDRESS = addresses.LINKAddress;
  
  // Get all signers to check balances
  const signers = await ethers.getSigners();
  
  console.log(`\n📋 Checking ${signers.length} accounts...\n`);
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];
  
  for (let i = 0; i < Math.min(10, signers.length); i++) {
    const user = signers[i];
    const address = await user.getAddress();
    
    console.log(`\n👤 User ${i}: ${address}`);
    console.log("─".repeat(70));
    
    // Check ETH
    const ethBalance = await ethers.provider.getBalance(address);
    console.log(`  ETH:  ${ethers.formatEther(ethBalance)} ETH`);
    
    // Check WETH
    try {
      const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, user);
      const wethBalance = await weth.balanceOf(address);
      console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
    } catch (e) {
      console.log(`  WETH: Error - ${e.message}`);
    }
    
    // Check DAI
    try {
      const dai = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, user);
      const daiBalance = await dai.balanceOf(address);
      console.log(`  DAI:  ${ethers.formatEther(daiBalance)} DAI`);
    } catch (e) {
      console.log(`  DAI: Error - ${e.message}`);
    }
    
    // Check USDC
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, user);
      const usdcBalance = await usdc.balanceOf(address);
      console.log(`  USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    } catch (e) {
      console.log(`  USDC: Error - ${e.message}`);
    }
    
    // Check LINK
    try {
      const link = new ethers.Contract(LINK_ADDRESS, ERC20_ABI, user);
      const linkBalance = await link.balanceOf(address);
      console.log(`  LINK: ${ethers.formatEther(linkBalance)} LINK`);
    } catch (e) {
      console.log(`  LINK: Error - ${e.message}`);
    }
  }
  
  console.log("\n" + "═".repeat(70));
  console.log("✅ Balance check complete!");
  console.log("\n💡 TIP: Import one of the accounts above to MetaMask");
  console.log("   They all have tokens to test with!\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

