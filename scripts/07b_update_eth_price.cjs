const { ethers } = require("hardhat");

async function main() {
  const FEED = "0x6E2483c5FfcF8D17013559D4E3A3856D7CF2e4D4";
  const NEW_PRICE = "900"; // USD
  
  const agg = await ethers.getContractAt(["function updateAnswer(int256) external"], FEED);
  await (await agg.updateAnswer(BigInt(NEW_PRICE) * 10n ** 8n)).wait();
  console.log("ETH feed updated to", NEW_PRICE, "USD");
}

main().catch(console.error);
