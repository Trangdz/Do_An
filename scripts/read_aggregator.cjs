const hre = require("hardhat");
const data = require("../deployments/local-chainlink.json");
async function main() {
  const aggregator = await hre.ethers.getContractAt("PriceAggregator", data.aggregator);
  const [roundId, answer] = await aggregator.latestRoundData();
  const answerNum = Number(answer);
  console.log(`Round ${roundId}, Answer: ${answerNum / 1e8} USD`);
}

main().catch(console.error);

async function main() {
  const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
  const addr = meta.priceAggregator;
  console.log("Aggregator:", addr);
  
  const aggregator = await ethers.getContractAt("PriceAggregator", addr);
  
  // Đọc giá theo chuẩn AggregatorV3Interface
  const [roundId, answer, startedAt, updatedAt, answeredInRound] = await aggregator.latestRoundData();
  
  console.log("Latest Round Data:");
  console.log("  Round ID:", roundId.toString());
  console.log("  Answer:", answer.toString(), `(${ethers.formatUnits(answer, 8)} USD)`);
  console.log("  Started At:", new Date(Number(startedAt) * 1000).toISOString());
  console.log("  Updated At:", new Date(Number(updatedAt) * 1000).toISOString());
  console.log("  Answered In Round:", answeredInRound.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

