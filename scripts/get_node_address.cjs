const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";

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

async function getAllNodeAddressesFromAPI() {
  try {
    const { email, password } = getCredentials();
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, { email, password });
    const cookie = loginRes.headers["set-cookie"];
    if (!cookie) throw new Error("No cookie received");

    const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, {
      headers: { Cookie: cookie }
    });
    
    if (keysRes.data?.data?.length > 0) {
      return keysRes.data.data.map(k => k.attributes.address);
    }
    return [];
  } catch (err) {
    console.error(`❌ API Error: ${err.response?.status || err.message}`);
    return [];
  }
}

async function findActiveAddress(allAddresses) {
  try {
    let aggregatorAddress;
    try {
      const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
      aggregatorAddress = data.contracts.multiPriceAggregator;
    } catch (e) {
      const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
      aggregatorAddress = data.aggregator;
    }

    // Check current writer
    try {
      const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
      const currentWriter = await aggregator.writer();
      if (currentWriter && currentWriter !== "0x0000000000000000000000000000000000000000") {
        const writerLower = currentWriter.toLowerCase();
        if (allAddresses.some(addr => addr.toLowerCase() === writerLower)) {
          console.log(`📋 Current writer: ${currentWriter} (in key list)`);
          return currentWriter;
        } else {
          console.log(`⚠️  Current writer: ${currentWriter} (NOT in key list!)`);
        }
      }
    } catch (e) {
      // Skip if can't read contract
    }

    // Check transactions to find active address
    try {
      const provider = hre.ethers.provider;
      const currentBlock = await provider.getBlockNumber();
      const addressCounts = new Map();
      
      for (let i = currentBlock; i > Math.max(0, currentBlock - 500); i--) {
        try {
          const block = await provider.getBlock(i, true);
          if (block?.transactions) {
            for (const txHash of block.transactions) {
              const tx = await provider.getTransaction(txHash);
              if (tx?.to?.toLowerCase() === aggregatorAddress.toLowerCase()) {
                const from = tx.from.toLowerCase();
                if (allAddresses.some(addr => addr.toLowerCase() === from)) {
                  addressCounts.set(from, (addressCounts.get(from) || 0) + 1);
                }
              }
            }
          }
        } catch (e) {}
      }

      if (addressCounts.size > 0) {
        const sorted = Array.from(addressCounts.entries()).sort((a, b) => b[1] - a[1]);
        const mostActive = sorted[0][0];
        console.log(`✅ Active address: ${mostActive} (${sorted[0][1]} transactions)`);
        return mostActive;
      }
    } catch (e) {
      // Skip if can't check transactions
    }
  } catch (err) {
    // Silent fail
  }
  return null;
}

async function main() {
  console.log("=== Getting Chainlink Node Address ===\n");
  
  const allAddresses = await getAllNodeAddressesFromAPI();
  if (allAddresses.length === 0) {
    console.log("❌ No ETH keys found");
    process.exit(1);
  }

  console.log(`✅ Found ${allAddresses.length} ETH key(s):`);
  allAddresses.forEach((addr, idx) => console.log(`   ${idx + 1}. ${addr}`));
  console.log("");

  const activeAddress = await findActiveAddress(allAddresses);
  
  // Prefer key that's actually being used (not the first one)
  // If no active address found, try to use the second key if available
  // (often the first key is not the one actually sending transactions)
  let recommended = activeAddress;
  if (!recommended) {
    // Check if we can determine from recent transactions which key is used
    // Otherwise, prefer second key over first (common pattern)
    if (allAddresses.length > 1) {
      console.log("⚠️  No active transactions found, checking which key to use...");
      // Try to find from failed transactions (they still show which address tried)
      recommended = allAddresses[1]; // Often the second key is the active one
      console.log(`   Using second key: ${recommended}`);
    } else {
      recommended = allAddresses[0];
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📌 RECOMMENDED ADDRESS:");
  console.log(`   ${recommended}`);
  console.log(`\n💡 To set writer:`);
  console.log(`   $env:NODE_ADDRESS="${recommended}"`);
  console.log(`   npx hardhat run scripts/set_multi_writer.cjs --network ganache`);
  console.log("=".repeat(60) + "\n");

  return recommended;
}

main().catch(console.error);
