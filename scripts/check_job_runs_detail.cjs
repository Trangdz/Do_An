const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Check detailed job runs to see what's happening
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

  console.log("=== Checking Job Runs Detail ===\n");

  try {
    // Login
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    const headers = {
      "Content-Type": "application/json",
      "Cookie": cookie ? cookie.join("; ") : ""
    };

    // Get all jobs
    const jobsRes = await api.get("/v2/jobs", { headers });
    const jobs = jobsRes.data.data || [];

    const priceJobs = jobs.filter(j => 
      j.attributes.name.includes("ETH") || 
      j.attributes.name.includes("WETH") || 
      j.attributes.name.includes("USDC") || 
      j.attributes.name.includes("DAI") || 
      j.attributes.name.includes("LINK")
    );

    for (const job of priceJobs) {
      console.log(`\n📌 ${job.attributes.name} (ID: ${job.id})`);
      console.log("─".repeat(50));

      // Get recent runs
      const runsRes = await api.get(`/v2/jobs/${job.id}/runs?size=3`, { headers });
      const runs = runsRes.data.data || [];

      if (runs.length === 0) {
        console.log("   ⚠️  No runs found");
        continue;
      }

      for (let i = 0; i < Math.min(3, runs.length); i++) {
        const run = runs[i];
        const status = run.attributes.status || "unknown";
        const createdAt = run.attributes.createdAt ? new Date(run.attributes.createdAt) : null;
        const finishedAt = run.attributes.finishedAt ? new Date(run.attributes.finishedAt) : null;
        const errors = run.attributes.errors || [];
        const taskRuns = run.attributes.taskRuns || [];

        console.log(`\n   Run #${i + 1}:`);
        console.log(`   Status: ${status}`);
        if (createdAt) {
          const age = Math.floor((Date.now() - createdAt.getTime()) / 1000);
          console.log(`   Created: ${age}s ago`);
        }
        if (finishedAt) {
          const duration = Math.floor((finishedAt.getTime() - (createdAt?.getTime() || finishedAt.getTime())) / 1000);
          console.log(`   Duration: ${duration}s`);
        }

        if (errors.length > 0) {
          console.log(`   ❌ Errors (${errors.length}):`);
          errors.forEach(err => {
            console.log(`      - ${err}`);
          });
        }

        // Check task runs
        if (taskRuns.length > 0) {
          console.log(`   Tasks (${taskRuns.length}):`);
          taskRuns.forEach((task, idx) => {
            const taskType = task.type || "unknown";
            const taskStatus = task.status || "unknown";
            const taskError = task.error || null;
            console.log(`      ${idx + 1}. ${taskType}: ${taskStatus}`);
            if (taskError) {
              console.log(`         Error: ${taskError}`);
            }
          });
        }
      }
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












