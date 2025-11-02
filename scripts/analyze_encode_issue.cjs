const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 PHÂN TÍCH SÂU VẤN ĐỀ ENCODE");
  console.log("=".repeat(70) + "\n");

  // 1. Phân tích contract
  console.log("1️⃣ CONTRACT ANALYSIS:");
  console.log("─".repeat(70));
  console.log("Function: updateAnswer(int256 answer)");
  console.log("ABI: [\"function updateAnswer(int256 answer)\"]");
  console.log("Type: Named parameter (answer)\n");

  // 2. Test encoding với ethers
  console.log("2️⃣ ETHERJS ENCODING TEST:");
  console.log("─".repeat(70));
  const value = BigInt("389531000000"); // Example value
  const iface = new ethers.Interface([
    "function updateAnswer(int256 answer)"
  ]);
  
  // Method 1: Encode với function name và named parameter
  const encoded1 = iface.encodeFunctionData("updateAnswer", [value]);
  console.log("Method 1: iface.encodeFunctionData(\"updateAnswer\", [value])");
  console.log(`  Result: ${encoded1}`);
  console.log(`  Length: ${encoded1.length} chars`);
  console.log(`  Function selector: ${encoded1.substring(0, 10)}\n`);

  // Method 2: Encode chỉ parameters (không có selector)
  const encoded2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ["int256"],
    [value]
  );
  console.log("Method 2: AbiCoder.encode([\"int256\"], [value])");
  console.log(`  Result: ${encoded2}`);
  console.log(`  Length: ${encoded2.length} chars`);
  console.log(`  Note: Không có function selector\n`);

  // 3. Phân tích vấn đề Chainlink
  console.log("3️⃣ CHAINLINK ETHABIENCODE ANALYSIS:");
  console.log("─".repeat(70));
  console.log("Lỗi: \"expected map, got interface {}\"");
  console.log("Nguyên nhân:");
  console.log("  - Chainlink ethabiencode với ABI có named parameter");
  console.log("    cần data là OBJECT với key = parameter name");
  console.log("  - Ví dụ: ABI=\"updateAnswer(int256 answer)\"");
  console.log("    → Data phải là: {\"answer\": value}");
  console.log("  - Không phải array: [value]\n");

  // 4. Giải pháp
  console.log("4️⃣ GIẢI PHÁP:");
  console.log("─".repeat(70));
  console.log("Option A: Dùng ABI không có tên parameter");
  console.log("  ABI: \"(int256)\"");
  console.log("  Data: [$(multiply)]  ← Array format");
  console.log("  Ưu: Đơn giản");
  console.log("  Nhược: Có thể vẫn lỗi \"expected map\"\n");

  console.log("Option B: Dùng function signature đầy đủ");
  console.log("  ABI: \"updateAnswer(int256 answer)\"");
  console.log("  Data: {\"answer\": $(multiply)}  ← Object format");
  console.log("  Vấn đề: Khó tạo object trong TOML template\n");

  console.log("Option C: Dùng json task để tạo object");
  console.log("  multiply → json task tạo {\"answer\": $(multiply)}");
  console.log("  → encode nhận object đó");
  console.log("  Vấn đề: Escape quotes trong TOML\n");

  console.log("Option D: Dùng bridge task hoặc custom format");
  console.log("  multiply → format task → encode");
  console.log("  Phức tạp hơn\n");

  // 5. Test object format
  console.log("5️⃣ TEST OBJECT FORMAT:");
  console.log("─".repeat(70));
  const testObj = { answer: value.toString() };
  console.log("Object: ", JSON.stringify(testObj));
  console.log("→ Chainlink cần format này cho named parameters\n");

  console.log("=".repeat(70));
  console.log("💡 KẾT LUẬN:");
  console.log("=".repeat(70));
  console.log("Cần dùng:");
  console.log('  ABI="updateAnswer(int256 answer)"');
  console.log('  Data phải là object: {"answer": value}');
  console.log("→ Cần tìm cách tạo object trong Chainlink pipeline\n");
}

main().catch(console.error);



