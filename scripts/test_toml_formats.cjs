// Test các format TOML khác nhau để tìm format đúng

const formats = [
  {
    name: "Format 1: Array với functionSignature (Đang dùng - WORK)",
    toml: `encode   [type="ethabiencode" abi="(int256)" data="[$(multiply)]"]
submit   [type="ethtx" to="0xYourAggregatorContractAddress" functionSignature="updateAnswer(int256)" data="$(encode)"]`
  },
  {
    name: "Format 2: JSON map với concat (User đề xuất)",
    toml: `jsonstr  [type="concat" values="{\\"answer_\\":" "$(multiply)"}"]
jsonobj  [type="jsonparse" data="$(jsonstr)"]
encode   [type=ethabiencode abi="updateAnswer(int256)" data="$(jsonobj)"]
submit   [type=ethtx to="0xYourAggregatorContractAddress" data="$(encode)"]`
  },
  {
    name: "Format 3: JSON map trực tiếp (Đã test - FAIL)",
    toml: `encode   [type="ethabiencode" abi="updateAnswer(int256)" data='{"answer_": $(multiply)}']
submit   [type="ethtx" to="0xYourAggregatorContractAddress" data="$(encode)"]`
  }
];

console.log("📋 CÁC FORMAT TOML CHO CHAINLINK 1.13.0:\n");
console.log("═".repeat(70));

formats.forEach((fmt, idx) => {
  console.log(`\n${idx + 1}. ${fmt.name}`);
  console.log("─".repeat(70));
  console.log(fmt.toml);
});

console.log("\n\n💡 PHÂN TÍCH:\n");
console.log("═".repeat(70));
console.log("\n✅ FORMAT 1 (Đang dùng):");
console.log("   • Dùng array format [$(multiply)] với ABI không named parameter");
console.log("   • Dùng functionSignature trong ethtx để chỉ định hàm");
console.log("   • Đã test và WORK!");
console.log("\n⚠️  FORMAT 2 (User đề xuất):");
console.log("   • Dùng concat + jsonparse để tạo JSON object");
console.log("   • Có thể gặp lỗi TOML parsing với dấu ngoặc kép");
console.log("   • Cần test lại");
console.log("\n❌ FORMAT 3 (Đã test - FAIL):");
console.log("   • Dùng single quotes cho JSON map");
console.log("   • Chainlink 1.13.0 không parse được");

console.log("\n\n🔧 RECOMMENDATION:\n");
console.log("═".repeat(70));
console.log("Format 1 đang hoạt động tốt. Nếu muốn dùng named parameter,");
console.log("có thể thử Format 2 nhưng cần escape quotes cẩn thận.");



