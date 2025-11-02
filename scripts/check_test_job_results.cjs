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
  
  const testJobIds = [50, 51, 52];
  
  console.log("\n🔍 Checking test job results...\n");
  
  for (const jobId of testJobIds) {
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
      const createdAt = new Date(run.attributes.createdAt).toLocaleString();
      
      console.log(`\nJob ID ${jobId}: ${status} (${createdAt})`);
      
      if (status === 'errored') {
        const runDetails = await axios.get(`${CL_API_URL}/v2/runs/${run.id}`, {
          headers: { Cookie: cookie }
        });
        
        const tasks = runDetails.data.data?.attributes?.taskRuns || [];
        for (const task of tasks) {
          if (task.status === 'errored') {
            console.log(`  ❌ ${task.type}: ${task.error || 'Unknown'}`);
            if (task.type === 'encode') {
              console.log(`     This format FAILED`);
            }
          } else if (task.status === 'completed') {
            console.log(`  ✅ ${task.type}`);
          }
        }
      } else if (status === 'completed') {
        console.log(`  ✅ Job completed successfully!`);
        console.log(`     This format WORKS!`);
      }
    } catch (err) {
      console.log(`Job ${jobId}: Error - ${err.message}`);
    }
  }
  
  console.log("\n");
}

main().catch(console.error);



