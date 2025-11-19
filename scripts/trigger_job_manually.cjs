const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Manually trigger a Chainlink job to test if it works
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

  console.log("=== Manually Trigger Chainlink Job ===\n");

  try {
    // Login
    console.log("🔐 Logging in...");
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    const headers = {
      "Content-Type": "application/json",
      "Cookie": cookie ? cookie.join("; ") : ""
    };

    // Get ETH job
    const jobsRes = await api.get("/v2/jobs", { headers });
    const jobs = jobsRes.data.data || [];
    const ethJob = jobs.find(j => j.attributes.name.includes("ETH/USD"));

    if (!ethJob) {
      console.error("❌ ETH/USD job not found");
      process.exit(1);
    }

    console.log(`📌 Found job: ${ethJob.attributes.name} (ID: ${ethJob.id})`);
    console.log("");

    // Trigger the job
    console.log("🚀 Triggering job...");
    const triggerRes = await api.post(`/v2/jobs/${ethJob.id}/runs`, {}, { headers });
    const runId = triggerRes.data.data.id;
    console.log(`✅ Job triggered! Run ID: ${runId}`);
    console.log("");

    // Wait a bit and check status
    console.log("⏳ Waiting 10 seconds for job to execute...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get run details
    console.log("📋 Checking run status...");
    const runRes = await api.get(`/v2/jobs/${ethJob.id}/runs/${runId}`, { headers });
    const run = runRes.data.data;

    console.log(`\nRun Status: ${run.attributes.status || "unknown"}`);
    console.log(`Created: ${new Date(run.attributes.createdAt).toLocaleString()}`);
    if (run.attributes.finishedAt) {
      console.log(`Finished: ${new Date(run.attributes.finishedAt).toLocaleString()}`);
    }

    const errors = run.attributes.errors || [];
    if (errors.length > 0) {
      console.log(`\n❌ Errors (${errors.length}):`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err || "null"}`);
      });
    }

    const taskRuns = run.attributes.taskRuns || [];
    if (taskRuns.length > 0) {
      console.log(`\n📋 Task Details (${taskRuns.length}):`);
      taskRuns.forEach((task, idx) => {
        const taskType = task.type || "unknown";
        const taskStatus = task.status || "unknown";
        const taskError = task.error || null;
        console.log(`   ${idx + 1}. ${taskType}: ${taskStatus}`);
        if (taskError) {
          console.log(`      Error: ${taskError}`);
        }
        if (task.output) {
          console.log(`      Output: ${JSON.stringify(task.output).substring(0, 100)}...`);
        }
      });
    }

    // Check if transaction was sent
    console.log("\n🔍 Checking for new transactions...");
    const hre = require("hardhat");
    const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
    const aggregatorAddress = data.aggregator;
    const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
    const writer = await aggregator.writer();

    const currentBlock = await hre.ethers.provider.getBlockNumber();
    let foundTx = false;

    for (let i = currentBlock; i > Math.max(0, currentBlock - 5); i--) {
      try {
        const block = await hre.ethers.provider.getBlock(i, true);
        if (block && block.transactions) {
          for (const txHash of block.transactions) {
            const tx = await hre.ethers.provider.getTransaction(txHash);
            if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
              if (tx.from.toLowerCase() === writer.toLowerCase()) {
                const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
                console.log(`\n✅ Found transaction from Chainlink node!`);
                console.log(`   Hash: ${txHash}`);
                console.log(`   Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
                console.log(`   Block: ${i}`);
                foundTx = true;
                break;
              }
            }
          }
        }
      } catch (e) {
        // Skip
      }
      if (foundTx) break;
    }

    if (!foundTx) {
      console.log("\n⚠️  No new transaction found from Chainlink node");
      console.log("   The job may have failed or is still processing");
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




