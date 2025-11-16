const fs = require("fs");

async function main() {
    console.log("📝 Creating Chainlink Job...\n");
    
    // Read job TOML file
    const jobFile = process.env.JOB_FILE || "chainlink-data/job-push-price.toml";
    let jobToml;
    try {
        jobToml = fs.readFileSync(jobFile, "utf8");
    } catch (e) {
        console.error(`❌ Cannot read job file: ${jobFile}`);
        process.exit(1);
    }
    
    console.log("📄 Job File:", jobFile);
    console.log("");
    
    // Read API credentials
    let apiKey, password;
    try {
        const apiContent = fs.readFileSync("chainlink-data/.api", "utf8").trim().split("\n");
        apiKey = apiContent[0];
        password = apiContent[1] || apiContent[0];
    } catch (e) {
        console.error("❌ Cannot read chainlink-data/.api");
        process.exit(1);
    }
    
    // Read PriceAggregator address
    const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
    const aggregatorAddr = meta.priceAggregator;
    
    // Replace placeholder address if exists
    jobToml = jobToml.replace(
        /0x2C0025315508a70B77aBeaB59206500b679f0902/g,
        aggregatorAddr
    );
    
    console.log("📍 PriceAggregator:", aggregatorAddr);
    console.log("");
    
    const chainlinkUrl = process.env.CHAINLINK_URL || "http://localhost:6688";
    console.log("🌐 Chainlink URL:", chainlinkUrl);
    console.log("");
    
    // Create job via Chainlink API
    try {
        console.log("🚀 Creating job...");
        const response = await fetch(`${chainlinkUrl}/v2/jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/toml",
                "X-Chainlink-EA-AccessKey": apiKey,
                "X-Chainlink-EA-Secret": password,
            },
            body: jobToml
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log("✅ Job created successfully!");
        console.log("");
        console.log("📋 Job Details:");
        console.log("   Job ID:", data.data.id);
        console.log("   Name:", data.data.attributes.name);
        console.log("   Type:", data.data.attributes.type);
        console.log("   Status:", data.data.attributes.status || "pending");
        console.log("");
        console.log("🔗 View in UI:", `${chainlinkUrl}/jobs/${data.data.id}`);
        console.log("");
        
        return data.data.id;
    } catch (error) {
        console.error("❌ Error creating job:", error.message);
        console.error("");
        console.error("💡 Troubleshooting:");
        console.error("   1. Check Docker Chainlink is running: docker-compose ps");
        console.error("   2. Check Chainlink UI is accessible: http://localhost:6688");
        console.error("   3. Verify API credentials in chainlink-data/.api");
        console.error("   4. Check job TOML syntax");
        throw error;
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});


















