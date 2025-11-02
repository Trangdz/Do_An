const axios = require("axios");

const CL_API_URL = "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
    email: CL_EMAIL,
    password: CL_PASSWORD
  });
  const cookie = loginRes.headers["set-cookie"];
  
  console.log("\n🔍 Checking job status (ID: 63-67)...\n");
  
  const jobIds = [63, 64, 65, 66, 67];
  
  for (const jobId of jobIds) {
    try {
      const runsRes = await axios.get(`${CL_API_URL}/v2/jobs/${jobId}/runs`, {
        headers: { Cookie: cookie },
        params: { size: 1 }
      });
      
      const runs = runsRes.data.data || [];
      if (runs.length === 0) {
        console.log(`Job ${jobId}: No runs yet`);
        continue;
      }
      
      const run = runs[0];
      const status = run.attributes.status;
      
      if (status === 'errored') {
        console.log(`\nJob ${jobId}: ❌ ERRORED`);
        
        const runDetails = await axios.get(`${CL_API_URL}/v2/runs/${run.id}`, {
          headers: { Cookie: cookie }
        });
        
        const tasks = runDetails.data.data?.attributes?.taskRuns || [];
        for (const task of tasks) {
          if (task.status === 'errored') {
            console.log(`  ❌ ${task.type}: ${task.error || 'Unknown'}`);
          } else if (task.status === 'completed') {
            console.log(`  ✅ ${task.type}`);
            if (task.type === 'multiply' && task.output) {
              console.log(`     Output: ${task.output}`);
            }
          }
        }
      } else if (status === 'completed') {
        console.log(`Job ${jobId}: ✅ COMPLETED`);
      } else {
        console.log(`Job ${jobId}: ${status.toUpperCase()}`);
      }
    } catch (err) {
      console.log(`Job ${jobId}: Error - ${err.message}`);
    }
  }
  
  console.log("\n");
}

main().catch(console.error);



