const axios = require("axios");
const fs = require("fs");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
  
  // Login
  const loginRes = await api.post("/sessions", { email, password });
  const cookie = loginRes.headers["set-cookie"];
  const headers = { "Cookie": cookie ? cookie.join("; ") : "" };
  
  // Get job 21 runs
  const runsRes = await api.get("/v2/jobs/21/runs", { headers });
  const runs = runsRes.data.data || [];
  
  console.log(`=== Job 21 Runs (${runs.length} total) ===`);
  if (runs.length > 0) {
    const latest = runs[0];
    console.log(`\nLatest Run:`);
    console.log(`  Status: ${latest.attributes?.status}`);
    console.log(`  Errors:`, latest.attributes?.errors || "none");
    console.log(`  Tasks:`, latest.attributes?.taskRuns?.length || 0);
    if (latest.attributes?.taskRuns) {
      latest.attributes.taskRuns.forEach((task, i) => {
        console.log(`\n  Task ${i+1}: ${task.type}`);
        if (task.error) console.log(`    Error: ${task.error}`);
        if (task.output) {
          const output = typeof task.output === 'string' ? task.output.substring(0, 100) : JSON.stringify(task.output).substring(0, 100);
          console.log(`    Output: ${output}...`);
        }
      });
    }
  } else {
    console.log("No runs yet");
  }
})();

