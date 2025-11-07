const fs = require("fs");
const https = require("https");
const http = require("http");

async function main() {
    console.log("🔍 Getting Chainlink Node Address...\n");
    
    // Read API credentials
    let apiKey, password;
    try {
        const apiContent = fs.readFileSync("chainlink-data/.api", "utf8").trim().split("\n");
        apiKey = apiContent[0];
        password = apiContent[1] || apiContent[0]; // Fallback if single line
    } catch (e) {
        console.error("❌ Cannot read chainlink-data/.api");
        console.error("   Make sure Docker Chainlink is running and credentials exist");
        process.exit(1);
    }
    
    const chainlinkUrl = process.env.CHAINLINK_URL || "http://localhost:6688";
    console.log("📍 Chainlink URL:", chainlinkUrl);
    console.log("");
    
    // Try to get chain keys from Chainlink API
    try {
        const response = await fetch(`${chainlinkUrl}/v2/keys/evm`, {
            method: "GET",
            headers: {
                "X-Chainlink-EA-AccessKey": apiKey,
                "X-Chainlink-EA-Secret": password,
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const chainKeys = data.data;
            console.log("✅ Found Chainlink Chain Keys:");
            console.log("");
            
            chainKeys.forEach((key, index) => {
                console.log(`   Key ${index + 1}:`);
                console.log(`      Address: ${key.attributes.address}`);
                console.log(`      Type: ${key.attributes.keyType || "EVM"}`);
                console.log("");
            });
            
            // Use first key as default
            const primaryAddress = chainKeys[0].attributes.address;
            console.log("📍 Primary Node Address:", primaryAddress);
            console.log("");
            console.log("💡 Use this address for funding:");
            console.log(`   $env:NODE_ADDRESS="${primaryAddress}"`);
            console.log("");
            
            return primaryAddress;
        } else {
            console.log("⚠️  No chain keys found");
            console.log("   Chainlink node might not be fully initialized yet");
            console.log("   Wait a few seconds and try again");
            return null;
        }
    } catch (error) {
        console.error("❌ Error getting chain keys:", error.message);
        console.error("");
        console.error("💡 Alternative methods:");
        console.error("   1. Check Chainlink UI: http://localhost:6688");
        console.error("      → Keys → Chain Keys");
        console.error("");
        console.error("   2. Check Docker logs:");
        console.error("      docker-compose logs chainlink | Select-String 'account'");
        console.error("");
        console.error("   3. Wait a few seconds if node just started");
        return null;
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});





