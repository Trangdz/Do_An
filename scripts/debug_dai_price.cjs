const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== DEBUG DAI PRICE ===");
  console.log("");
  
  const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", data.aggregator);
  
  console.log("Contract:", data.aggregator);
  console.log("");
  
  // Đọc giá DAI raw
  try {
    const [price, roundId, updatedAt] = await aggregator.getPrice("DAI");
    console.log("1. DAI Raw Data:");
    console.log("   Price (raw int256):", price.toString());
    console.log("   Round ID:", roundId.toString());
    console.log("   Updated At:", updatedAt.toString());
    
    const priceNum = Number(price);
    console.log("   Price (Number):", priceNum);
    
    if (priceNum === 0) {
      console.log("");
      console.log("⚠️  VẤN ĐỀ: Giá = 0!");
      console.log("");
    } else {
      const priceUSD = priceNum / 1e8;
      console.log("   Price (USD):", priceUSD);
    }
    
    // Kiểm tra job DAI
    console.log("");
    console.log("2. Kiểm tra job DAI logic:");
    const jobContent = fs.readFileSync("./chainlink-data/job-dai-simple.toml", "utf8");
    console.log("   Job file: job-dai-simple.toml");
    
    // Tìm URL
    const urlMatch = jobContent.match(/url="([^"]+)"/);
    if (urlMatch) {
      console.log("   URL:", urlMatch[1]);
      
      // Test API call
      try {
        const https = require("https");
        const url = new URL(urlMatch[1]);
        
        console.log("");
        console.log("3. Test API call:");
        const https = require("https");
        https.get(`https://api.binance.com/api/v3/ticker/price?symbol=USDTDAI`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            const json = JSON.parse(data);
            console.log("   API Response:", json);
            if (json.price) {
              const apiPrice = parseFloat(json.price);
              console.log("   API Price (USDT/DAI):", apiPrice);
              console.log("   Should be: 1 /", apiPrice, "=", 1 / apiPrice);
              console.log("   In 8 decimals:", Math.round((1 / apiPrice) * 1e8));
              console.log("   As int256:", BigInt(Math.round((1 / apiPrice) * 1e8)).toString());
            }
          });
        }).on('error', (err) => {
          console.log("   API Error:", err.message);
        });
      } catch (apiErr) {
        console.log("   Could not test API:", apiErr.message);
      }
    }
    
    // Kiểm tra job pipeline
    console.log("");
    console.log("4. Job Pipeline:");
    const lines = jobContent.split("\n");
    lines.forEach((line, idx) => {
      if (line.trim() && !line.trim().startsWith("#") && line.trim() !== '"""') {
        console.log(`   ${idx + 1}. ${line.trim()}`);
      }
    });
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    console.error(error);
  }
}

main().catch(console.error);

