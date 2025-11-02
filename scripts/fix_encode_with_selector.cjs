const fs = require("fs");
const axios = require("axios");
const { ethers } = require("ethers");

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

// Function selector for updateAnswer(int256)
const UPDATE_ANSWER_SELECTOR = "0xa87a20ce"; // keccak256("updateAnswer(int256)").substring(0, 10)

async function main() {
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  
  // Delete all
  console.log("🗑️  Deleting all jobs...\n");
  const jobsRes = await axios.get(`${apiUrl}/v2/jobs`, { headers: { Cookie: cookie } });
  for (const job of jobsRes.data.data || []) {
    await axios.delete(`${apiUrl}/v2/jobs/${job.id}`, { headers: { Cookie: cookie } });
  }
  
  // Create with manual encoding
  console.log("📝 Creating jobs with MANUAL encoding (selector + data)...\n");
  console.log(`Function selector: ${UPDATE_ANSWER_SELECTOR}\n`);
  
  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) continue;

    // SOLUTION: Manually create function call data
    // Selector (4 bytes) + encoded int256 (32 bytes)
    // Multiply output is string, need to format as hex
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.name}"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
hexlify  [type="ethhex" data="$(multiply)"]
concat   [type="concat" input="[\\"${UPDATE_ANSWER_SELECTOR}\\", $(hexlify)]"]
submit   [type="ethtx" to="${aggregatorAddr}" data="$(concat)"]
fetch -> parse -> multiply -> hexlify -> concat -> submit
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

  console.log("\n✅ Done!");
}

main().catch(console.error);



