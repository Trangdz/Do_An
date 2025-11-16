const axios = require("axios");
const fs = require("fs");
const path = require("path");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
  
  // Login
  const loginRes = await api.post("/sessions", { email, password });
  const cookie = loginRes.headers["set-cookie"];
  const headers = { 
    "Content-Type": "application/json",
    "Cookie": cookie ? cookie.join("; ") : "" 
  };
  
  // Read contract address
  const contractData = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const contractAddress = contractData.aggregator;
  
  // Job files to create
  const jobs = [
    { file: "job-eth.toml", name: "ETH" },
    { file: "job-weth.toml", name: "WETH" },
    { file: "job-usdc.toml", name: "USDC" },
    { file: "job-dai.toml", name: "DAI" },
    { file: "job-link.toml", name: "LINK" }
  ];
  
  console.log("=== Creating Jobs ===");
  console.log("Contract:", contractAddress);
  console.log("");
  
  for (const job of jobs) {
    try {
      let jobSpec = fs.readFileSync(path.join("./chainlink-data", job.file), "utf8");
      
      // Replace placeholder with actual contract address if needed
      jobSpec = jobSpec.replace(/to="0x[a-fA-F0-9]{40}"/g, `to="${contractAddress}"`);
      if (!jobSpec.includes(`to="${contractAddress}"`)) {
        // Add to address if not present
        jobSpec = jobSpec.replace(/submit\s+\[type="ethtx"\s+data=/, `submit   [type="ethtx" to="${contractAddress}" data=`);
      }
      
      const res = await api.post("/v2/jobs", 
        { toml: jobSpec },
        { headers }
      );
      
      console.log(`✅ ${job.name}: Job ID ${res.data.data.id}`);
    } catch (error) {
      if (error.response?.data?.errors?.[0]?.detail?.includes("duplicate key")) {
        console.log(`⚠️  ${job.name}: Job already exists (duplicate name)`);
      } else {
        console.error(`❌ ${job.name}:`, error.response?.data?.errors?.[0]?.detail || error.message);
      }
    }
  }
  
  console.log("\n=== Done ===");
})();

const JOBS = [
  {
    symbol: "ETH",
    name: "ETH/USD Aggregator",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
    path: "price"
  },
  {
    symbol: "WETH",
    name: "WETH/USD Aggregator",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
    path: "price"
  },
  {
    symbol: "USDC",
    name: "USDC/USD Aggregator", 
    url: "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT",
    path: "price"
  },
  {
    symbol: "DAI",
    name: "DAI/USD Aggregator",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=DAIUSDT",
    path: "price"
  },
  {
    symbol: "LINK",
    name: "LINK/USD Aggregator",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=LINKUSDT",
    path: "price"
  }
];

async function main() {
  const email = process.env.CL_EMAIL || "phamlendhub@email.com";
  const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
  const apiUrl = process.env.CL_API_URL || "http://localhost:6688";

  // Đọc aggregator addresses
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

  // Login
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  console.log("Logged in to Chainlink node\n");

  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) {
      console.log(`⚠️  ${job.symbol}: No aggregator found, skipping`);
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
      const errorDetail = error.response?.data?.errors?.[0]?.detail || '';
      if (errorDetail.includes("already exists") || errorDetail.includes("duplicate key") || errorDetail.includes("idx_jobs_name")) {
        console.log(`  ⚠️  Job already exists, skipping\n`);
      } else {
        console.error(`  ❌ Error:`, error.response?.data || error.message);
        console.log();
      }
    }
  }

  console.log("✅ All jobs created!");
  console.log("\nWait 1-2 minutes, then check frontend Markets page");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});








