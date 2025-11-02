const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function main() {
  console.log("\n🔍 Checking Chainlink jobs...\n");
  
  try {
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"];
    
    const jobsRes = await axios.get(`${CL_API_URL}/v2/jobs`, {
      headers: { Cookie: cookie }
    });
    
    const jobs = jobsRes.data.data || [];
    console.log(`Found ${jobs.length} jobs:\n`);
    
    for (const job of jobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Name: ${job.attributes.name}`);
      console.log(`  Type: ${job.attributes.type}`);
      console.log(`  Created: ${new Date(job.attributes.createdAt).toLocaleString()}`);
      console.log("");
    }
    
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

main().catch(console.error);



