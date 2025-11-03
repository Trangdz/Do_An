const hre = require("hardhat");
const data = require("../deployments/local-chainlink.json");
async function main() {
  const aggregator = await hre.ethers.getContractAt("PriceAggregator", data.aggregator);
  const [roundId, answer] = await aggregator.latestRoundData();
  const answerNum = Number(answer);
  console.log(`Round ${roundId}, Answer: ${answerNum / 1e8} USD`);
}

main().catch(console.error);
