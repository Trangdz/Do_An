/**
 * Deploy PriceAggregators cho tất cả tokens (ETH, USDC, DAI, LINK, WBTC...)
 * Mỗi token có 1 aggregator riêng, mô phỏng Chainlink Data Feeds thực tế
 */

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const TOKENS = [
  { symbol: "ETH", description: "ETH / USD", decimals: 8 },
  { symbol: "USDC", description: "USDC / USD", decimals: 8 },
  { symbol: "DAI", description: "DAI / USD", decimals: 8 },
  { symbol: "LINK", description: "LINK / USD", decimals: 8 },
  { symbol: "WBTC", description: "BTC / USD", decimals: 8 },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const aggregators = {};

  // Deploy aggregator cho từng token
  for (const token of TOKENS) {
    console.log(`\nDeploying ${token.symbol} aggregator...`);
    
    const Factory = await ethers.getContractFactory("PriceAggregator");
    const aggregator = await Factory.deploy(token.decimals, token.description);
    await aggregator.waitForDeployment();
    const addr = await aggregator.getAddress();
    
    aggregators[token.symbol] = addr;
    console.log(`  ${token.symbol} Aggregator: ${addr}`);
  }

  // Lưu addresses
  const net = await ethers.provider.getNetwork();
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  
  const outPath = path.join(outDir, "aggregators.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: net.chainId.toString(),
        deployer: deployer.address,
        aggregators,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  
  console.log("\n✅ All aggregators deployed!");
  console.log("Saved:", outPath);
  
  // Copy sang frontend
  const frontendPath = path.join(process.cwd(), "lendhub-frontend-nextjs", "deployments", "aggregators.json");
  const frontendDir = path.dirname(frontendPath);
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
  fs.copyFileSync(outPath, frontendPath);
  console.log("Copied to frontend:", frontendPath);
  
  console.log("\nNext steps:");
  console.log("1. Authorize node for each aggregator:");
  console.log("   NODE_ADDRESS=0xNODE npx hardhat run scripts/authorize_all_aggregators.cjs --network ganache");
  console.log("2. Create jobs for each token (ETH, USDC, DAI, LINK, WBTC)");
  console.log("3. Start frontend: cd lendhub-frontend-nextjs && npm run dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});






