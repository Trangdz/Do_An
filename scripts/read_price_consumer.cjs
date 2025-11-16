const hre = require("hardhat");
const data = require("../deployments/price-consumer.json");

async function main() {
  const consumer = await hre.ethers.getContractAt("PriceConsumer", data.priceConsumer);
  const price = await consumer.getPrice();
  const priceNum = Number(price);
  console.log(`Price: ${priceNum / 1e8} USD`);
}

main().catch(console.error);








































