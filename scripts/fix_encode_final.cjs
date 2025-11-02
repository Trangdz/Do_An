const fs = require("fs");
const axios = require("axios");

const email = process.env.CL_EMAIL || "phamlendhub@email.com";
const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
const apiUrl = process.env.CL_API_URL || "http://localhost:6688";

const JOBS = [
  { symbol: "ETH", name: "ETH/USD Aggregator", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
  { symbol: "WETH", name: "WETH/USD Aggregator", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
  { symbol: "USDC", name: "USDC/USD Aggregator", url: "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT", path: "price" },
  { symbol: "DAI", name: "DAI/USD Aggregator", url: "https://api.binance.com/api/v3/ticker/price?symbol=DAIUSDT", path: "price" },
  { symbol: "LINK", name: "LINK/USD Aggregator", url: "https://api.binance.com/api/v3/ticker/price?symbol=LINKUSDT", path: "price" }
];

async function main() {
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  
  // Delete all existing jobs
  console.log("🗑️  Deleting all jobs...\n");
  const jobsRes = await axios.get(`${apiUrl}/v2/jobs`, { headers: { Cookie: cookie } });
  for (const job of jobsRes.data.data || []) {
    await axios.delete(`${apiUrl}/v2/jobs/${job.id}`, { headers: { Cookie: cookie } });
  }
  
  // Create jobs with CORRECT format: use array for unnamed parameters
  console.log("📝 Creating jobs with FINAL fix...\n");
  console.log("Format: abi=\"(int256)\" data=\"[$(multiply)]\" (no spaces, array format)\n");
  
  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) continue;

    // Fixed for Chainlink 1.13.0: ethabiencode requires JSON map format
    // Contract function: updateAnswer(int256 answer_)
    // Use {"answer_": value} format - escape double quotes in TOML string
    const jsonDataStr = '{"answer_": $(multiply)}';
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.name}"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="updateAnswer(int256)" data="${jsonDataStr.replace(/"/g, '\\"')}"]
submit   [type="ethtx" to="${aggregatorAddr}" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const createRes = await axios.post(
        `${apiUrl}/v2/jobs`,
        { toml },
        { headers: { Cookie: cookie } }
      );
      console.log(`✅ ${job.symbol}: Job ID ${createRes.data.data.id}`);
    } catch (error) {
      console.error(`❌ ${job.symbol}:`, error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  console.log("\n✅ Done! Check Chainlink UI: http://localhost:6688 → Jobs");
  console.log("⏰ Jobs run every 1 minute");
}

main().catch(console.error);

