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
  
  console.log("📋 Fetching ALL existing jobs...\n");
  const jobsRes = await axios.get(`${apiUrl}/v2/jobs`, { headers: { Cookie: cookie } });
  const existingJobs = jobsRes.data.data || [];
  
  console.log(`Found ${existingJobs.length} existing jobs\n`);
  
  // Delete ALL jobs
  for (const job of existingJobs) {
    const jobName = job.attributes.name;
    const jobId = job.id;
    console.log(`🗑️  Deleting job: ${jobName} (ID: ${jobId})`);
    try {
      await axios.delete(`${apiUrl}/v2/jobs/${jobId}`, { headers: { Cookie: cookie } });
      console.log(`  ✅ Deleted\n`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.response?.data?.errors?.[0]?.detail || error.message}\n`);
    }
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create new jobs with CORRECT syntax
  console.log("\n📝 Creating new jobs with CORRECT syntax...\n");
  console.log("Syntax: abi=\"(int256)\" data=\"[ $(multiply) ]\"\n");
  
  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) {
      console.log(`⚠️  ${job.symbol}: No aggregator found, skipping\n`);
      continue;
    }

    console.log(`Creating job: ${job.name}`);
    console.log(`  Aggregator: ${aggregatorAddr}`);

    // SOLUTION: Use ABI without parameter names (int256) and pass as array
    // But Chainlink might need it as object. Let's try using json task properly
    // Actually, according to Chainlink docs: for (int256), use array format
    // The issue might be spacing - try without any spaces
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.name}"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="updateAnswer(int256)" data="$(multiply)"]
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
      const errorDetail = error.response?.data?.errors?.[0]?.detail || '';
      console.error(`  ❌ Error:`, errorDetail || error.response?.data || error.message);
      console.log();
    }
  }

  console.log("✅ All jobs recreated!");
  console.log("\n⏰ Wait 1-2 minutes, then check Markets page");
  console.log("💡 Jobs will run every 1 minute automatically");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

