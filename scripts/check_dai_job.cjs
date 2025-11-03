const axios = require("axios");
const fs = require("fs");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
  
  // Login
  const loginRes = await api.post("/sessions", { email, password });
  const cookie = loginRes.headers["set-cookie"];
  const headers = { 
    "Content-Type": "application/json",
    "Cookie": cookie ? cookie.join("; ") : "" 
  };
  
  // Get all jobs
  const jobsRes = await api.get("/v2/jobs", { headers });
  const jobs = jobsRes.data.data;
  
  // Find DAI job
  const daiJob = jobs.find(j => j.attributes.name === "DAI/USD Simple");
  
  if (!daiJob) {
    console.log("❌ DAI job not found!");
    return;
  }
  
  console.log("=== DAI Job Info ===");
  console.log("Job ID:", daiJob.id);
  console.log("Name:", daiJob.attributes.name);
  console.log("");
  
  // Get job runs
  const runsRes = await api.get(`/v2/jobs/${daiJob.id}/runs`, { headers, params: { size: 5 } });
  const runs = runsRes.data.data;
  
  console.log(`=== Last ${runs.length} Job Runs ===");
  runs.forEach((run, idx) => {
    console.log(`\n${idx + 1}. Run ID: ${run.id}`);
    console.log(`   Status: ${run.attributes.status}`);
    console.log(`   Created: ${run.attributes.createdAt}`);
    
    if (run.attributes.errors && run.attributes.errors.length > 0) {
      console.log(`   ❌ Errors:`);
      run.attributes.errors.forEach(err => {
        console.log(`      - ${err}`);
      });
    }
    
    if (run.attributes.taskRuns) {
      const taskRuns = run.attributes.taskRuns || [];
      taskRuns.forEach((task, tIdx) => {
        console.log(`   Task ${tIdx + 1}: ${task.type} - ${task.status}`);
        if (task.error) {
          console.log(`      Error: ${task.error}`);
        }
        if (task.output) {
          try {
            const output = typeof task.output === 'string' ? JSON.parse(task.output) : task.output;
            console.log(`      Output: ${JSON.stringify(output).substring(0, 100)}`);
          } catch (e) {
            console.log(`      Output: ${String(task.output).substring(0, 100)}`);
          }
        }
      });
    }
  });
})();

