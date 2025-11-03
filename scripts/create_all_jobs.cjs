const axios = require("axios");
const fs = require("fs");
const path = require("path");

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
  
  // Read contract address
  const contractData = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
  const contractAddress = contractData.aggregator;
  
  // Job files to create
  const jobs = [
    { file: "job-eth.toml", name: "ETH" },
    { file: "job-weth.toml", name: "WETH" },
    { file: "job-usdc.toml", name: "USDC" },
    { file: "job-dai.toml", name: "DAI" },
    { file: "job-link.toml", name: "LINK" }
  ];
  
  console.log("=== Creating Jobs ===");
  console.log("Contract:", contractAddress);
  console.log("");
  
  for (const job of jobs) {
    try {
      let jobSpec = fs.readFileSync(path.join("./chainlink-data", job.file), "utf8");
      
      // Replace placeholder with actual contract address if needed
      jobSpec = jobSpec.replace(/to="0x[a-fA-F0-9]{40}"/g, `to="${contractAddress}"`);
      if (!jobSpec.includes(`to="${contractAddress}"`)) {
        // Add to address if not present
        jobSpec = jobSpec.replace(/submit\s+\[type="ethtx"\s+data=/, `submit   [type="ethtx" to="${contractAddress}" data=`);
      }
      
      const res = await api.post("/v2/jobs", 
        { toml: jobSpec },
        { headers }
      );
      
      console.log(`✅ ${job.name}: Job ID ${res.data.data.id}`);
    } catch (error) {
      if (error.response?.data?.errors?.[0]?.detail?.includes("duplicate key")) {
        console.log(`⚠️  ${job.name}: Job already exists (duplicate name)`);
      } else {
        console.error(`❌ ${job.name}:`, error.response?.data?.errors?.[0]?.detail || error.message);
      }
    }
  }
  
  console.log("\n=== Done ===");
})();
