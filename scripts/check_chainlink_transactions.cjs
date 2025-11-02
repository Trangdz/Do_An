const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🔍 KIỂM TRA TRANSACTIONS CỦA CHAINLINK NODE                   ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const nodeAddress = "0xB2747b731BB1Df28ff8743FA6586744fC792F254"; // Node address từ setup
  const provider = ethers.provider;
  
  console.log(`📋 Chainlink Node Address: ${nodeAddress}\n`);
  
  // Kiểm tra balance
  const balance = await provider.getBalance(nodeAddress);
  console.log(`💰 Node Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Kiểm tra transaction count
  const txCount = await provider.getTransactionCount(nodeAddress);
  console.log(`📊 Transaction Count: ${txCount}\n`);
  
  // Lấy latest block
  const latestBlock = await provider.getBlockNumber();
  console.log(`📦 Latest Block: ${latestBlock}\n`);
  
  console.log("🔍 Đang tìm transactions gửi từ Chainlink node...\n");
  console.log("─".repeat(70));
  
  // Tìm transactions trong 10 blocks gần nhất
  const checkBlocks = 10;
  let foundTxs = 0;
  
  for (let i = 0; i < checkBlocks && latestBlock - i >= 0; i++) {
    const blockNum = latestBlock - i;
    try {
      const block = await provider.getBlock(blockNum, true);
      
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (typeof tx === 'string') {
            const txFull = await provider.getTransaction(tx);
            if (txFull && txFull.from && txFull.from.toLowerCase() === nodeAddress.toLowerCase()) {
              foundTxs++;
              const receipt = await provider.getTransactionReceipt(tx);
              
              console.log(`\n📝 Transaction #${foundTxs}:`);
              console.log(`   Hash: ${tx}`);
              console.log(`   Block: ${blockNum}`);
              console.log(`   To: ${txFull.to}`);
              console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
              
              // Decode nếu có thể
              if (txFull.data && txFull.data.startsWith('0x') && txFull.data.length > 10) {
                const functionSig = txFull.data.slice(0, 10);
                console.log(`   Function Sig: ${functionSig}`);
                
                // updateAnswer function selector: keccak256("updateAnswer(int256)")[0:4]
                const updateAnswerSig = "0x" + ethers.keccak256(ethers.toUtf8Bytes("updateAnswer(int256)")).slice(0, 10);
                if (functionSig.toLowerCase() === updateAnswerSig.toLowerCase()) {
                  console.log(`   ✅ Đây là updateAnswer() call!`);
                }
              }
              
              console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
            }
          }
        }
      }
    } catch (error) {
      // Skip nếu có lỗi
    }
  }
  
  if (foundTxs === 0) {
    console.log("⚠️  Không tìm thấy transaction nào từ Chainlink node");
    console.log("   Có thể:");
    console.log("   1. Jobs chưa chạy thành công");
    console.log("   2. Jobs đang gặp lỗi khi encode/submit");
    console.log("   3. Node chưa có đủ ETH để gửi transaction");
  } else {
    console.log(`\n✅ Tìm thấy ${foundTxs} transaction(s) từ Chainlink node`);
  }
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ KIỂM TRA HOÀN TẤT                                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);



