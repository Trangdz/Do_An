const axios = require("axios");
const fs = require("fs");

(async () => {
  try {
    const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
    const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
    
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    
    const jobsRes = await api.get("/v2/jobs", {
      headers: { "Cookie": cookie ? cookie.join("; ") : "" }
    });
    
    console.log("=== JOBS ===");
    jobsRes.data.data.forEach((job, idx) => {
      console.log(`\nJob ${idx + 1}:`);
      console.log(`  ID: ${job.id}`);
      console.log(`  Name: ${job.name}`);
      console.log(`  Type: ${job.type}`);
      console.log(`  Status: ${job.status}`);
      
      if (job.jobSpec) {
        console.log(`  Observation Source:`);
        const obs = job.jobSpec.observationSource;
        const lines = obs.split("\n");
        lines.forEach((line, i) => {
          if (line.includes("encode")) {
            console.log(`    Line ${i + 1}: ${line.trim()}`);
          }
        });
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
})();


