const fs = require("fs");
const axios = require("axios");

const JOBS = [
  { symbol: "ETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
  { symbol: "USDC", url: "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT", path: "price" },
  { symbol: "DAI", url: "https://api.binance.com/api/v3/ticker/price?symbol=DAIUSDT", path: "price" },
  { symbol: "LINK", url: "https://api.binance.com/api/v3/ticker/price?symbol=LINKUSDT", path: "price" },
  { symbol: "WETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
];

async function main() {
  const apiUrl = "http://localhost:6688";
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

  const loginRes = await axios.post(`${apiUrl}/sessions`, { 
    email: "node1@lendhub.com", 
    password: "Node1SecureUIPass!23" 
  });
  const cookie = loginRes.headers["set-cookie"];
  
  console.log("🔗 Creating jobs for Node 1 (Binance source)...\n");

  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol] || aggregators['ETH'];
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.symbol}/USD Node1"
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
  
  console.log("\n✅ Node 1 jobs created!");
  console.log("Check: http://localhost:6688 → Jobs");
}

main().catch((e) => { console.error(e); process.exit(1); });






