const { ethers } = require("hardhat");

async function main() {
  const mnemonic = "high project east dream doctor glad picnic fiscal assault asthma vendor amateur";
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
  
  console.log("\n🔑 Account 0 (Deployer) - HAS ALL TOKENS:");
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  
  // Generate a few more accounts
  for (let i = 1; i <= 3; i++) {
    const w = ethers.HDNodeWallet.fromPhrase(mnemonic, `m/44'/60'/0'/0/${i}`);
    console.log(`\n🔑 Account ${i}:`);
    console.log("Address:", w.address);
    console.log("Private Key:", w.privateKey);
  }
}

main().catch(console.error);



