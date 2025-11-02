const { ethers } = require("hardhat");
const fs = require("fs");
const axios = require("axios");

const CL_API_URL = "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  console.log("\n🔍 DIAGNOSTIC: Checking why prices aren't updating...\n");
  
  // 1. Check aggregator addresses
  console.log("1️⃣ Checking aggregator addresses...");
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8"));
  console.log("   Aggregators:", aggregators.aggregators);
  
  // 2. Check if node is authorized
  console.log("\n2️⃣ Checking if Chainlink node is authorized...");
  const NODE_ADDRESS = "0xD0d849E6C1eF1b2dDD174f05f779F883546d6133";
  
  for (const [symbol, addr] of Object.entries(aggregators.aggregators)) {
    try {
      const aggregator = await ethers.getContractAt("PriceAggregator", addr);
      const isAuthorized = await aggregator.isWriter(NODE_ADDRESS);
      console.log(`   ${symbol}: ${isAuthorized ? "✅ Authorized" : "❌ NOT authorized"}`);
    } catch (err) {
      console.log(`   ${symbol}: ⚠️  Error checking - ${err.message}`);
    }
  }
  
  // 3. Check Chainlink jobs
  console.log("\n3️⃣ Checking Chainlink jobs...");
  try {
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"];
    const headers = { Cookie: cookie };
    
    const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, { headers });
    const jobs = jobsRes.data.data || [];
    
    console.log(`   Found ${jobs.length} jobs`);
    
    for (const job of jobs.slice(-5)) {
      const runsRes = await axios.get(`${CL_API_URL}/v2/jobs/${job.id}/runs`, {
        headers,
        params: { size: 1 }
      });
      
      const runs = runsRes.data.data || [];
      if (runs.length > 0) {
        const run = runs[0];
        const status = run.attributes.status;
        console.log(`   Job ${job.id} (${job.attributes.name}): ${status.toUpperCase()}`);
        
        if (status === 'errored') {
          const runDetails = await axios.get(`${CL_API_URL}/v2/runs/${run.id}`, { headers });
          const tasks = runDetails.data.data?.attributes?.taskRuns || [];
          for (const task of tasks) {
            if (task.status === 'errored') {
              console.log(`      ❌ ${task.type}: ${task.error || 'Unknown error'}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message}`);
  }
  
  // 4. Check prices in aggregators
  console.log("\n4️⃣ Checking prices in aggregators...");
  for (const [symbol, addr] of Object.entries(aggregators.aggregators)) {
    try {
      const aggregator = await ethers.getContractAt("AggregatorV3Interface", addr);
      const latestRound = await aggregator.latestRoundData().catch(() => null);
      if (latestRound && latestRound.answer > 0n) {
        const price = Number(latestRound.answer) / 1e8;
        console.log(`   ${symbol}: ✅ $${price.toFixed(2)}`);
      } else {
        console.log(`   ${symbol}: ⚠️  No price data yet`);
      }
    } catch (err) {
      console.log(`   ${symbol}: ❌ Error - ${err.message}`);
    }
  }
  
  console.log("\n");
}

main().catch(console.error);



