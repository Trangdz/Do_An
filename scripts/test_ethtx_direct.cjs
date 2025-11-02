// Test: Dùng ethtx với data trực tiếp là JSON object
// Chainlink 1.13.0 có thể cần format khác

const axios = require("axios");
const fs = require("fs");

const CL_API_URL = "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json"));

async function main() {
  // Login
  const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
    email: CL_EMAIL,
    password: CL_PASSWORD
  });
  const cookie = loginRes.headers["set-cookie"];
  const headers = { Cookie: cookie };

  // Test với ETH - dùng json task để tạo object
  const testJob = {
    name: "TEST-ETH-Direct",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
    path: "price",
    symbol: "ETH",
    aggregatorAddr: aggregators.ETH
  };

  // Thử: dùng json task để tạo object {answer: value}
  const toml = `type = "cron"
schemaVersion = 1
name = "${testJob.name}"
schedule = "@every 2m"
observationSource = """
fetch    [type="http" method="GET" url="${testJob.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${testJob.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
jsonobj  [type="json" data="{\\"answer\\": $(multiply)}"]
encode   [type="ethabiencode" abi="updateAnswer(int256)" data="$(jsonobj)"]
submit   [type="ethtx" to="${testJob.aggregatorAddr}" data="$(encode)"]
fetch -> parse -> multiply -> jsonobj -> encode -> submit
"""`;

  console.log("📝 Creating test job with JSON object format...\n");
  console.log("Format: json task → ethabiencode with function ABI\n");

  try {
    const res = await axios.post(`${CL_API_URL}/v2/jobs`, { toml }, { headers });
    console.log(`✅ Test job created: ID ${res.data.data.id}\n`);
    console.log("⏰ Wait 2 minutes to see result...\n");
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

main().catch(console.error);

