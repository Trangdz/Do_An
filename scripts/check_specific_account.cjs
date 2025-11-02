/*
  Check balance for a specific account address
*/

const { ethers } = require("hardhat");
const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");

async function main() {
  let accountAddress = process.argv[2];
  
  if (!accountAddress) {
    console.log("\nUsage: node scripts/check_specific_account.cjs <address>");
    console.log("\nExample: node scripts/check_specific_account.cjs 0x87ea1c24418b717d5e331e07d5246748eF3e96fE\n");
    process.exit(1);
  }
  
  // Fix checksum
  try {
    accountAddress = ethers.getAddress(accountAddress);
  } catch (e) {
    console.error("\n❌ Invalid address format:", accountAddress);
    console.error("   Error:", e.message);
    process.exit(1);
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔍 CHECKING BALANCE FOR SPECIFIC ACCOUNT                ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  console.log(`📋 Checking account: ${accountAddress}\n`);

  // Token addresses
  const tokens = {
    WETH: addresses.WETHAddress,
    DAI: addresses.DAIAddress,
    USDC: addresses.USDCAddress,
    LINK: addresses.LINKAddress,
  };

  // Token ABIs
  const tokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  // Check ETH balance
  const ethBalance = await provider.getBalance(accountAddress);
  console.log(`ETH:   ${ethers.formatEther(ethBalance)} ETH`);

  // Check token balances
  for (const [symbol, tokenAddress] of Object.entries(tokens)) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(accountAddress);
      
      let formatted;
      if (decimals === 6) {
        formatted = ethers.formatUnits(balance, 6);
      } else {
        formatted = ethers.formatEther(balance);
      }
      
      console.log(`${symbol.padEnd(5)}: ${formatted.padStart(20)} ${symbol}`);
    } catch (error) {
      console.log(`${symbol.padEnd(5)}: Error - ${error.message}`);
    }
  }

  // Check which user this is
  console.log("\n🔍 Checking if this is a test account...");
  for (let i = 0; i < 10; i++) {
    const userAddr = addresses[`User${i}Address`];
    if (userAddr && userAddr.toLowerCase() === accountAddress.toLowerCase()) {
      console.log(`✅ This is User ${i} from addresses.js`);
      break;
    }
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

