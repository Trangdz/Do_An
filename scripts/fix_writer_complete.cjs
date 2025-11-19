const hre = require("hardhat");
const fs = require("fs");
const axios = require("axios");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";

// Read credentials
function getCredentials() {
  const path = require("path");
  const apiFile = path.join(__dirname, "../chainlink-data/.api");
  if (require("fs").existsSync(apiFile)) {
    const lines = require("fs").readFileSync(apiFile, "utf8").trim().split("\n");
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

async function getAllChainlinkAddresses() {
  try {
    const { email, password } = getCredentials();
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, { email, password });
    const cookie = loginRes.headers["set-cookie"];
    const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, { headers: { Cookie: cookie } });
    
    if (keysRes.data?.data?.length > 0) {
      return keysRes.data.data.map(key => key.attributes.address);
    }
    return [];
  } catch (err) {
    console.error("Error getting addresses:", err.message);
    return [];
  }
}

async function main() {
  console.log("=== Fix Writer Complete ===\n");
  
  // Get contract address
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  console.log("Contract:", aggregatorAddress);
  
  // Get all Chainlink addresses
  const addresses = await getAllChainlinkAddresses();
  console.log("\n📋 Found Chainlink addresses:");
  addresses.forEach((addr, idx) => {
    console.log(`   ${idx + 1}. ${addr}`);
  });
  
  if (addresses.length === 0) {
    console.log("\n❌ No Chainlink addresses found!");
    process.exit(1);
  }
  
  // Get contract
  const [deployer] = await hre.ethers.getSigners();
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  
  // Check current writer
  let currentWriter;
  try {
    currentWriter = await aggregator.writer();
    console.log(`\n📋 Current writer in contract: ${currentWriter}`);
  } catch (err) {
    console.log("\n⚠️  Could not read writer (contract may not be deployed)");
    currentWriter = "0x0000000000000000000000000000000000000000";
  }
  
  // Set writer to the FIRST address (primary)
  const primaryAddress = addresses[0];
  console.log(`\n🔧 Setting writer to: ${primaryAddress}`);
  
  const tx = await aggregator.connect(deployer).setWriter(primaryAddress, true);
  console.log(`   Transaction hash: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);
  
  await tx.wait();
  
  // Verify
  const newWriter = await aggregator.writer();
  console.log(`\n✅ New writer: ${newWriter}`);
  
  if (newWriter.toLowerCase() === primaryAddress.toLowerCase()) {
    console.log("✅ Writer set successfully!");
  } else {
    console.log("❌ Writer mismatch!");
  }
  
  // If there are multiple addresses, warn
  if (addresses.length > 1) {
    console.log("\n⚠️  WARNING: Contract only supports ONE writer at a time.");
    console.log("   Only the first address is authorized.");
    console.log("   Other addresses will fail with 'Not authorized'.");
    console.log("\n💡 Solution: Use only ONE Chainlink node, or modify contract to support multiple writers.");
  }
}

main().catch(console.error);




