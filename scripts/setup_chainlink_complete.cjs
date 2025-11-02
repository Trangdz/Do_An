const { ethers } = require("hardhat");
const fs = require("fs");
const axios = require("axios");
const { execSync } = require("child_process");

const CL_API_URL = process.env.CL_API_URL || "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function waitForChainlink(maxAttempts = 30) {
  console.log("⏳ Waiting for Chainlink node to be ready...");
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await axios.get(`${CL_API_URL}/health`);
      if (res.status === 200) {
        console.log("✅ Chainlink node is ready!");
        return true;
      }
    } catch (err) {
      process.stdout.write(".");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log("\n❌ Chainlink node did not become ready in time");
  return false;
}

async function getNodeAddress() {
  try {
    const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
      email: CL_EMAIL,
      password: CL_PASSWORD
    });
    const cookie = loginRes.headers["set-cookie"];

    const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, {
      headers: { Cookie: cookie }
    });
    
    if (keysRes.data?.data?.length > 0) {
      return keysRes.data.data[0].attributes.address;
    }
    
    // Alternative: check logs
    try {
      const logs = execSync("docker logs chainlink_node 2>&1 | Select-String -Pattern 'Public key address'", { encoding: 'utf8' });
      const match = logs.match(/0x[a-fA-F0-9]{40}/);
      if (match) return match[0];
    } catch {}
    
    return null;
  } catch (err) {
    console.error("Error getting node address:", err.message);
    return null;
  }
}

async function authorizeNode(nodeAddress) {
  console.log("\n🔐 Authorizing node for all aggregators...");
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  for (const [symbol, address] of Object.entries(aggregators)) {
    console.log(`  ${symbol}: ${address}`);
    try {
      const agg = await ethers.getContractAt("PriceAggregator", address);
      const tx = await agg.setWriter(nodeAddress, true);
      await tx.wait();
      console.log(`    ✅ Authorized`);
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
    }
  }
}

async function fundNode(nodeAddress, amountEth = "5.0") {
  console.log(`\n💰 Funding node with ${amountEth} ETH...`);
  const [sender] = await ethers.getSigners();
  
  // Check sender balance first
  const balance = await ethers.provider.getBalance(sender.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`  Sender balance: ${balanceEth} ETH`);
  
  const amount = ethers.parseEther(amountEth);
  const estimatedGas = 21000n; // Simple transfer
  const gasPrice = await ethers.provider.getFeeData();
  const gasCost = estimatedGas * (gasPrice.gasPrice || 0n);
  const totalNeeded = amount + gasCost;
  
  if (balance < totalNeeded) {
    const available = balance - gasCost - 1000000000000000n; // Reserve some for gas
    if (available > 0n) {
      console.log(`  ⚠️  Not enough ETH, funding with available balance: ${ethers.formatEther(available)} ETH`);
      const tx = await sender.sendTransaction({
        to: nodeAddress,
        value: available
      });
      await tx.wait();
      console.log(`✅ Funded. Tx: ${tx.hash}`);
      return;
    } else {
      console.log(`  ❌ Not enough ETH to fund node (need ${ethers.formatEther(totalNeeded)}, have ${balanceEth})`);
      return;
    }
  }
  
  const tx = await sender.sendTransaction({
    to: nodeAddress,
    value: amount
  });
  await tx.wait();
  console.log(`✅ Funded. Tx: ${tx.hash}`);
}

async function createJobs() {
  console.log("\n📝 Creating Chainlink jobs...");
  const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
    email: CL_EMAIL,
    password: CL_PASSWORD
  });
  const cookie = loginRes.headers["set-cookie"];
  
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  
  const JOBS = [
    { symbol: "ETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
    { symbol: "WETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
    { symbol: "USDC", url: "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT", path: "price" },
    { symbol: "DAI", url: "https://api.binance.com/api/v3/ticker/price?symbol=DAIUSDT", path: "price" },
    { symbol: "LINK", url: "https://api.binance.com/api/v3/ticker/price?symbol=LINKUSDT", path: "price" }
  ];

  for (const job of JOBS) {
    const aggregatorAddr = aggregators[job.symbol];
    if (!aggregatorAddr) {
      console.log(`⚠️  ${job.symbol}: No aggregator found, skipping`);
      continue;
    }

    console.log(`  Creating job for ${job.symbol}...`);
    // Chainlink 1.13.0: Thử dùng array format [$(multiply)] với ABI không named parameter
    // Nếu không work, sẽ phải modify contract để remove named parameter
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.symbol}/USD Price Feed"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256)" data="[$(multiply)]"]
submit   [type="ethtx" to="${aggregatorAddr}" functionSignature="updateAnswer(int256)" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const createRes = await axios.post(
        `${CL_API_URL}/v2/jobs`,
        { toml },
        { headers: { Cookie: cookie } }
      );
      console.log(`    ✅ Job created: ID ${createRes.data.data.id}`);
    } catch (error) {
      const errorDetail = error.response?.data?.errors?.[0]?.detail || '';
      if (errorDetail.includes("already exists") || errorDetail.includes("duplicate key") || errorDetail.includes("idx_jobs_name")) {
        console.log(`    ⚠️  Job already exists, skipping`);
      } else {
        console.error(`    ❌ Error:`, error.response?.data || error.message);
      }
    }
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔗 CHAINLINK ORACLE COMPLETE SETUP                       ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Step 1: Wait for Chainlink
  const isReady = await waitForChainlink();
  if (!isReady) {
    console.log("\n❌ Please start Chainlink first:");
    console.log("   docker-compose up -d chainlink");
    process.exit(1);
  }

  // Step 2: Get node address
  console.log("\n📋 Getting node sending address...");
  let nodeAddress = await getNodeAddress();
  
  if (!nodeAddress) {
    console.log("⚠️  Could not get address from API, trying logs...");
    try {
      const logs = execSync("docker logs chainlink_node 2>&1 | Select-String -Pattern '0x[a-fA-F0-9]{40}' | Select-Object -First 1", { encoding: 'utf8' });
      const matches = logs.match(/0x[a-fA-F0-9]{40}/g);
      if (matches && matches.length > 0) {
        nodeAddress = matches[0];
      }
    } catch {}
  }

  if (!nodeAddress) {
    console.log("❌ Could not determine node address. Please check Chainlink logs:");
    console.log("   docker logs chainlink_node");
    process.exit(1);
  }

  console.log(`✅ Node address: ${nodeAddress}`);

  // Step 3: Authorize
  await authorizeNode(nodeAddress);

  // Step 4: Fund
  await fundNode(nodeAddress, "10.0");

  // Step 5: Create jobs
  await createJobs();

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ SETUP COMPLETE!                                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  console.log("📊 Jobs will run every 1 minute");
  console.log("⏰ Wait 1-2 minutes, then check Markets page for updated prices");
  console.log("\n🌐 Frontend: http://localhost:3000/markets");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


