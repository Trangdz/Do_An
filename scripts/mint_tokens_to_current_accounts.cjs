/*
  🪙 Mint Tokens to Current Ganache Accounts
  
  This script mints tokens to all accounts currently in Ganache CLI
  (works with current mnemonic)
*/

const { ethers } = require("hardhat");
const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║      🪙 MINT TOKENS TO CURRENT GANACHE ACCOUNTS                   ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deployer:", deployer.address);
  console.log("💰 Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get token contracts
  const TokenFactory = await ethers.getContractFactory("TokenWithWithdraw");
  
  const weth = await ethers.getContractAt("TokenWithWithdraw", addresses.WETHAddress);
  const usdc = await ethers.getContractAt("TokenWithWithdraw", addresses.USDCAddress);
  const dai = await ethers.getContractAt("TokenWithWithdraw", addresses.DAIAddress);
  const linkToken = await ethers.getContractAt("LinkToken", addresses.LINKAddress);

  console.log("✅ Token contracts loaded:");
  console.log("  WETH:", addresses.WETHAddress);
  console.log("  USDC:", addresses.USDCAddress);
  console.log("  DAI:", addresses.DAIAddress);
  console.log("  LINK:", addresses.LINKAddress);
  console.log("");

  // Get all signers (accounts from current Ganache)
  const signers = await ethers.getSigners();
  const numUsers = Math.min(10, signers.length);

  console.log(`📋 Found ${numUsers} accounts to mint tokens...\n`);
  console.log("─".repeat(70));

  for (let i = 0; i < numUsers; i++) {
    const user = signers[i];
    const address = await user.getAddress();
    
    console.log(`\n👤 User ${i}: ${address}`);
    
    try {
      // Check current balances
      const wethBal = await weth.balanceOf(address);
      const daiBal = await dai.balanceOf(address);
      const usdcBal = await usdc.balanceOf(address);
      const linkBal = await linkToken.balanceOf(address);

      // Mint if balance is low
      if (wethBal === 0n) {
        await weth.mint(address, ethers.parseUnits("10000", 18));
        console.log("  ✅ Minted 10,000 WETH");
      } else {
        console.log(`  ℹ️  WETH already has: ${ethers.formatEther(wethBal)}`);
      }

      if (daiBal === 0n) {
        await dai.mint(address, ethers.parseUnits("1000000", 18));
        console.log("  ✅ Minted 1,000,000 DAI");
      } else {
        console.log(`  ℹ️  DAI already has: ${ethers.formatEther(daiBal)}`);
      }

      if (usdcBal === 0n) {
        await usdc.mint(address, ethers.parseUnits("1000000", 6));
        console.log("  ✅ Minted 1,000,000 USDC");
      } else {
        const formatted = ethers.formatUnits(usdcBal, 6);
        console.log(`  ℹ️  USDC already has: ${formatted}`);
      }

      if (linkBal === 0n) {
        // Check deployer has enough LINK to transfer
        const deployerLinkBal = await linkToken.balanceOf(deployer.address);
        if (deployerLinkBal >= ethers.parseUnits("100000", 18)) {
          await linkToken.transfer(address, ethers.parseUnits("100000", 18));
          console.log("  ✅ Transferred 100,000 LINK");
        } else {
          console.log("  ⚠️  Deployer doesn't have enough LINK to transfer");
        }
      } else {
        console.log(`  ℹ️  LINK already has: ${ethers.formatEther(linkBal)}`);
      }

    } catch (error) {
      console.error(`  ❌ Error minting for ${address}:`, error.message);
    }
  }

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ MINTING COMPLETE!                            ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log("💡 Next steps:");
  console.log("  1. Refresh frontend (Ctrl+F5)");
  console.log("  2. Connect MetaMask with any of the accounts above");
  console.log("  3. You should now see tokens!\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



