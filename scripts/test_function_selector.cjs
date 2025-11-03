const { ethers } = require("hardhat");
const data = require("../deployments/local-chainlink.json");

async function main() {
  console.log("=== TEST FUNCTION SELECTOR ===\n");
  
  const aggregator = await ethers.getContractAt("PriceAggregator", data.aggregator);
  const iface = aggregator.interface;
  
  // Get function
  const func = iface.getFunction("updateAnswer");
  
  console.log("Function Info:");
  console.log("  Signature:", func.format());
  console.log("  Name:", func.name);
  console.log("  Selector:", func.selector);
  console.log("  Inputs:", func.inputs.map(i => `${i.type} ${i.name || ""}`).join(", "));
  
  // Test encoding
  const testValue = ethers.parseUnits("3856", 8); // 3856 * 10^8
  console.log("\nTest Encoding:");
  console.log("  Test value:", testValue.toString());
  
  // Encode function call
  const encoded = iface.encodeFunctionData("updateAnswer", [testValue]);
  console.log("  Encoded calldata:", encoded);
  console.log("  Function selector (first 4 bytes):", encoded.substring(0, 10));
  
  // Verify selector
  const expectedSelector = func.selector;
  const actualSelector = encoded.substring(0, 10);
  console.log("\n✅ Selector verification:");
  console.log("  Expected:", expectedSelector);
  console.log("  Actual:  ", actualSelector);
  console.log("  Match:", expectedSelector === actualSelector ? "✅ YES" : "❌ NO");
  
  // Test ABI encoding with different formats
  console.log("\n=== ABI FORMATS FOR CHAINLINK ===");
  console.log("\n1. Function signature (có selector):");
  console.log("   abi=\"updateAnswer(int256)\"");
  console.log("   ✅ Tạo function selector tự động");
  
  console.log("\n2. Type tuple (không có selector):");
  console.log("   abi=\"(int256)\"");
  console.log("   ❌ Không có function selector");
  
  console.log("\n3. Type tuple với tên:");
  console.log("   abi=\"(int256 answer)\"");
  console.log("   ❌ Không có function selector");
  
  console.log("\n✅ KẾT LUẬN:");
  console.log("   - Contract function: updateAnswer(int256 answer) ✅");
  console.log("   - Chainlink ABI nên dùng: 'updateAnswer(int256)' ✅");
  console.log("   - Data format: {\"answer\": $(multiply)} hoặc [$(multiply)]");
}

main().catch(console.error);


