const axios = require("axios");

async function main() {
  console.log("\n🔍 Testing Chainlink Connection to Ganache...\n");
  
  // Test if we can reach Ganache from host
  try {
    const ganacheRes = await axios.post('http://127.0.0.1:7545', {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log("✅ Can reach Ganache from host:");
    console.log(`   Block Number: ${parseInt(ganacheRes.data.result, 16)}\n`);
  } catch (error) {
    console.error("❌ Cannot reach Ganache:", error.message);
    return;
  }
  
  // Test Chainlink API
  try {
    const loginRes = await axios.post('http://localhost:6688/sessions', {
      email: 'phamlendhub@email.com',
      password: 'SuperSecretUIpass!@#'
    });
    
    const cookie = loginRes.headers["set-cookie"]?.join(";") || "";
    console.log("✅ Chainlink API is accessible\n");
    
    // Check jobs
    const jobsRes = await axios.get('http://localhost:6688/v2/jobs', {
      headers: { Cookie: cookie }
    });
    
    const jobs = jobsRes.data.data || [];
    console.log(`📊 Jobs Status:`);
    console.log(`   Total Jobs: ${jobs.length}`);
    
    for (const job of jobs) {
      const name = job.attributes?.name || "Unknown";
      const runs = job.attributes?.runs || 0;
      console.log(`   - ${name}: ${runs} runs`);
    }
    
    // Check if node can connect to Ganache
    console.log(`\n🔗 Checking EVM Connection Status...`);
    const healthRes = await axios.get('http://localhost:6688/health', {
      headers: { Cookie: cookie }
    });
    
    const checks = healthRes.data.data || [];
    const evmCheck = checks.find(c => c.id?.includes('evm'));
    if (evmCheck) {
      console.log(`   EVM Status: ${evmCheck.attributes?.status || 'unknown'}`);
      if (evmCheck.attributes?.status === 'failing') {
        console.log(`   ⚠️  EVM connection is failing - Chainlink cannot reach Ganache`);
      } else {
        console.log(`   ✅ EVM connection OK`);
      }
    }
    
  } catch (error) {
    console.error("❌ Chainlink API error:", error.response?.data || error.message);
  }
}

main().catch(console.error);


