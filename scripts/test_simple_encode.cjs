const fs = require("fs");
const axios = require("axios");

const email = process.env.CL_EMAIL || "phamlendhub@email.com";
const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
const apiUrl = process.env.CL_API_URL || "http://localhost:6688";

async function main() {
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  
  // Test với 1 job đơn giản - thử nhiều format
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  const aggregatorAddr = aggregators["ETH"];
  
  console.log("\n🧪 TESTING DIFFERENT ENCODE FORMATS\n");
  
  const formats = [
    {
      name: "Format 1: (int256) with array [$(multiply)]",
      toml: `type = "directrequest"
schemaVersion = 1
observationSource = """
fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="price" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256)" data="[$(multiply)]"]
"""
`
    },
    {
      name: "Format 2: (int256) with direct value $(multiply)",
      toml: `type = "directrequest"
schemaVersion = 1
observationSource = """
fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="price" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256)" data="$(multiply)"]
"""
`
    },
    {
      name: "Format 3: updateAnswer(int256) with direct value",
      toml: `type = "directrequest"
schemaVersion = 1
observationSource = """
fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="price" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="updateAnswer(int256)" data="$(multiply)"]
"""
`
    }
  ];
  
  for (const format of formats) {
    console.log(`\nTesting: ${format.name}`);
    try {
      const res = await axios.post(
        `${apiUrl}/v2/jobs`,
        { toml: format.toml },
        { headers: { Cookie: cookie } }
      );
      console.log(`  ✅ Created job ID: ${res.data.data.id}`);
      
      // Delete test job
      await axios.delete(`${apiUrl}/v2/jobs/${res.data.data.id}`, { headers: { Cookie: cookie } });
    } catch (error) {
      const errorDetail = error.response?.data?.errors?.[0]?.detail || '';
      console.log(`  ❌ Error: ${errorDetail.substring(0, 100)}`);
    }
  }
  
  console.log("\n");
}

main().catch(console.error);



