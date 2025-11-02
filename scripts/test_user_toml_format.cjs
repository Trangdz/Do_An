const fs = require("fs");
const axios = require("axios");

const email = process.env.CL_EMAIL || "phamlendhub@email.com";
const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
const apiUrl = process.env.CL_API_URL || "http://localhost:6688";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🧪 TEST FORMAT TOML MỚI (User đề xuất)                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  const aggregatorAddr = aggregators.ETH;

  console.log(`📋 Testing với ETH Aggregator: ${aggregatorAddr}\n`);

  // Format user đề xuất
  const toml = `type            = "cron"
schemaVersion   = 1
name            = "ETH/USD Feed Test"
schedule        = "@every 1m"

observationSource = """
fetch    [type=http method=GET url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type=jsonparse path="price" data="$(fetch)"]
multiply [type=multiply input="$(parse)" times=100000000]
jsonstr  [type="concat" values="{\\"answer_\\":" "$(multiply)"}"]
jsonobj  [type="jsonparse" data="$(jsonstr)"]
encode   [type=ethabiencode abi="updateAnswer(int256)" data="$(jsonobj)"]
submit   [type=ethtx to="${aggregatorAddr}" data="$(encode)"]

fetch -> parse -> multiply -> jsonstr -> jsonobj -> encode -> submit
"""`;

  console.log("📝 TOML Definition:");
  console.log("─".repeat(70));
  console.log(toml);
  console.log("\n");

  // Login
  try {
    const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
    const cookie = loginRes.headers["set-cookie"];

    console.log("🔐 Đang tạo job test...\n");

    try {
      const createRes = await axios.post(
        `${apiUrl}/v2/jobs`,
        { toml },
        { headers: { Cookie: cookie } }
      );
      console.log("✅ Job tạo thành công!");
      console.log(`   Job ID: ${createRes.data.data.id}`);
      console.log("\n💡 Format này hoạt động! Có thể thay thế format hiện tại.");
      
      // Optionally delete test job
      console.log("\n🗑️  Xóa job test? (y/n)");
      // Auto delete after 5 seconds
      setTimeout(async () => {
        try {
          await axios.delete(`${apiUrl}/v2/jobs/${createRes.data.data.id}`, {
            headers: { Cookie: cookie }
          });
          console.log("✅ Đã xóa job test");
        } catch {}
      }, 5000);
      
    } catch (error) {
      console.log("❌ Lỗi tạo job:");
      const errorDetail = error.response?.data?.errors?.[0]?.detail || error.message;
      console.log(`   ${errorDetail}\n`);
      
      if (errorDetail.includes("unmarshal") || errorDetail.includes("parse")) {
        console.log("⚠️  Vấn đề: TOML parsing error");
        console.log("   → Có thể do cách escape quotes trong concat task");
        console.log("   → Thử format hiện tại (array + functionSignature) đang hoạt động tốt");
      }
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối Chainlink:", err.message);
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ TEST HOÀN TẤT                                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);



