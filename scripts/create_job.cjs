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

async function main() {
  const email = process.env.CL_EMAIL || "phamlendhub@email.com";
  const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
  const apiUrl = process.env.CL_API_URL || "http://localhost:6688";
  const jobFile = process.env.JOB_FILE || "chainlink-data/job-simple.toml";

  console.log("API:", apiUrl);
  console.log("Job file:", jobFile);

  // 1) Login to get session cookie
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  console.log("Logged in");

  // 2) Read job TOML
  const toml = fs.readFileSync(jobFile, "utf8");
  console.log("Job spec:\n", toml);

  // 3) Create job
  const createRes = await axios.post(
    `${apiUrl}/v2/jobs`,
    { toml },
    { headers: { Cookie: cookie } }
  );
  console.log("Job created:", createRes.data.data.id);
}

main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});

