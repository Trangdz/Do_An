const axios = require("axios");
const fs = require("fs");

(async () => {
  const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
  const jobSpec = fs.readFileSync(process.env.JOB_FILE, "utf8");
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
  console.log("Job created:", res.data.data.id);
})();
