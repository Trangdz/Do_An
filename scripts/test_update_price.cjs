const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const meta = JSON.parse(fs.readFileSync("deployments/local-chainlink.json", "utf8"));
  const aggAddr = meta.priceAggregator;
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Aggregator:", aggAddr);
  
  const agg = await ethers.getContractAt("PriceAggregator", aggAddr);
  
  // Test: gọi updateAnswer thủ công
  const testPrice = 383220000000n; // $3832.20 * 1e8
  console.log("Calling updateAnswer with:", testPrice.toString());
  
  const tx = await agg.updateAnswer(testPrice);
  await tx.wait();
  console.log("Updated! Tx:", tx.hash);
  
  // Đọc lại
  const [roundId, answer, startedAt, updatedAt, answeredInRound] = await agg.latestRoundData();
  console.log("\nLatest Round Data:");
  console.log("  Round ID:", roundId.toString());
  console.log("  Answer:", answer.toString(), `(${ethers.formatUnits(answer, 8)} USD)`);
  console.log("  Updated At:", new Date(Number(updatedAt) * 1000).toISOString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

