const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔍 KIỂM TRA CHAINLINK JOB RUNS                          ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  
  try {
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"];
    
    const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, {
      headers: { Cookie: cookie }
    });
    
    const jobs = jobsRes.data.data || [];
    console.log(`📋 Tìm thấy ${jobs.length} jobs:\n`);
    
    for (const job of jobs) {
      const jobId = job.id;
      const jobName = job.attributes.name;
      
      console.log(`\n${jobName} (ID: ${jobId})`);
      console.log("─".repeat(70));
      
      try {
        const runsRes = await axios.get(
          `${CL_API_URL}/v2/jobs/${jobId}/runs`,
          { headers: { Cookie: cookie } }
        );
        
        const runs = runsRes.data.data || [];
        
        if (runs.length === 0) {
          console.log("  ⚠️  Chưa có runs nào");
        } else {
          console.log(`  📊 Tổng số runs: ${runs.length}`);
          console.log(`  📋 Latest runs (tối đa 5):\n`);
          
          const latestRuns = runs.slice(0, 5);
          for (const run of latestRuns) {
            const status = run.attributes.status || "unknown";
            const createdAt = new Date(run.attributes.createdAt).toLocaleString();
            const finishedAt = run.attributes.finishedAt 
              ? new Date(run.attributes.finishedAt).toLocaleString() 
              : "Chưa hoàn thành";
            
            console.log(`    Run ID: ${run.id}`);
            console.log(`      Status: ${status}`);
            console.log(`      Created: ${createdAt}`);
            console.log(`      Finished: ${finishedAt}`);
            
            if (status === "errored") {
              const errors = run.attributes.errors || [];
              if (errors.length > 0) {
                console.log(`      ❌ Error: ${JSON.stringify(errors[0], null, 2)}`);
              }
            } else if (status === "completed") {
              console.log(`      ✅ Completed successfully`);
            } else if (status === "in_progress") {
              console.log(`      ⏳ Đang chạy...`);
            }
            
            console.log("");
          }
        }
      } catch (error) {
        console.log(`  ❌ Lỗi lấy runs: ${error.message}`);
      }
    }
    
    console.log("\n╔════════════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ KIỂM TRA HOÀN TẤT                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");
    
  } catch (error) {
    console.error("❌ Lỗi:", error.response?.data || error.message);
  }
}

main().catch(console.error);
