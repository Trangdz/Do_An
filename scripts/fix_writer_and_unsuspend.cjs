const hre = require("hardhat");
const fs = require("fs");
const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";

// Read credentials
function getCredentials() {
  const apiFile = "./chainlink-data/.api";
  if (fs.existsSync(apiFile)) {
    const lines = fs.readFileSync(apiFile, "utf8").trim().split("\n");
    return {
      email: lines[0] || "phamlendhub@email.com",
      password: lines[1] || "SuperSecretUIpass!@#"
    };
  }
  return {
    email: "phamlendhub@email.com",
    password: "SuperSecretUIpass!@#"
  };
}

async function checkAndSetWriter() {
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const [deployer] = await hre.ethers.getSigners();
  
  // Get current writer
  let currentWriter;
  try {
    currentWriter = await aggregator.writer();
    console.log("Current writer:", currentWriter);
  } catch (err) {
    console.log("Error getting writer:", err.message);
    currentWriter = "0x0000000000000000000000000000000000000000";
  }
  
  // Get Chainlink node address (use the one that's actually sending transactions)
  const nodeAddress = "0x3e058341c9f39Ee3fc80B9ED2BA12e0fca04f8C5"; // From logs
  
  console.log("\nSetting writer to:", nodeAddress);
  
  if (currentWriter.toLowerCase() !== nodeAddress.toLowerCase()) {
    const tx = await aggregator.connect(deployer).setWriter(nodeAddress, true);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Writer set successfully!");
    
    // Verify
    const newWriter = await aggregator.writer();
    console.log("New writer:", newWriter);
  } else {
    console.log("✅ Writer already set correctly!");
  }
}

async function unsuspendJobs() {
  const { email, password } = getCredentials();
  
  console.log("\n🔐 Logging into Chainlink API...");
  const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
    email: email,
    password: password
  });
  
  const cookie = loginRes.headers["set-cookie"];
  if (!cookie) {
    throw new Error("No cookie received from login");
  }

  console.log("📋 Getting all jobs...");
  const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, {
    headers: { Cookie: cookie }
  });
  
  const jobs = jobsRes.data?.data || [];
  console.log(`Found ${jobs.length} jobs`);
  
  for (const job of jobs) {
    const jobId = job.id;
    const jobName = job.attributes.name;
    const spec = job.attributes;
    
    // Check if job is suspended
    if (spec.suspended === true) {
      console.log(`\n⚠️  Job ${jobId} (${jobName}) is SUSPENDED`);
      console.log(`   Unsuspending...`);
      
      try {
        const unsuspendRes = await axios.patch(
          `${CL_API_URL}/v2/jobs/${jobId}`,
          { suspended: false },
          { headers: { Cookie: cookie } }
        );
        console.log(`   ✅ Job ${jobId} unsuspended!`);
      } catch (err) {
        console.log(`   ❌ Error unsuspending job ${jobId}: ${err.message}`);
      }
    } else {
      console.log(`✅ Job ${jobId} (${jobName}) is active`);
    }
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Fix Writer and Unsuspend Jobs");
  console.log("=".repeat(60));
  
  await checkAndSetWriter();
  await unsuspendJobs();
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Complete!");
  console.log("=".repeat(60));
}

main().catch(console.error);

