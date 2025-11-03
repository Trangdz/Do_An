const hre = require("hardhat");

async function main() {
  console.log("=== SO SÁNH PriceConsumer vs PriceAggregator ===\n");
  
  // PriceConsumer
  const PriceConsumer = await hre.ethers.getContractFactory("PriceConsumer");
  const pcInterface = PriceConsumer.interface;
  const setPriceFunc = pcInterface.getFunction("setPrice");
  
  console.log("1. PriceConsumer:");
  console.log("   Function:", setPriceFunc.format());
  console.log("   Selector:", setPriceFunc.selector);
  console.log("   Inputs:", setPriceFunc.inputs.map(i => `${i.type} ${i.name || ""}`).join(", "));
  console.log("   ABI string:", `"setPrice(${setPriceFunc.inputs.map(i => `${i.type} ${i.name}`).join(", ")})"`);
  console.log("   Data format:", `data="{\\"value\\": $(multiply)}"`);
  
  // PriceAggregator
  const data = require("../deployments/local-chainlink.json");
  const aggregator = await hre.ethers.getContractAt("PriceAggregator", data.aggregator);
  const aggInterface = aggregator.interface;
  const updateAnswerFunc = aggInterface.getFunction("updateAnswer");
  
  console.log("\n2. PriceAggregator:");
  console.log("   Function:", updateAnswerFunc.format());
  console.log("   Selector:", updateAnswerFunc.selector);
  console.log("   Inputs:", updateAnswerFunc.inputs.map(i => `${i.type} ${i.name || ""}`).join(", "));
  console.log("   ABI string:", `"updateAnswer(${updateAnswerFunc.inputs.map(i => `${i.type} ${i.name}`).join(", ")})"`);
  console.log("   Data format:", `data="{\\"answer\\": $(multiply)}"`);
  console.log("   Modifier: onlyWriter (cần authorize)");
  
  console.log("\n=== SỰ KHÁC BIỆT ===");
  console.log("PriceConsumer:");
  console.log("  ✅ Đơn giản: setPrice(uint256 value)");
  console.log("  ✅ Không cần modifier");
  console.log("  ✅ uint256 (không dấu)");
  
  console.log("\nPriceAggregator:");
  console.log("  ⚠️  Phức tạp: updateAnswer(int256 answer)");
  console.log("  ⚠️  Cần modifier onlyWriter");
  console.log("  ⚠️  int256 (có dấu - có thể gây issue với encoding)");
  
  console.log("\n=== KHUYẾN NGHỊ ===");
  console.log("Nếu PriceConsumer đã hoạt động, hãy:");
  console.log("1. Dùng PriceConsumer cho demo");
  console.log("2. Hoặc deploy PriceConsumer và tạo job mới");
  console.log("3. Format sẽ là: abi=\"setPrice(uint256 value)\" data=\"{\\\"value\\\": $(multiply)}\"");
}

main().catch(console.error);


