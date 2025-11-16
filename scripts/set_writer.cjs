const hre = require("hardhat");
const data = require("../deployments/multi-price.json");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const aggregator = await hre.ethers.getContractAt("MultiPriceAggregator", data.aggregator);
  const node = process.env.NODE_ADDRESS;
  const tx = await aggregator.connect(deployer).setWriter(node, true);
  await tx.wait();
  console.log("Authorized writer:", node);
}

main().catch(console.error);

  const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
  const aggAddr = meta.priceAggregator;
  
  console.log("Aggregator:", aggAddr);
  console.log("Node:", node);
  
  const agg = await ethers.getContractAt("PriceAggregator", aggAddr);
  const tx = await agg.setWriter(node, true);
  await tx.wait();
  
  console.log("Writer authorized!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

