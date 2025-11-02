const fs = require("fs");
const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🔍 KIỂM TRA ĐỊA CHỈ PRICEAGGREGATOR TRONG CHAINLINK JOBS      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Đọc địa chỉ từ aggregators.json
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  console.log("📋 Địa chỉ PriceAggregator từ aggregators.json:");
  console.log("─".repeat(70));
  Object.entries(aggregators).forEach(([symbol, addr]) => {
    console.log(`   ${symbol.padEnd(6)}: ${addr}`);
  });
  console.log("\n");

  // Kiểm tra jobs trên Chainlink
  try {
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"];

    const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, {
      headers: { Cookie: cookie }
    });

    const jobs = jobsRes.data.data || [];
    console.log(`📋 Kiểm tra ${jobs.length} jobs trên Chainlink:\n`);
    console.log("─".repeat(70));

    for (const job of jobs) {
      const name = job.attributes.name || "Unknown";
      const toml = job.attributes.observationSource || "";
      
      // Tìm địa chỉ trong TOML
      const toMatch = toml.match(/to\s*=\s*["']([^"']+)["']/);
      
      console.log(`\n${name}:`);
      if (toMatch) {
        const jobAddr = toMatch[1];
        console.log(`   Địa chỉ trong job: ${jobAddr}`);
        
        // So sánh với aggregators.json
        const foundSymbol = Object.entries(aggregators).find(([symbol, addr]) => 
          addr.toLowerCase() === jobAddr.toLowerCase()
        );
        
        if (foundSymbol) {
          console.log(`   ✅ Khớp với ${foundSymbol[0]} trong aggregators.json`);
        } else {
          console.log(`   ❌ KHÔNG KHỚP với bất kỳ aggregator nào!`);
        }
        
        // Kiểm tra có phải placeholder không
        if (jobAddr.includes("YourAggregatorContractAddress") || jobAddr === "0xYourAggregatorContractAddress") {
          console.log(`   ⚠️  CẢNH BÁO: Đây là placeholder, cần thay bằng địa chỉ thật!`);
        }
      } else {
        console.log(`   ⚠️  Không tìm thấy địa chỉ trong TOML`);
      }
    }
    
    console.log("\n╔════════════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ KIỂM TRA HOÀN TẤT                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("❌ Lỗi:", error.response?.data || error.message);
  }
}

main().catch(console.error);



