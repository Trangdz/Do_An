const { ethers } = require("hardhat");
const fs = require("fs");
const axios = require("axios");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔍 KIỂM TRA LOGIC VÀ ĐỊA CHỈ CONTRACT                   ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // 1. Kiểm tra aggregators.json
  console.log("1️⃣  KIỂM TRA aggregators.json:");
  console.log("─".repeat(70));
  let aggregators;
  try {
    const aggFile = fs.readFileSync("deployments/aggregators.json", "utf8");
    aggregators = JSON.parse(aggFile).aggregators;
    console.log("✅ File tồn tại");
    console.log("\n📋 Aggregator addresses:");
    Object.entries(aggregators).forEach(([symbol, addr]) => {
      console.log(`   ${symbol.padEnd(6)}: ${addr}`);
    });
  } catch (err) {
    console.log("❌ Lỗi đọc file:", err.message);
    process.exit(1);
  }

  // 2. Kiểm tra contract trên blockchain
  console.log("\n2️⃣  KIỂM TRA CONTRACT TRÊN BLOCKCHAIN:");
  console.log("─".repeat(70));
  const provider = ethers.provider;
  const PriceAggregatorABI = [
    "function decimals() external view returns (uint8)",
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function latestAnswer() external view returns (int256)",
    "function latestRoundId() external view returns (uint80)"
  ];

  for (const [symbol, address] of Object.entries(aggregators)) {
    try {
      console.log(`\n   ${symbol}:`);
      console.log(`      Address: ${address}`);
      
      // Kiểm tra code tại địa chỉ
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.log(`      ❌ KHÔNG CÓ CODE - Contract chưa được deploy tại địa chỉ này!`);
        continue;
      }
      console.log(`      ✅ Có code (${code.length} bytes)`);

      // Kiểm tra contract interface
      const contract = new ethers.Contract(address, PriceAggregatorABI, provider);
      
      try {
        const decimals = await contract.decimals();
        console.log(`      ✅ decimals(): ${decimals}`);
      } catch (err) {
        console.log(`      ❌ decimals() failed: ${err.message}`);
      }

      try {
        const latestRoundId = await contract.latestRoundId();
        console.log(`      ✅ latestRoundId(): ${latestRoundId.toString()}`);
      } catch (err) {
        console.log(`      ⚠️  latestRoundId() failed (có thể chưa có data): ${err.message}`);
      }

      try {
        const [roundId, answer, , updatedAt] = await contract.latestRoundData();
        console.log(`      ✅ latestRoundData():`);
        console.log(`         Round ID: ${roundId.toString()}`);
        console.log(`         Answer: ${answer.toString()}`);
        console.log(`         Updated At: ${new Date(Number(updatedAt) * 1000).toLocaleString()}`);
      } catch (err) {
        if (err.message.includes("NoData") || err.message.includes("no data")) {
          console.log(`      ⚠️  latestRoundData(): Chưa có data (Chainlink chưa update)`);
        } else {
          console.log(`      ❌ latestRoundData() failed: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`      ❌ Lỗi kiểm tra: ${err.message}`);
    }
  }

  // 3. Kiểm tra Chainlink jobs
  console.log("\n3️⃣  KIỂM TRA CHAINLINK JOBS:");
  console.log("─".repeat(70));
  const email = process.env.CL_EMAIL || "phamlendhub@email.com";
  const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
  const apiUrl = process.env.CL_API_URL || "http://localhost:6688";

  try {
    const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
    const cookie = loginRes.headers["set-cookie"];

    const jobsRes = await axios.get(`${apiUrl}/v2/jobs`, { headers: { Cookie: cookie } });
    const jobs = jobsRes.data.data || [];

    if (jobs.length === 0) {
      console.log("⚠️  Không có jobs nào được tạo");
    } else {
      console.log(`✅ Tìm thấy ${jobs.length} jobs:\n`);
      
      for (const job of jobs) {
        const name = job.attributes.name || "Unknown";
        console.log(`   📋 Job: ${name}`);
        console.log(`      ID: ${job.id}`);
        
        // Parse TOML để lấy địa chỉ aggregator
        const toml = job.attributes.observationSource || "";
        const toMatch = toml.match(/to\s*=\s*["']([^"']+)["']/);
        if (toMatch) {
          const jobAddr = toMatch[1];
          console.log(`      Contract Address: ${jobAddr}`);
          
          // So sánh với aggregators.json
          const foundSymbol = Object.entries(aggregators).find(([_, addr]) => 
            addr.toLowerCase() === jobAddr.toLowerCase()
          );
          
          if (foundSymbol) {
            console.log(`      ✅ Khớp với ${foundSymbol[0]} trong aggregators.json`);
          } else {
            console.log(`      ❌ KHÔNG KHỚP với bất kỳ aggregator nào trong aggregators.json!`);
            console.log(`      ⚠️  Các địa chỉ trong aggregators.json:`);
            Object.entries(aggregators).forEach(([symbol, addr]) => {
              console.log(`         ${symbol}: ${addr}`);
            });
          }
        } else {
          console.log(`      ⚠️  Không tìm thấy địa chỉ contract trong TOML`);
        }
        
        // Kiểm tra job runs
        try {
          const runsRes = await axios.get(
            `${apiUrl}/v2/jobs/${job.id}/runs`,
            { headers: { Cookie: cookie } }
          );
          const runs = runsRes.data.data || [];
          if (runs.length > 0) {
            const latestRun = runs[0];
            const status = latestRun.attributes.status || "unknown";
            const createdAt = new Date(latestRun.attributes.createdAt).toLocaleString();
            console.log(`      Latest Run: ${status} (${createdAt})`);
            
            if (status === "errored") {
              const errors = latestRun.attributes.errors || [];
              if (errors.length > 0) {
                console.log(`      ❌ Error: ${JSON.stringify(errors[0])}`);
              }
            }
          }
        } catch (err) {
          console.log(`      ⚠️  Không thể lấy runs: ${err.message}`);
        }
        
        console.log();
      }
    }
  } catch (err) {
    console.log(`❌ Không thể kết nối Chainlink API: ${err.message}`);
    console.log("   Đảm bảo Chainlink node đang chạy: docker ps | findstr chainlink");
  }

  // 4. Tóm tắt
  console.log("\n4️⃣  TÓM TẮT:");
  console.log("─".repeat(70));
  console.log("✅ Aggregators.json: OK");
  console.log("✅ Contracts on blockchain: Đã kiểm tra");
  console.log("✅ Chainlink jobs: Đã kiểm tra");
  console.log("\n💡 Nếu có lỗi, kiểm tra:");
  console.log("   1. Contract có được deploy đúng địa chỉ không");
  console.log("   2. Chainlink jobs có trỏ đến đúng địa chỉ không");
  console.log("   3. Node address có được authorize không");
  console.log("   4. Node có đủ ETH để gửi transaction không");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



