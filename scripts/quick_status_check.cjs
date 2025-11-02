const { ethers } = require("hardhat");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          📊 TRẠNG THÁI HỆ THỐNG                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const provider = ethers.provider;
  const nodeAddress = "0xB2747b731BB1Df28ff8743FA6586744fC792F254";
  
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const nodeBalance = await provider.getBalance(nodeAddress);
    
    console.log(`🔗 Network Chain ID: ${network.chainId}`);
    console.log(`📦 Latest Block: ${blockNumber}`);
    console.log(`💰 Node Balance: ${ethers.formatEther(nodeBalance)} ETH\n`);
    
    if (blockNumber === 0) {
      console.log("⚠️  Ganache có thể đã reset hoặc chưa chạy!");
      console.log("   → Cần restart Ganache và deploy lại contracts\n");
    }
    
    if (nodeBalance === 0n) {
      console.log("⚠️  Node không có ETH!");
      console.log("   → Cần fund node với ETH\n");
    } else {
      console.log("✅ Node có ETH, sẵn sàng gửi transactions\n");
    }
    
  } catch (error) {
    console.error("❌ Lỗi kết nối:", error.message);
    console.log("   → Ganache có thể không chạy hoặc chưa sẵn sàng\n");
  }
  
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ KIỂM TRA HOÀN TẤT                                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);



