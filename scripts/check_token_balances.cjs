/*
  🔍 Check Token Balances for All Test Accounts
  
  This script checks token balances (WETH, DAI, USDC, LINK) for all 10 test accounts
  to verify tokens were minted correctly.
*/

const { ethers } = require("hardhat");
const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔍 CHECKING TOKEN BALANCES FOR TEST ACCOUNTS               ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Token addresses
  const tokens = {
    WETH: addresses.WETHAddress,
    DAI: addresses.DAIAddress,
    USDC: addresses.USDCAddress,
    LINK: addresses.LINKAddress,
  };

  // Token ABIs (only need balanceOf and decimals)
  const tokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  // Get all 10 test accounts from addresses.js
  const testAccounts = [];
  for (let i = 0; i < 10; i++) {
    const addr = addresses[`User${i}Address`];
    if (addr) testAccounts.push({ index: i, address: addr });
  }

  console.log(`📋 Checking ${testAccounts.length} test accounts...\n`);
  console.log("─".repeat(70));

  for (const user of testAccounts) {
    console.log(`\n👤 User ${user.index}: ${user.address}`);
    console.log("  ".repeat(35) + "─");

    // Check ETH balance
    const ethBalance = await provider.getBalance(user.address);
    console.log(`  ETH:   ${ethers.formatEther(ethBalance)} ETH`);

    // Check token balances
    for (const [symbol, tokenAddress] of Object.entries(tokens)) {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(user.address);
        
        let formatted;
        if (decimals === 6) {
          formatted = ethers.formatUnits(balance, 6);
        } else {
          formatted = ethers.formatEther(balance);
        }
        
        console.log(`  ${symbol.padEnd(5)}: ${formatted.padStart(20)} ${symbol}`);
      } catch (error) {
        console.log(`  ${symbol.padEnd(5)}: Error - ${error.message}`);
      }
    }
  }

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ BALANCE CHECK COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log("💡 To use these accounts in MetaMask:");
  console.log("   1. Open MetaMask → Import Account");
  console.log("   2. Choose 'Private Key' or 'Mnemonic'");
  console.log("   3. If using mnemonic, make sure Ganache uses the same mnemonic:");
  console.log("      dwarf virtual cotton sudden uncover initial true apple call prepare inquiry west\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



