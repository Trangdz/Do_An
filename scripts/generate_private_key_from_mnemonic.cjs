/**
 * Generate private key from mnemonic
 * Nếu Ganache dùng mnemonic chuẩn, script này sẽ hiển thị private key
 */

const { ethers } = require("ethers");

// Các mnemonic thường dùng
const mnemonics = [
  "test test test test test test test test test test test junk",
  "high project east dream doctor glad picnic fiscal assault asthma vendor amateur",
  "myth like bonus scare over problem client lizard pioneer submit female collect"
];

const targetAddress = "0xC42B5Ed782ebE05C3621b601be03b89E86ed5558";

console.log("\n╔════════════════════════════════════════════════════════════════════╗");
console.log("║            🔐 GENERATE PRIVATE KEY FROM MNEMONIC                  ║");
console.log("╠════════════════════════════════════════════════════════════════════╣");
console.log("║                                                                    ║");
console.log(`║  Target: ${targetAddress}   ║`);
console.log("║                                                                    ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

console.log("🔍 Testing common mnemonics...\n");

for (const mnemonic of mnemonics) {
  console.log(`📝 Testing: ${mnemonic.substring(0, 50)}...`);
  
  for (let i = 0; i < 10; i++) {
    try {
      const path = `m/44'/60'/0'/0/${i}`;
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, path);
      
      if (wallet.address.toLowerCase() === targetAddress.toLowerCase()) {
        console.log("\n\n✅ ══════════════════════ FOUND IT! ══════════════════════ ✅\n");
        console.log("╔════════════════════════════════════════════════════════════════════╗");
        console.log("║              🎉 PRIVATE KEY FOR METAMASK IMPORT                    ║");
        console.log("╠════════════════════════════════════════════════════════════════════╣");
        console.log("║                                                                    ║");
        console.log(`║  Address:                                                          ║`);
        console.log(`║  ${wallet.address}                           ║`);
        console.log("║                                                                    ║");
        console.log(`║  Private Key:                                                      ║`);
        console.log(`║  ${wallet.privateKey}  ║`);
        console.log("║                                                                    ║");
        console.log(`║  Derivation Path: ${path.padEnd(43)} ║`);
        console.log(`║  Account Index: ${i.toString().padEnd(47)} ║`);
        console.log("║                                                                    ║");
        console.log("╠════════════════════════════════════════════════════════════════════╣");
        console.log("║                   📱 HOW TO USE IN METAMASK                        ║");
        console.log("╠════════════════════════════════════════════════════════════════════╣");
        console.log("║                                                                    ║");
        console.log("║  1. Open MetaMask                                                  ║");
        console.log("║  2. Click account icon (top right corner)                         ║");
        console.log("║  3. Select 'Import Account'                                        ║");
        console.log("║  4. Choose 'Private Key'                                           ║");
        console.log("║  5. Copy-paste the private key above:                              ║");
        console.log(`║                                                                    ║`);
        console.log(`║     ${wallet.privateKey}     ║`);
        console.log("║                                                                    ║");
        console.log("║  6. Click 'Import'                                                 ║");
        console.log("║                                                                    ║");
        console.log("║  ⚠️  IMPORTANT:                                                     ║");
        console.log("║  - Make sure you're on 'Ganache Local' network                     ║");
        console.log("║  - RPC URL: http://127.0.0.1:7545 (port 7545, not 8545!)          ║");
        console.log("║  - Chain ID: 1337                                                  ║");
        console.log("║                                                                    ║");
        console.log("║  ✅ After import, you should see:                                  ║");
        console.log("║  - Balance: ~99.99 ETH                                             ║");
        console.log("║  - Address: 0xC42B...558                                           ║");
        console.log("║                                                                    ║");
        console.log("╚════════════════════════════════════════════════════════════════════╝");
        console.log("\n🎯 After importing, refresh your frontend and you'll see all tokens!\n");
        process.exit(0);
      }
    } catch (e) {
      // Skip invalid mnemonic
    }
  }
  console.log("   ❌ Not found in this mnemonic\n");
}

console.log("\n❌ ═══════════════════════════════════════════════════════════════ ❌");
console.log("   Could not find private key in common mnemonics.");
console.log("\n💡 This means Ganache is using a different (random) mnemonic.");
console.log("   You MUST find the Ganache window to get the private key.");
console.log("\n📝 Instructions:");
console.log("   1. Press Alt + Tab to find PowerShell windows");
console.log("   2. Look for window with 'ganache' or 'Available Accounts' text");
console.log("   3. Scroll to top of that window");
console.log("   4. Find 'Private Keys' section");
console.log("   5. Copy private key of Account (0)");
console.log("═══════════════════════════════════════════════════════════════════\n");








