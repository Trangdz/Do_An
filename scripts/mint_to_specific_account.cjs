/*
  🪙 Mint Tokens to Specific Account
  
  Usage: node scripts/mint_to_specific_account.cjs <address>
*/

const hre = require("hardhat");
const { ethers } = hre;
const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");

async function main() {
  // Default to the account user is using
  let accountAddress = process.argv[2] || "0x87EA1C24418b717D5e331e07d5246748eF3e96fE";
  
  if (!accountAddress || accountAddress.length !== 42) {
    console.log("\n❌ Usage: node scripts/mint_to_specific_account.cjs [address]");
    console.log("\nExample:");
    console.log("  node scripts/mint_to_specific_account.cjs 0x87EA1C24418b717D5e331e07d5246748eF3e96fE");
    console.log("\nOr use default (account from MetaMask):");
    console.log("  node scripts/mint_to_specific_account.cjs\n");
    process.exit(1);
  }
  
  // Fix checksum
  try {
    accountAddress = ethers.getAddress(accountAddress.toLowerCase());
  } catch (e) {
    console.error("\n❌ Invalid address format:", accountAddress);
    console.error("   Error:", e.message);
    process.exit(1);
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🪙 MINT TOKENS TO SPECIFIC ACCOUNT                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  
  // Get token contracts
  const weth = await ethers.getContractAt("TokenWithWithdraw", addresses.WETHAddress);
  const usdc = await ethers.getContractAt("TokenWithWithdraw", addresses.USDCAddress);
  const dai = await ethers.getContractAt("TokenWithWithdraw", addresses.DAIAddress);
  const linkToken = await ethers.getContractAt("LinkToken", addresses.LINKAddress);

  console.log(`📋 Minting tokens to: ${accountAddress}\n`);
  console.log("─".repeat(70));

  try {
    // Check current balances
    const wethBal = await weth.balanceOf(accountAddress);
    const daiBal = await dai.balanceOf(accountAddress);
    const usdcBal = await usdc.balanceOf(accountAddress);
    const linkBal = await linkToken.balanceOf(accountAddress);

    console.log("\n📊 Current Balances:");
    console.log(`  WETH: ${ethers.formatEther(wethBal)}`);
    console.log(`  DAI:  ${ethers.formatEther(daiBal)}`);
    console.log(`  USDC: ${ethers.formatUnits(usdcBal, 6)}`);
    console.log(`  LINK: ${ethers.formatEther(linkBal)}`);

    // Mint tokens
    console.log("\n🪙 Minting tokens...\n");

    if (wethBal === 0n) {
      const tx1 = await weth.mint(accountAddress, ethers.parseUnits("10000", 18));
      await tx1.wait();
      console.log("  ✅ Minted 10,000 WETH");
    } else {
      console.log(`  ℹ️  WETH already has: ${ethers.formatEther(wethBal)}`);
    }

    if (daiBal === 0n) {
      const tx2 = await dai.mint(accountAddress, ethers.parseUnits("1000000", 18));
      await tx2.wait();
      console.log("  ✅ Minted 1,000,000 DAI");
    } else {
      console.log(`  ℹ️  DAI already has: ${ethers.formatEther(daiBal)}`);
    }

    if (usdcBal === 0n) {
      const tx3 = await usdc.mint(accountAddress, ethers.parseUnits("1000000", 6));
      await tx3.wait();
      console.log("  ✅ Minted 1,000,000 USDC");
    } else {
      console.log(`  ℹ️  USDC already has: ${ethers.formatUnits(usdcBal, 6)}`);
    }

    if (linkBal === 0n) {
      // Check deployer has enough LINK
      const deployerLinkBal = await linkToken.balanceOf(deployer.address);
      const linkAmount = ethers.parseUnits("100000", 18);
      
      if (deployerLinkBal >= linkAmount) {
        const tx4 = await linkToken.transfer(accountAddress, linkAmount);
        await tx4.wait();
        console.log("  ✅ Transferred 100,000 LINK");
      } else {
        console.log(`  ⚠️  Deployer only has ${ethers.formatEther(deployerLinkBal)} LINK, cannot transfer 100,000`);
        // Mint LINK for deployer first (if LinkToken supports it)
        console.log("  💡 Trying to get LINK from other accounts...");
      }
    } else {
      console.log(`  ℹ️  LINK already has: ${ethers.formatEther(linkBal)}`);
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
    console.error("\n❌ Error minting tokens:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

