const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Check Chainlink jobs status and see if they're running
 */
async function main() {
  // Read credentials
  const apiFile = path.join(__dirname, "../chainlink-data/.api");
  let email, password;
  if (fs.existsSync(apiFile)) {
    const lines = fs.readFileSync(apiFile, "utf8").trim().split("\n");
    email = lines[0] || "phamlendhub@email.com";
    password = lines[1] || "SuperSecretUIpass!@#";
  } else {
    email = "phamlendhub@email.com";
    password = "SuperSecretUIpass!@#";
  }

  const apiUrl = process.env.CL_API_URL || "http://localhost:6688";
  const api = axios.create({ baseURL: apiUrl, withCredentials: true });

  console.log("=== Checking Chainlink Jobs Status ===\n");

  try {
    // Login
    console.log("🔐 Logging in...");
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    const headers = {
      "Content-Type": "application/json",
      "Cookie": cookie ? cookie.join("; ") : ""
    };

    // Get all jobs
    console.log("📋 Fetching jobs...");
    const jobsRes = await api.get("/v2/jobs", { headers });
    const jobs = jobsRes.data.data || [];

    console.log(`\nFound ${jobs.length} job(s):\n`);

    const priceJobs = ["ETH/USD Price", "WETH/USD Price", "USDC/USD Price", "DAI/USD Price", "LINK/USD Price"];

    for (const job of jobs) {
      const name = job.attributes.name;
      if (priceJobs.some(pj => name.includes(pj.split("/")[0]))) {
        const state = job.attributes.state || "unknown";
        const createdAt = new Date(job.attributes.createdAt);
        const errors = job.attributes.errors || [];

        console.log(`📌 ${name}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   State: ${state}`);
        console.log(`   Created: ${createdAt.toLocaleString()}`);
        
        if (errors.length > 0) {
          console.log(`   ⚠️  Errors: ${errors.length}`);
          errors.slice(0, 3).forEach(err => {
            console.log(`      - ${err}`);
          });
        }

        // Get job runs
        try {
          const runsRes = await api.get(`/v2/jobs/${job.id}/runs?size=5`, { headers });
          const runs = runsRes.data.data || [];
          console.log(`   Recent runs: ${runs.length}`);
          
          if (runs.length > 0) {
            const latestRun = runs[0];
            const status = latestRun.attributes.status || "unknown";
            const finishedAt = latestRun.attributes.finishedAt 
              ? new Date(latestRun.attributes.finishedAt)
              : null;
            
            console.log(`   Latest run status: ${status}`);
            if (finishedAt) {
              const age = Math.floor((Date.now() - finishedAt.getTime()) / 1000);
              console.log(`   Last finished: ${age}s ago`);
            }
          } else {
            console.log(`   ⚠️  No runs found - job may not be executing`);
          }
        } catch (err) {
          console.log(`   ⚠️  Could not fetch runs: ${err.message}`);
        }

        console.log("");
      }
    }

    // Check node balance
    console.log("=== Node Balance ===");
    try {
      const keysRes = await api.get("/v2/keys/eth", { headers });
      if (keysRes.data?.data?.length > 0) {
        const nodeAddress = keysRes.data.data[0].attributes.address;
        console.log(`Node address: ${nodeAddress}`);
        
        // Get balance using hardhat
        const hre = require("hardhat");
        const balance = await hre.ethers.provider.getBalance(nodeAddress);
        const balanceEth = hre.ethers.formatEther(balance);
        console.log(`Balance: ${balanceEth} ETH`);
        
        if (parseFloat(balanceEth) < 0.1) {
          console.log("\n⚠️  WARNING: Low balance! Fund the node:");
          console.log(`   npx hardhat run scripts/fund_node.cjs --network ganache`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Could not check balance: ${err.message}`);
    }

  } catch (error) {
    if (error.response) {
      console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error(`   ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);












