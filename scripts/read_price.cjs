const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const meta = JSON.parse(fs.readFileSync("deployments/price-consumer.json", "utf8"));
  const addr = meta.consumer;
  console.log("Consumer:", addr);
  const consumer = await ethers.getContractAt("PriceConsumer", addr);
  const v = await consumer.getPrice();
  console.log("Price:", v.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


