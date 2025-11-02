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
  
  console.log("📋 Fetching existing jobs...\n");
  const jobsRes = await axios.get(`${apiUrl}/v2/jobs`, { headers: { Cookie: cookie } });
  const existingJobs = jobsRes.data.data || [];
  
  console.log(`Found ${existingJobs.length} existing jobs\n`);
  
  // Delete old jobs
  for (const job of existingJobs) {
    const jobName = job.attributes.name;
    if (JOBS.some(j => j.name === jobName)) {
      console.log(`🗑️  Deleting old job: ${jobName} (ID: ${job.id})`);
      try {
        await axios.delete(`${apiUrl}/v2/jobs/${job.id}`, { headers: { Cookie: cookie } });
        console.log(`  ✅ Deleted\n`);
      } catch (error) {
        console.log(`  ❌ Error: ${error.response?.data?.errors?.[0]?.detail || error.message}\n`);
      }
    }
  }
  
  // Create new jobs with correct syntax
  console.log("\n📝 Creating new jobs with correct ABI...\n");
  
  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) {
      console.log(`⚠️  ${job.symbol}: No aggregator found, skipping\n`);
      continue;
    }

    console.log(`Creating job: ${job.name}`);
    console.log(`  Aggregator: ${aggregatorAddr}`);

    const toml = `type = "cron"
schemaVersion = 1
name = "${job.name}"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256)" data="[ $(multiply) ]"]
submit   [type="ethtx" to="${aggregatorAddr}" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const createRes = await axios.post(
        `${apiUrl}/v2/jobs`,
        { toml },
        { headers: { Cookie: cookie } }
      );
      console.log(`  ✅ Job created: ID ${createRes.data.data.id}\n`);
    } catch (error) {
      console.error(`  ❌ Error:`, error.response?.data || error.message);
      console.log();
    }
  }

  console.log("✅ All jobs recreated!");
  console.log("\n⏰ Wait 1-2 minutes, then check frontend Markets page");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



