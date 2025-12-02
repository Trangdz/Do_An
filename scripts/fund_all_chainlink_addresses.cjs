const axios = require("axios");
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const AMOUNT_ETH = process.env.AMOUNT_ETH || "10.0";

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

async function getAllChainlinkAddresses() {
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
      const addresses = keysRes.data.data.map(key => key.attributes.address);
      console.log(`\n✅ Found ${addresses.length} Chainlink node address(es):`);
      addresses.forEach((addr, idx) => {
        console.log(`   ${idx + 1}. ${addr}`);
      });
      return addresses;
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

async function fundAddress(address, amountEth) {
  try {
    const [deployer] = await hre.ethers.getSigners();
    const amount = hre.ethers.parseEther(amountEth);
    
    // Check current balance
    const balanceBefore = await hre.ethers.provider.getBalance(address);
    const balanceBeforeEth = hre.ethers.formatEther(balanceBefore);
    
    console.log(`\n📋 Funding ${address}:`);
    console.log(`   Current balance: ${balanceBeforeEth} ETH`);
    
    if (parseFloat(balanceBeforeEth) >= parseFloat(amountEth)) {
      console.log(`   ⚠️  Already has enough funds (${balanceBeforeEth} ETH >= ${amountEth} ETH), skipping...`);
      return { success: true, skipped: true, balance: balanceBeforeEth };
    }
    
    // Send transaction
    const tx = await deployer.sendTransaction({ 
      to: address, 
      value: amount 
    });
    
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    await tx.wait();
    
    // Verify new balance
    const balanceAfter = await hre.ethers.provider.getBalance(address);
    const balanceAfterEth = hre.ethers.formatEther(balanceAfter);
    const added = hre.ethers.formatEther(balanceAfter - balanceBefore);
    
    console.log(`   ✅ Funded successfully!`);
    console.log(`   New balance: ${balanceAfterEth} ETH`);
    console.log(`   Added: ${added} ETH`);
    
    return { success: true, skipped: false, balance: balanceAfterEth, added: added };
  } catch (err) {
    console.error(`   ❌ Error funding ${address}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("=== Fund All Chainlink Node Addresses ===\n");
  
  const addresses = await getAllChainlinkAddresses();
  
  if (addresses.length === 0) {
    console.log("\n❌ No Chainlink addresses found!");
    process.exit(1);
  }
  
  console.log(`\n💰 Funding each address with ${AMOUNT_ETH} ETH...\n`);
  
  const results = [];
  for (const address of addresses) {
    const result = await fundAddress(address, AMOUNT_ETH);
    results.push({ address, ...result });
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log("=".repeat(60));
  
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  results.forEach((result, idx) => {
    if (result.success) {
      if (result.skipped) {
        console.log(`✅ ${idx + 1}. ${result.address} - Skipped (already funded)`);
        skippedCount++;
      } else {
        console.log(`✅ ${idx + 1}. ${result.address} - Funded ${result.added} ETH (balance: ${result.balance} ETH)`);
        successCount++;
      }
    } else {
      console.log(`❌ ${idx + 1}. ${result.address} - Failed: ${result.error}`);
      failedCount++;
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${addresses.length} addresses`);
  console.log(`✅ Funded: ${successCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log("=".repeat(60));
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});












