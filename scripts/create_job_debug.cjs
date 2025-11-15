const axios = require("axios");
const fs = require("fs");

(async () => {
  try {
    const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
    const jobSpec = fs.readFileSync(process.env.JOB_FILE, "utf8");
    
    console.log("=== DEBUG JOB FILE ===");
    console.log("File:", process.env.JOB_FILE);
    console.log("File length:", jobSpec.length);
    console.log("\n=== Line 10 (encode) ===");
    const lines = jobSpec.split("\n");
    console.log("Line 10:", lines[9]);
    console.log("\n=== Full encode line ===");
    const encodeLine = lines.find(l => l.includes("encode"));
    console.log(encodeLine);
    console.log("\n=== JSON part ===");
    const jsonMatch = encodeLine.match(/data=\{(.+)\}/);
    if (jsonMatch) {
      console.log("JSON part:", jsonMatch[1]);
    }
    
    const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
    
    // Login to get session cookie
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    
    // Create job with cookie - send as JSON with toml field
    const res = await api.post("/v2/jobs", 
      { toml: jobSpec },
      { 
        headers: { 
          "Content-Type": "application/json",
          "Cookie": cookie ? cookie.join("; ") : ""
        } 
      }
    );
    console.log("\n✅ Job created:", res.data.data.id);
  } catch (error) {
    if (error.response && error.response.data && error.response.data.errors) {
      console.error("\n❌ ERROR:", error.response.data.errors[0].detail);
    } else {
      console.error("\n❌ ERROR:", error.message);
    }
    process.exit(1);
  }
})();












