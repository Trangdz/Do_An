const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

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

/**
 * Get all ETH keys from Chainlink API
 */
async function getAllNodeAddressesFromAPI() {
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

    console.log("📋 Fetching all ETH keys from Chainlink node...");
    const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, {
      headers: { Cookie: cookie }
    });
    
    if (keysRes.data?.data?.length > 0) {
      const addresses = keysRes.data.data.map(key => ({
        address: key.attributes.address,
        createdAt: key.attributes.createdAt,
        updatedAt: key.attributes.updatedAt,
      }));
      
      console.log(`\n✅ Found ${addresses.length} ETH key(s):`);
      addresses.forEach((key, idx) => {
        console.log(`   ${idx + 1}. ${key.address}`);
      });
      console.log("");
      return addresses.map(k => k.address);
    }
    
    return [];
  } catch (err) {
    if (err.response) {
      console.error(`❌ API Error: ${err.response.status} - ${err.response.statusText}`);
      if (err.response.data) {
        console.error(`   ${JSON.stringify(err.response.data)}`);
      }
    } else {
      console.error(`❌ Error: ${err.message}`);
    }
    return [];
  }
}

/**
 * Find which address is actually being used by checking transactions
 */
async function findActiveNodeAddress(allAddresses) {
  try {
    console.log("🔍 Checking which address is actually sending transactions...");
    
    let aggregatorAddress;
    try {
      const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
      aggregatorAddress = data.contracts.multiPriceAggregator;
    } catch (e) {
      try {
        const data = JSON.parse(fs.readFileSync("./deployments/multi-price.json", "utf8"));
        aggregatorAddress = data.aggregator;
      } catch (e2) {
        console.log("⚠️  Could not find contract address, skipping transaction check");
        return null;
      }
    }

    // Check current writer in contract
    try {
      const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
      const currentWriter = await aggregator.writer();
      if (currentWriter && currentWriter !== "0x0000000000000000000000000000000000000000") {
        const writerLower = currentWriter.toLowerCase();
        if (allAddresses.some(addr => addr.toLowerCase() === writerLower)) {
          console.log(`\n📋 Current writer in contract: ${currentWriter}`);
          console.log(`   This address is in the node's key list`);
        } else {
          console.log(`\n⚠️  Current writer in contract: ${currentWriter}`);
          console.log(`   ⚠️  WARNING: This address is NOT in the node's key list!`);
          console.log(`   This might be why transactions are failing.`);
        }
      }
    } catch (e) {
      // Skip if can't read contract
    }

    const provider = hre.ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    const addressCounts = new Map();
    const failedCounts = new Map();
    
    // Check last 500 blocks for transactions (wider range)
    console.log(`   Checking blocks ${currentBlock - 500} to ${currentBlock}...`);
    for (let i = currentBlock; i > Math.max(0, currentBlock - 500); i--) {
      try {
        const block = await provider.getBlock(i, true);
        if (block && block.transactions) {
          for (const txHash of block.transactions) {
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.to && tx.to.toLowerCase() === aggregatorAddress.toLowerCase()) {
              const from = tx.from.toLowerCase();
              if (allAddresses.some(addr => addr.toLowerCase() === from)) {
                const receipt = await provider.getTransactionReceipt(txHash);
                addressCounts.set(from, (addressCounts.get(from) || 0) + 1);
                if (receipt.status === 0) {
                  failedCounts.set(from, (failedCounts.get(from) || 0) + 1);
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip errors
      }
    }

    if (addressCounts.size > 0) {
      // Sort by transaction count (most active first)
      const sorted = Array.from(addressCounts.entries()).sort((a, b) => b[1] - a[1]);
      const mostActive = sorted[0][0];
      
      console.log(`\n✅ Found active address(es) from transactions:`);
      sorted.forEach(([addr, count]) => {
        const failed = failedCounts.get(addr) || 0;
        const success = count - failed;
        const marker = addr === mostActive ? " ⭐ (MOST ACTIVE)" : "";
        const status = failed > 0 ? ` (${success} success, ${failed} failed)` : ` (${count} success)`;
        console.log(`   ${addr}: ${count} transaction(s)${status}${marker}`);
      });
      console.log("");
      
      return mostActive;
    } else {
      console.log("⚠️  No transactions found from any of the node addresses in last 500 blocks");
      console.log("   This might mean:");
      console.log("   - Jobs haven't run yet");
      console.log("   - Jobs are failing before sending transactions");
      console.log("   - A different address is being used\n");
    }
  } catch (err) {
    console.error(`❌ Error checking transactions: ${err.message}`);
  }
  
  return null;
}

async function main() {
  console.log("=== Getting Chainlink Node Address (FIXED) ===\n");
  
  // Step 1: Get all addresses from API
  const allAddresses = await getAllNodeAddressesFromAPI();
  
  if (allAddresses.length === 0) {
    console.log("❌ No ETH keys found in Chainlink node");
    console.log("\n💡 Manual steps:");
    console.log("   1. Open Chainlink UI: http://localhost:6688");
    console.log("   2. Login with credentials from chainlink-data/.api");
    console.log("   3. Go to Keys section");
    console.log("   4. Copy the sending address");
    process.exit(1);
  }

  // Step 2: Find which one is actually being used
  const activeAddress = await findActiveNodeAddress(allAddresses);
  
  let recommendedAddress;
  if (activeAddress) {
    recommendedAddress = activeAddress;
    console.log("✅ RECOMMENDED: Use the active address (sending transactions)");
  } else {
    // If no transactions found, use the first address (default)
    recommendedAddress = allAddresses[0];
    console.log("⚠️  No active transactions found, using first address as default");
  }

  console.log("\n" + "=".repeat(60));
  console.log("📌 RECOMMENDED ADDRESS:");
  console.log(`   ${recommendedAddress}`);
  console.log("\n💡 To set this as writer:");
  console.log(`   $env:NODE_ADDRESS="${recommendedAddress}"`);
  console.log(`   npx hardhat run scripts/set_multi_writer.cjs --network ganache`);
  console.log("=".repeat(60) + "\n");

  // Also show all addresses for reference
  if (allAddresses.length > 1) {
    console.log("📋 All available addresses:");
    allAddresses.forEach((addr, idx) => {
      const marker = addr.toLowerCase() === recommendedAddress.toLowerCase() ? " ⭐ (RECOMMENDED)" : "";
      console.log(`   ${idx + 1}. ${addr}${marker}`);
    });
    console.log("");
  }

  return recommendedAddress;
}

main().catch(console.error);

