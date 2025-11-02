/**
 * Script hiển thị private key của deployer account
 * Chạy script này để lấy private key import vào MetaMask
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              🔑 DEPLOYER ACCOUNT - IMPORT VÀO METAMASK             ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                    ║");
  console.log(`║  📍 Address: ${deployer.address}   ║`);
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                      💰 TOKEN BALANCES                             ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  
  // Đọc addresses từ file deployment
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.log("║  ❌ deployment-info.json not found!                                ║");
    console.log("║  Run: npx hardhat run scripts/deploy_all_in_one.cjs --network ganache ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");
    return;
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deployment.contracts;
  
  // Check balances
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`║  ETH:  ${ethers.formatEther(ethBalance).padEnd(56)} ║`);
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const tokens = {
    WETH: contracts.WETH,
    DAI: contracts.DAI,
    USDC: contracts.USDC,
    LINK: contracts.LINK
  };
  
  for (const [symbol, address] of Object.entries(tokens)) {
    try {
      const contract = new ethers.Contract(address, ERC20_ABI, ethers.provider);
      const balance = await contract.balanceOf(deployer.address);
      const decimals = await contract.decimals();
      const formatted = ethers.formatUnits(balance, decimals);
      console.log(`║  ${symbol}: ${formatted.padEnd(55)} ║`);
    } catch (e) {
      console.log(`║  ${symbol}: ERROR - Contract not found                                ║`);
    }
  }
  
  console.log("║                                                                    ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                  🔐 PRIVATE KEY (FOR METAMASK)                     ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                    ║");
  
  // Try to get private key from Ganache
  try {
    // Request private key from Ganache using eth_accounts and personal_* methods
    const accounts = await ethers.provider.send("eth_accounts", []);
    
    if (accounts[0].toLowerCase() === deployer.address.toLowerCase()) {
      console.log("║  ✅ This is Account (0) from Ganache                               ║");
      console.log("║                                                                    ║");
      console.log("║  📝 TO GET PRIVATE KEY:                                            ║");
      console.log("║  ──────────────────────────────────────────────────────────────    ║");
      console.log("║  1. Find the PowerShell window running Ganache                     ║");
      console.log("║  2. Scroll up to find 'Private Keys' section                       ║");
      console.log("║  3. Copy the private key of Account (0)                            ║");
      console.log("║     Format: 0x...                                                  ║");
      console.log("║                                                                    ║");
      console.log("║  🔴 IF YOU CAN'T FIND GANACHE WINDOW:                              ║");
      console.log("║  Run this in terminal:                                             ║");
      console.log("║  Get-Process | Where-Object {$_.ProcessName -eq 'powershell'}     ║");
      console.log("║                                                                    ║");
    }
  } catch (e) {
    console.log("║  ⚠️  Cannot retrieve private key automatically                      ║");
  }
  
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║             📱 HOW TO IMPORT INTO METAMASK                         ║");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                    ║");
  console.log("║  1. Open MetaMask                                                  ║");
  console.log("║  2. Click account icon (top right)                                 ║");
  console.log("║  3. Select 'Import Account'                                        ║");
  console.log("║  4. Choose 'Private Key'                                           ║");
  console.log("║  5. Paste the private key from Ganache                             ║");
  console.log("║  6. Click 'Import'                                                 ║");
  console.log("║                                                                    ║");
  console.log("║  ⚠️  MAKE SURE:                                                     ║");
  console.log("║  - Network is 'Ganache Local' (port 8545, not 8545!)              ║");
  console.log("║  - Chain ID is 1337                                                ║");
  console.log("║  - After import, you should see ~99.99 ETH                         ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");
  
  // Additional info
  console.log("📋 Contract Addresses (Already in frontend):");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("LendingPool:", contracts.LendingPool);
  console.log("WETH:       ", contracts.WETH);
  console.log("DAI:        ", contracts.DAI);
  console.log("USDC:       ", contracts.USDC);
  console.log("LINK:       ", contracts.LINK);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);












