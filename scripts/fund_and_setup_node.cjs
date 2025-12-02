const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔗 Setting up Chainlink Node...\n");
    
    // Load deployment metadata
    const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
    const linkTokenAddr = meta.linkToken;
    const priceAggregatorAddr = meta.priceAggregator;
    
    console.log("📋 Contracts:");
    console.log("   LinkToken:", linkTokenAddr);
    console.log("   PriceAggregator:", priceAggregatorAddr);
    console.log("");
    
    // Get Chainlink node address from environment or prompt
    const nodeAddr = process.env.NODE_ADDRESS;
    if (!nodeAddr) {
        console.error("❌ NODE_ADDRESS not set!");
        console.error("   Get the address from Chainlink UI (http://localhost:6688)");
        console.error("   Or from docker logs: docker-compose logs chainlink | grep 'account'");
        console.error("");
        console.error("   Then run:");
        console.error("   $env:NODE_ADDRESS='<address>' node scripts/fund_and_setup_node.cjs");
        process.exit(1);
    }
    
    console.log("📍 Chainlink Node Address:", nodeAddr);
    console.log("");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);
    console.log("   Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");
    
    // Step 1: Fund ETH
    console.log("💰 Step 1: Funding ETH to Chainlink node...");
    const ethAmount = process.env.ETH_AMOUNT || "1.0";
    const txEth = await deployer.sendTransaction({
        to: nodeAddr,
        value: ethers.parseEther(ethAmount)
    });
    await txEth.wait();
    console.log("   ✅ Sent", ethAmount, "ETH. Tx:", txEth.hash);
    console.log("");
    
    // Step 2: Fund LINK
    console.log("🔗 Step 2: Funding LINK to Chainlink node...");
    const linkToken = await ethers.getContractAt("LinkToken", linkTokenAddr);
    const linkAmount = process.env.LINK_AMOUNT || "100.0";
    const txLink = await linkToken.transfer(nodeAddr, ethers.parseEther(linkAmount));
    await txLink.wait();
    console.log("   ✅ Sent", linkAmount, "LINK. Tx:", txLink.hash);
    
    // Check balances
    const nodeEthBalance = await ethers.provider.getBalance(nodeAddr);
    const nodeLinkBalance = await linkToken.balanceOf(nodeAddr);
    console.log("   Node ETH Balance:", ethers.formatEther(nodeEthBalance), "ETH");
    console.log("   Node LINK Balance:", ethers.formatEther(nodeLinkBalance), "LINK");
    console.log("");
    
    // Step 3: Authorize node on PriceAggregator
    console.log("✍️  Step 3: Authorizing node on PriceAggregator...");
    const aggregator = await ethers.getContractAt("PriceAggregator", priceAggregatorAddr);
    const isWriterBefore = await aggregator.isWriter(nodeAddr);
    console.log("   Current writer status:", isWriterBefore);
    
    if (!isWriterBefore) {
        const txAuth = await aggregator.setWriter(nodeAddr, true);
        await txAuth.wait();
        console.log("   ✅ Node authorized! Tx:", txAuth.hash);
    } else {
        console.log("   ℹ️  Node already authorized");
    }
    
    const isWriterAfter = await aggregator.isWriter(nodeAddr);
    console.log("   Final writer status:", isWriterAfter);
    console.log("");
    
    console.log("✅ Setup complete!");
    console.log("");
    console.log("📝 Next steps:");
    console.log("   1. Open Chainlink UI: http://localhost:6688");
    console.log("   2. Login with credentials from chainlink-data/.api");
    console.log("   3. Create a new job using chainlink-data/job-push-price.toml");
    console.log("   4. Or use API to create job");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});



































