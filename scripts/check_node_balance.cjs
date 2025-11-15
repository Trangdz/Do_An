const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const data = JSON.parse(fs.readFileSync("./deployments/local-chainlink.json", "utf8"));
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  // Get writer address
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", aggregatorAddress);
  const writer = await aggregator.writer();
  
  console.log("=== Chainlink Node Status ===\n");
  console.log("Node Address (Writer):", writer);
  console.log("");
  
  // Check ETH balance
  const provider = hre.ethers.provider;
  const balance = await provider.getBalance(writer);
  const balanceEth = hre.ethers.formatEther(balance);
  
  console.log("ETH Balance:", balanceEth, "ETH");
  if (Number(balanceEth) < 0.1) {
    console.log("⚠️  WARNING: Low ETH balance! Node may not be able to send transactions.");
    console.log("   Fund the node with: npx hardhat run scripts/fund_node.cjs --network ganache");
  } else {
    console.log("✅ ETH balance is sufficient");
  }
  console.log("");
  
  // Check job TOML files
  console.log("=== Job TOML Files ===");
  const jobsDir = "./chainlink-data";
  const jobFiles = ["job-eth.toml", "job-weth.toml", "job-usdc.toml", "job-dai.toml", "job-link.toml"];
  
  for (const jobFile of jobFiles) {
    const jobPath = `${jobsDir}/${jobFile}`;
    if (fs.existsSync(jobPath)) {
      const content = fs.readFileSync(jobPath, "utf8");
      const match = content.match(/to="(0x[a-fA-F0-9]{40})"/);
      if (match) {
        const jobAddress = match[1];
        if (jobAddress.toLowerCase() === aggregatorAddress.toLowerCase()) {
          console.log(`  ${jobFile.padEnd(20)}: ✅ ${jobAddress}`);
        } else {
          console.log(`  ${jobFile.padEnd(20)}: ❌ ${jobAddress} (should be ${aggregatorAddress})`);
        }
      } else {
        console.log(`  ${jobFile.padEnd(20)}: ⚠️  No 'to' address found`);
      }
    } else {
      console.log(`  ${jobFile.padEnd(20)}: ❌ File not found`);
    }
  }
  
  console.log("\n💡 Next steps:");
  console.log("   1. If jobs are not running, import them in Chainlink UI (http://localhost:6688)");
  console.log("   2. If node balance is low, fund it with: npx hardhat run scripts/fund_node.cjs --network ganache");
  console.log("   3. Wait 30-60 seconds for jobs to run and check prices again");
}

main().catch(console.error);










