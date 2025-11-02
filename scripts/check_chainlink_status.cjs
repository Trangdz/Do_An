const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  console.log("\n🔍 Checking Chainlink Jobs Status...\n");
  
  try {
    // Login
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"]?.join(";") || "";
    
    // Get jobs
    const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, {
      headers: { Cookie: cookie }
    });
    
    const jobs = jobsRes.data.data || [];
    
    if (jobs.length === 0) {
      console.log("⚠️  No jobs found!");
      return;
    }
    
    console.log(`✅ Found ${jobs.length} jobs:\n`);
    
    for (const job of jobs) {
      const name = job.attributes?.name || "Unknown";
      const id = job.id;
      const runs = job.attributes?.runs || 0;
      
      console.log(`📋 Job ${id}: ${name}`);
      console.log(`   Runs: ${runs}`);
      
      // Get job runs
      try {
        const runsRes = await axios.get(`${CL_API_URL}/v2/jobs/${id}/runs`, {
          headers: { Cookie: cookie }
        });
        
        const jobRuns = runsRes.data.data || [];
        if (jobRuns.length > 0) {
          const latest = jobRuns[0];
          const status = latest.attributes?.status || "unknown";
          const error = latest.attributes?.error || null;
          const createdAt = latest.attributes?.createdAt || "";
          
          console.log(`   Latest Run Status: ${status}`);
          console.log(`   Created At: ${createdAt}`);
          if (error) {
            console.log(`   ❌ Error: ${error}`);
          } else {
            console.log(`   ✅ Success`);
          }
        } else {
          console.log(`   ⚠️  No runs yet`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not fetch runs: ${err.message}`);
      }
      
      console.log();
    }
    
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

main().catch(console.error);


