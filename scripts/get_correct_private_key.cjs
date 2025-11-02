const { ethers } = require("ethers");

// Địa chỉ deployer thực tế từ Ganache
const targetAddress = "0xC42B5Ed782ebE05C3621b601be03b89E86ed5558";

// Các mnemonic có thể
const mnemonics = [
  "high project east dream doctor glad picnic fiscal assault asthma vendor amateur",
  "test test test test test test test test test test test junk",
  "myth like bonus scare over problem client lizard pioneer submit female collect"
];

console.log("🔍 Tìm kiếm private key cho địa chỉ:", targetAddress);

for (const mnemonic of mnemonics) {
  console.log(`\n📝 Testing mnemonic: ${mnemonic.substring(0, 30)}...`);
  
  for (let i = 0; i < 10; i++) {
    try {
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, `m/44'/60'/0'/0/${i}`);
      
      if (wallet.address.toLowerCase() === targetAddress.toLowerCase()) {
        console.log("\n✅ FOUND IT!");
        console.log("╔════════════════════════════════════════════════════════════════════╗");
        console.log("║                    DEPLOYER ACCOUNT INFO                           ║");
        console.log("╠════════════════════════════════════════════════════════════════════╣");
        console.log("║ Address:", wallet.address.padEnd(44), "║");
        console.log("║ Private Key:", wallet.privateKey.padEnd(39), "║");
        console.log("║ Account Index:", i.toString().padEnd(45), "║");
        console.log("╚════════════════════════════════════════════════════════════════════╝");
        console.log("\n🎯 Import vào MetaMask:");
        console.log("1. MetaMask → Import Account → Private Key");
        console.log("2. Paste private key:", wallet.privateKey);
        console.log("3. Chọn network: Ganache Local (port 7545)");
        process.exit(0);
      }
    } catch (e) {
      // Skip invalid mnemonic
    }
  }
}

console.log("\n❌ Không tìm thấy private key cho địa chỉ này trong các mnemonic thông thường.");
console.log("\n💡 Có thể Ganache đang dùng mnemonic tự động hoặc mnemonic khác.");
console.log("Hãy kiểm tra console của Ganache để xem mnemonic đang dùng.");










