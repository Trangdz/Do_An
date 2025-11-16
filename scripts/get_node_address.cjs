const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";

// Read credentials from chainlink-data/.api file
function getCredentials() {
  const apiFile = path.join(__dirname, "../chainlink-data/.api");
  if (fs.existsSync(apiFile)) {
    const lines = fs.readFileSync(apiFile, "utf8").trim().split("\n");
    return {
      email: lines[0] || "phamlendhub@email.com",
      password: lines[1] || "SuperSecretUIpass!@#"
    };
  }
  return {
    email: "phamlendhub@email.com",
    password: "SuperSecretUIpass!@#"
  };
}

async function getNodeAddressFromAPI() {
  try {
    const { email, password } = getCredentials();
    
    console.log("🔐 Logging into Chainlink API...");
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: email,
      password: password
    });
    
    const cookie = loginRes.headers["set-cookie"];
    if (!cookie) {
      throw new Error("No cookie received from login");
    }

    console.log("📋 Fetching ETH keys from Chainlink node...");
    const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, {
      headers: { Cookie: cookie }
    });
    
    if (keysRes.data?.data?.length > 0) {
      const address = keysRes.data.data[0].attributes.address;
      console.log("\n✅ Found Chainlink node address:");
      console.log(`   ${address}\n`);
      return address;
    }
    
    return null;
  } catch (err) {
    if (err.response) {
      console.error(`❌ API Error: ${err.response.status} - ${err.response.statusText}`);
      if (err.response.data) {
        console.error(`   ${JSON.stringify(err.response.data)}`);
      }
    } else {
      console.error(`❌ Error: ${err.message}`);
    }
    return null;
  }
}

function getNodeAddressFromDockerLogs() {
  try {
    console.log("📋 Checking Docker logs for node address...");
    const logs = execSync("docker logs chainlink-node 2>&1 | Select-String -Pattern 'Public key address|Sending address|Address:'", { encoding: 'utf8' });
    
    // Try to find address pattern
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const matches = logs.match(addressPattern);
    
    if (matches && matches.length > 0) {
      // Get the first unique address
      const address = matches[0];
      console.log("\n✅ Found Chainlink node address from Docker logs:");
      console.log(`   ${address}\n`);
      return address;
    }
    
    return null;
  } catch (err) {
    console.error(`❌ Error reading Docker logs: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== Getting Chainlink Node Address ===\n");
  
  // Method 1: Try API first
  let nodeAddress = await getNodeAddressFromAPI();
  
  // Method 2: Fallback to Docker logs
  if (!nodeAddress) {
    nodeAddress = getNodeAddressFromDockerLogs();
  }
  
  // Method 3: Try from transactions (from get_chainlink_node_address.cjs)
  if (!nodeAddress) {
    try {
      const hre = require("hardhat");
      const multiPriceData = require("./deployments/multi-price.json");
      const aggregatorAddress = multiPriceData.aggregator;
      const provider = hre.ethers.provider;
      
      console.log("📋 Checking recent transactions to MultiPriceAggregator...");
      const currentBlock = await provider.getBlockNumber();
      let nodeAddresses = new Set();
      
      for (let i = currentBlock; i > Math.max(0, currentBlock - 100); i--) {
        try {
          const block = await provider.getBlock(i, true);
          if (block && block.transactions) {
            for (const txHash of block.transactions) {
              const tx = await provider.getTransaction(txHash);
              if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
                nodeAddresses.add(tx.from);
              }
            }
          }
        } catch (e) {
          // Skip
        }
      }
      
      if (nodeAddresses.size > 0) {
        nodeAddress = Array.from(nodeAddresses)[0];
        console.log("\n✅ Found Chainlink node address from transactions:");
        console.log(`   ${nodeAddress}\n`);
      }
    } catch (err) {
      console.error(`❌ Error checking transactions: ${err.message}`);
    }
  }
  
  if (nodeAddress) {
    console.log("💡 Use this address:");
    console.log(`   $env:NODE_ADDRESS="${nodeAddress}"`);
    console.log(`   npx hardhat run scripts/set_multi_writer.cjs --network ganache\n`);
    return nodeAddress;
  } else {
    console.log("\n❌ Could not find Chainlink node address");
    console.log("\n💡 Manual steps:");
    console.log("   1. Open Chainlink UI: http://localhost:6688");
    console.log("   2. Login with credentials from chainlink-data/.api");
    console.log("   3. Go to Keys section");
    console.log("   4. Copy the sending address");
    process.exit(1);
  }
}

main().catch(console.error);

