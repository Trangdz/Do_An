const fs = require("fs");
const axios = require("axios");

const JOBS = [
  { symbol: "ETH", url: "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", path: "USD" },
  { symbol: "USDC", url: "https://min-api.cryptocompare.com/data/price?fsym=USDC&tsyms=USD", path: "USD" },
  { symbol: "DAI", url: "https://min-api.cryptocompare.com/data/price?fsym=DAI&tsyms=USD", path: "USD" },
  { symbol: "LINK", url: "https://min-api.cryptocompare.com/data/price?fsym=LINK&tsyms=USD", path: "USD" },
  { symbol: "WETH", url: "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", path: "USD" },
];

async function main() {
  const apiUrl = "http://localhost:6689";  // Node 2 port
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

  const loginRes = await axios.post(`${apiUrl}/sessions`, { 
    email: "node2@lendhub.com", 
    password: "Node2SecureUIPass!56" 
  });
  const cookie = loginRes.headers["set-cookie"];
  
  console.log("🔗 Creating jobs for Node 2 (CryptoCompare source)...\n");

  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol] || aggregators['ETH'];
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.symbol}/USD Node2"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256 answer)" data="<[ $(multiply) ]>"]
submit   [type="ethtx" to="${aggregatorAddr}" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const res = await axios.post(`${apiUrl}/v2/jobs`, { toml }, { headers: { Cookie: cookie } });
      console.log(`✅ ${job.symbol.padEnd(5)}/USD: Job ID ${res.data.data.id}`);
    } catch (e) {
      console.error(`❌ ${job.symbol}:`, e.response?.data?.errors || e.message);
    }
  }
  
  console.log("\n✅ Node 2 jobs created!");
  console.log("Check: http://localhost:6689 → Jobs");
}

main().catch((e) => { console.error(e); process.exit(1); });








