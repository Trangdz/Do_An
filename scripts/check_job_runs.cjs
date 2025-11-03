const axios = require("axios");
const fs = require("fs");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
  
  // Login and get cookie
  const loginRes = await api.post("/sessions", { email, password });
  const cookie = loginRes.headers["set-cookie"];
  
  // Get jobs with cookie
  const jobsRes = await api.get("/v2/jobs", {
    headers: { "Cookie": cookie ? cookie.join("; ") : "" }
  });
  console.log("=== Jobs ===");
  jobsRes.data.data.forEach(job => {
    console.log(`Job ID: ${job.id}, Name: ${job.name}, Type: ${job.type}`);
  });
  
  if (jobsRes.data.data.length === 0) {
    console.log("No jobs found!");
    return;
  }
  
  // Get job runs for first job
  const jobId = jobsRes.data.data[0].id;
  console.log("\n=== Job Runs for Job " + jobId + " ===");
  
  const runsRes = await api.get("/v2/jobs/" + jobId + "/runs", {
    headers: { "Cookie": cookie ? cookie.join("; ") : "" }
  });
  const runs = runsRes.data.data;
  
  if (runs.length === 0) {
    console.log("No runs yet. Job may be waiting for schedule.");
    return;
  }
  
  // Show last 5 runs
  console.log(`Found ${runs.length} runs. Showing last 5:\n`);
  runs.slice(0, 5).forEach((run, idx) => {
    console.log(`--- Run ${idx + 1} ---`);
    console.log(`Status: ${run.status}`);
    console.log(`Created At: ${run.createdAt}`);
    console.log(`Finished At: ${run.finishedAt || "Not finished"}`);
    
    if (run.errors && run.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      run.errors.forEach(err => {
        console.log(`  - ${err.message || err}`);
      });
    }
    
    if (run.outputs && run.outputs.length > 0) {
      console.log(`\nOutputs:`, JSON.stringify(run.outputs, null, 2));
    }
    
    console.log("");
  });
})();
