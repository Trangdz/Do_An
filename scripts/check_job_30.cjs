const axios = require("axios");
const fs = require("fs");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
  
  const loginRes = await api.post("/sessions", { email, password });
  const cookie = loginRes.headers["set-cookie"];
  const headers = { "Cookie": cookie ? cookie.join("; ") : "" };
  
  const runsRes = await api.get("/v2/jobs/30/runs", { headers });
  const runs = runsRes.data.data || [];
  
  console.log(`=== Job 30 (DAI) Runs (${runs.length} total) ===`);
  if (runs.length > 0) {
    const latest = runs[0];
    console.log(`\nLatest Run:`);
    console.log(`  Status: ${latest.attributes?.status}`);
    console.log(`  Errors:`, latest.attributes?.errors || "none");
    
    if (latest.attributes?.taskRuns) {
      latest.attributes.taskRuns.forEach((task, i) => {
        console.log(`\n  Task ${i+1}: ${task.type}`);
        if (task.error) {
          console.log(`    ❌ Error: ${task.error}`);
        }
        if (task.output) {
          const output = typeof task.output === 'string' ? task.output.substring(0, 150) : JSON.stringify(task.output).substring(0, 150);
          console.log(`    Output: ${output}${output.length >= 150 ? '...' : ''}`);
        }
      });
    }
  }
})();

