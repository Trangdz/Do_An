const { execSync } = require("child_process");
const path = require("path");

const NETWORK = process.env.HARDHAT_NETWORK || process.env.NETWORK || "ganache";
const FUND_AMOUNT = process.env.NODE_FUND_AMOUNT || process.env.AMOUNT_ETH || "5.0";

function run(cmd, options = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    shell: true,
  });
}

function runHardhat(script, extraEnv = {}) {
  const scriptPath = path.join("scripts", script);
  run(`npx hardhat run ${scriptPath} --network ${NETWORK}`, {
    env: { ...extraEnv },
  });
}

function getChainlinkNodeAddress() {
  if (process.env.NODE_ADDRESS) {
    console.log("🔐 Using NODE_ADDRESS from environment:", process.env.NODE_ADDRESS);
    return process.env.NODE_ADDRESS;
  }

  try {
    console.log("\n🔐 Logging into Chainlink node (docker exec)...");
    run("docker exec chainlink-node chainlink admin login -f /chainlink/.api");
  } catch (error) {
    console.warn("⚠️  Unable to login to Chainlink node automatically.");
    console.warn("   Set NODE_ADDRESS env var manually or ensure docker container is running.");
  }

  try {
    console.log("\n🔍 Fetching Chainlink ETH keys...");
    const output = execSync("docker exec chainlink-node chainlink keys eth list --json", {
      stdio: ["ignore", "pipe", "inherit"],
      encoding: "utf8",
      shell: true,
    }).trim();

    if (!output) {
      console.warn("⚠️  No output from chainlink keys command");
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (error) {
      console.warn("⚠️  Could not parse chainlink keys output as JSON:");
      console.warn(output);
      return null;
    }

    let address = null;
    if (Array.isArray(parsed)) {
      address = parsed[0]?.address || parsed[0]?.id;
    } else if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
      address = parsed.data[0].attributes?.address || parsed.data[0].id;
    } else if (parsed.attributes?.address) {
      address = parsed.attributes.address;
    }

    if (address) {
      console.log("✅ Detected Chainlink node address:", address);
      return address;
    }

    console.warn("⚠️  Could not find node address in keys output");
    console.warn(parsed);
  } catch (error) {
    console.warn("⚠️  Unable to fetch Chainlink keys automatically:", error.message);
  }

  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║        🚀 FULL GANACHE + CHAINLINK SETUP (AUTO CONFIG)            ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");

  console.log(`\n🛠️  Target Hardhat network: ${NETWORK}`);

  // 1. Deploy contracts, update frontend & job files
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1️⃣  Deploying contracts and configuring addresses...");
  runHardhat("deploy_ganache_simple.cjs");

  // 2. Detect Chainlink node address
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("2️⃣  Detecting Chainlink node address...");
  const nodeAddress = getChainlinkNodeAddress();
  if (!nodeAddress) {
    console.error("\n❌ Could not determine Chainlink node address automatically.");
    console.error("   Please export NODE_ADDRESS=<address> and rerun this script.");
    process.exit(1);
  }

  // 3. Authorize node as writer
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("3️⃣  Authorizing Chainlink node as MultiPriceAggregator writer...");
  runHardhat("set_multi_writer.cjs", { NODE_ADDRESS: nodeAddress });

  // 4. Fund node with ETH
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`4️⃣  Funding Chainlink node (${nodeAddress}) with ${FUND_AMOUNT} ETH...`);
  runHardhat("fund_node.cjs", { AMOUNT_ETH: FUND_AMOUNT });

  // 5. Quick status check (writer, balances, TOML addresses)
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("5️⃣  Checking node balance and job configuration...");
  runHardhat("check_node_balance.cjs");

  // 6. Wait for Chainlink jobs to push first prices, then verify
  const waitSeconds = parseInt(process.env.PRICE_WAIT_SECONDS || "45", 10);
  console.log(`\n⏳ Waiting ${waitSeconds} seconds for Chainlink jobs to publish prices...`);
  await sleep(waitSeconds * 1000);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("6️⃣  Reading prices from MultiPriceAggregator...");
  runHardhat("read_all_prices.cjs");

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ SETUP COMPLETED SUCCESSFULLY!                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\nYou can now start the frontend and interact with the protocol. 🥳\n");
})().catch(error => {
  console.error("\n❌ Setup failed:", error.message);
  process.exit(1);
});
