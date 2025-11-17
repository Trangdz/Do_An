const { execSync } = require("child_process");
const fs = require("fs");

async function main() {
    console.log("🚀 Full Chainlink Setup Script\n");
    console.log("=" .repeat(50));
    console.log("");
    
    // Step 1: Check Docker Chainlink
    console.log("📋 Step 1: Checking Docker Chainlink...");
    try {
        const dockerPs = execSync("docker-compose ps", { encoding: "utf8" });
        if (dockerPs.includes("chainlink-node") && dockerPs.includes("Up")) {
            console.log("   ✅ Chainlink node is running");
        } else {
            console.log("   ⚠️  Chainlink node might not be running");
            console.log("   Run: docker-compose up -d");
        }
    } catch (e) {
        console.log("   ⚠️  Could not check Docker status");
    }
    console.log("");
    
    // Step 2: Get Node Address
    console.log("📋 Step 2: Getting Chainlink Node Address...");
    let nodeAddress;
    try {
        nodeAddress = execSync("node scripts/get_chainlink_node_address.cjs", { 
            encoding: "utf8",
            stdio: "pipe"
        });
        
        // Extract address from output
        const match = nodeAddress.match(/(?:Primary Node Address:|Address:)\s*(0x[a-fA-F0-9]{40})/);
        if (match) {
            nodeAddress = match[1];
            console.log("   ✅ Node Address:", nodeAddress);
        } else {
            console.log("   ⚠️  Could not extract address automatically");
            console.log("   Run manually: node scripts/get_chainlink_node_address.cjs");
            nodeAddress = null;
        }
    } catch (e) {
        console.log("   ⚠️  Could not get node address automatically");
        nodeAddress = null;
    }
    console.log("");
    
    // Step 3: Fund and Authorize Node
    if (nodeAddress) {
        console.log("📋 Step 3: Funding and Authorizing Node...");
        try {
            process.env.NODE_ADDRESS = nodeAddress;
            execSync("node scripts/fund_and_setup_node.cjs", { 
                encoding: "utf8",
                stdio: "inherit"
            });
            console.log("   ✅ Node funded and authorized");
        } catch (e) {
            console.log("   ❌ Failed to fund/authorize node");
            console.log("   Run manually:");
            console.log(`   $env:NODE_ADDRESS="${nodeAddress}"; node scripts/fund_and_setup_node.cjs`);
        }
    } else {
        console.log("📋 Step 3: Skipped (no node address)");
        console.log("   Get address first:");
        console.log("   node scripts/get_chainlink_node_address.cjs");
    }
    console.log("");
    
    // Step 4: Create Chainlink Job
    console.log("📋 Step 4: Creating Chainlink Job...");
    try {
        execSync("node scripts/create_chainlink_job.cjs", { 
            encoding: "utf8",
            stdio: "inherit"
        });
        console.log("   ✅ Job created");
    } catch (e) {
        console.log("   ❌ Failed to create job");
        console.log("   Run manually: node scripts/create_chainlink_job.cjs");
    }
    console.log("");
    
    // Step 5: Test Reading Price
    console.log("📋 Step 5: Testing Price Reading...");
    try {
        execSync("node scripts/read_aggregator.cjs", { 
            encoding: "utf8",
            stdio: "inherit"
        });
    } catch (e) {
        console.log("   ⚠️  Could not read price yet");
        console.log("   Job might need time to run first");
    }
    console.log("");
    
    console.log("=" .repeat(50));
    console.log("✅ Setup Complete!");
    console.log("");
    console.log("📝 Next Steps:");
    console.log("   1. Monitor job in Chainlink UI: http://localhost:6688");
    console.log("   2. Wait for first job run (cron: */1 * * * *)");
    console.log("   3. Test reading price: node scripts/read_aggregator.cjs");
    console.log("");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});





















