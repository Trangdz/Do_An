const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== DEBUG READ PRICES ===");
  console.log("");
  
  // 1. Kiểm tra file deployment
  const deploymentFile = "./deployments/multi-price.json";
  if (!fs.existsSync(deploymentFile)) {
    console.log("❌ File deployment không tồn tại:", deploymentFile);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("1. Contract address từ file:", data.aggregator);
  
  // 2. Kiểm tra network
  const network = await hre.ethers.provider.getNetwork();
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("2. Network: ChainID", network.chainId, ", Block:", blockNumber);
  
  // 3. Kiểm tra contract code
  const code = await hre.ethers.provider.getCode(data.aggregator);
  console.log("3. Contract code:", code.length > 2 ? (code.length - 2) / 2 + " bytes" : "0 bytes (KHÔNG CÓ CODE)");
  
  if (code.length <= 2) {
    console.log("\n❌ Contract không có code! Có thể:");
    console.log("   - Contract chưa được deploy");
    console.log("   - Địa chỉ sai");
    console.log("   - Network không đúng");
    return;
  }
  
  // 4. Thử đọc contract
  try {
    const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", data.aggregator);
    console.log("4. ✅ Contract object created");
    
    // 5. Kiểm tra writer
    const writer = await aggregator.writer();
    console.log("5. Writer address:", writer);
    
    if (writer === "0x0000000000000000000000000000000000000000") {
      console.log("   ⚠️  Writer chưa được set!");
    }
    
    // 6. Kiểm tra symbol count
    const symbolCount = await aggregator.getSymbolCount();
    console.log("6. Symbols tracked:", symbolCount.toString());
    
    if (symbolCount === 0) {
      console.log("   ⚠️  Chưa có symbol nào được track");
    }
    
    // 7. Thử đọc giá ETH
    console.log("\n7. Đọc giá ETH:");
    try {
      const [price, roundId, updatedAt] = await aggregator.getPrice("ETH");
      console.log("   Raw price:", price.toString());
      console.log("   Round ID:", roundId.toString());
      console.log("   Updated At:", updatedAt.toString());
      
      if (roundId > 0) {
        const priceUSD = Number(price) / 1e8;
        const date = new Date(Number(updatedAt) * 1000);
        console.log("   ✅ Price USD: $" + priceUSD.toFixed(2));
        console.log("   ✅ Updated:", date.toLocaleString());
      } else {
        console.log("   ⚠️  No data yet (roundId = 0)");
      }
    } catch (error) {
      console.log("   ❌ Error:", error.message);
    }
    
    // 8. Kiểm tra tất cả symbols
    console.log("\n8. Tất cả symbols:");
    const symbols = await aggregator.getAllSymbols();
    console.log("   Symbols:", symbols);
    
    // 9. Kiểm tra các jobs đang update vào contract nào
    console.log("\n9. Kiểm tra jobs trong file TOML:");
    const jobFiles = ["job-eth.toml", "job-weth.toml", "job-usdc.toml", "job-dai-simple.toml", "job-link.toml"];
    for (const file of jobFiles) {
      const filePath = `./chainlink-data/${file}`;
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        const match = content.match(/to="(0x[a-fA-F0-9]{40})"/);
        if (match) {
          const jobContract = match[1];
          const matches = jobContract.toLowerCase() === data.aggregator.toLowerCase();
          console.log(`   ${file}: ${jobContract} ${matches ? '✅' : '❌ (KHÔNG KHỚP)'}`);
        }
      }
    }
    
  } catch (error) {
    console.log("❌ Error reading contract:", error.message);
    console.error(error);
  }
}

main().catch(console.error);

