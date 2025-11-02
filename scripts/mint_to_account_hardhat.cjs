/*
  🪙 Mint Tokens to Account using Hardhat network
*/

const { ethers } = require("hardhat");
const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");

async function main() {
  const accountAddress = "0x87EA1C24418b717D5e331e07d5246748eF3e96fE";
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🪙 MINT TOKENS TO ACCOUNT (HARDHAT)                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deployer:", deployer.address);
  
  // Get token contracts
  console.log("\n📋 Loading token contracts...");
  const weth = await ethers.getContractAt("TokenWithWithdraw", addresses.WETHAddress);
  const usdc = await ethers.getContractAt("TokenWithWithdraw", addresses.USDCAddress);
  const dai = await ethers.getContractAt("TokenWithWithdraw", addresses.DAIAddress);
  const linkToken = await ethers.getContractAt("LinkToken", addresses.LINKAddress);

  // Check if contracts exist
  const provider = ethers.provider;
  const wethCode = await provider.getCode(addresses.WETHAddress);
  
  if (wethCode === "0x") {
    console.error("\n❌ ERROR: Token contracts not found at addresses!");
    console.error("   Token addresses may be from different deployment.");
    console.error("   Solution: Re-deploy contracts with current Ganache");
    console.error("\n   Run: npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache\n");
    process.exit(1);
  }

  console.log(`✅ Token contracts loaded for: ${accountAddress}\n`);
  console.log("─".repeat(70));

  try {
    // Mint tokens
    console.log("\n🪙 Minting tokens...\n");

    const tx1 = await weth.mint(accountAddress, ethers.parseUnits("10000", 18));
    await tx1.wait();
    console.log("  ✅ Minted 10,000 WETH");

    const tx2 = await dai.mint(accountAddress, ethers.parseUnits("1000000", 18));
    await tx2.wait();
    console.log("  ✅ Minted 1,000,000 DAI");

    const tx3 = await usdc.mint(accountAddress, ethers.parseUnits("1000000", 6));
    await tx3.wait();
    console.log("  ✅ Minted 1,000,000 USDC");

    // Transfer LINK
    const deployerLinkBal = await linkToken.balanceOf(deployer.address);
    const linkAmount = ethers.parseUnits("100000", 18);
    
    if (deployerLinkBal >= linkAmount) {
      const tx4 = await linkToken.transfer(accountAddress, linkAmount);
      await tx4.wait();
      console.log("  ✅ Transferred 100,000 LINK");
    } else {
      console.log(`  ⚠️  Deployer has ${ethers.formatEther(deployerLinkBal)} LINK, transferring available amount...`);
      if (deployerLinkBal > 0n) {
        const tx4 = await linkToken.transfer(accountAddress, deployerLinkBal);
        await tx4.wait();
        console.log(`  ✅ Transferred ${ethers.formatEther(deployerLinkBal)} LINK`);
      }
    }

    // Check final balances
    console.log("\n📊 Final Balances:");
    const finalWeth = await weth.balanceOf(accountAddress);
    const finalDai = await dai.balanceOf(accountAddress);
    const finalUsdc = await usdc.balanceOf(accountAddress);
    const finalLink = await linkToken.balanceOf(accountAddress);

    console.log(`  WETH: ${ethers.formatEther(finalWeth)}`);
    console.log(`  DAI:  ${ethers.formatEther(finalDai)}`);
    console.log(`  USDC: ${ethers.formatUnits(finalUsdc, 6)}`);
    console.log(`  LINK: ${ethers.formatEther(finalLink)}`);

    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════════╗");
    console.log("║                    ✅ MINTING COMPLETE!                            ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

    console.log("💡 Next steps:");
    console.log("  1. Refresh frontend (Ctrl+F5)");
    console.log("  2. You should now see tokens!\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("could not decode")) {
      console.error("\n💡 This usually means:");
      console.error("   - Token contracts not deployed at these addresses");
      console.error("   - Or addresses are from different deployment\n");
      console.error("   Solution: Re-deploy contracts");
      console.error("   Run: npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache\n");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

