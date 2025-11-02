const fs = require("fs");

// Đọc địa chỉ từ aggregators.json
const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

console.log("\n╔════════════════════════════════════════════════════════════════════╗");
console.log("║     📋 TOML FORMAT VỚI ĐỊA CHỈ THẬT (ETH Ví dụ)                 ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

const ethAggregator = aggregators.ETH;

// Format đang dùng (đang hoạt động)
console.log("✅ FORMAT ĐANG DÙNG (Đang hoạt động):\n");
console.log("─".repeat(70));
const workingFormat = `type            = "cron"
schemaVersion   = 1
name            = "ETH/USD Price Feed"
schedule        = "@every 1m"

observationSource = """
fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="price" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256)" data="[$(multiply)]"]
submit   [type="ethtx" to="${ethAggregator}" functionSignature="updateAnswer(int256)" data="$(encode)"]

fetch -> parse -> multiply -> encode -> submit
"""`;

console.log(workingFormat);

// Format user đề xuất (bị lỗi parsing)
console.log("\n\n❌ FORMAT USER ĐỀ XUẤT (Bị lỗi TOML parsing):\n");
console.log("─".repeat(70));
const userFormat = `type            = "cron"
schemaVersion   = 1
name            = "ETH/USD Feed"
schedule        = "@every 1m"

observationSource = """
fetch    [type=http method=GET url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT" allowUnrestrictedNetworkAccess=true]
parse    [type=jsonparse path="price" data="$(fetch)"]
multiply [type=multiply input="$(parse)" times=100000000]
jsonstr  [type="concat" values="{\\"answer_\\":" "$(multiply)"}"]
jsonobj  [type="jsonparse" data="$(jsonstr)"]
encode   [type=ethabiencode abi="updateAnswer(int256)" data="$(jsonobj)"]
submit   [type=ethtx to="${ethAggregator}" data="$(encode)"]

fetch -> parse -> multiply -> jsonstr -> jsonobj -> encode -> submit
"""`;

console.log(userFormat);

console.log("\n\n📊 ĐỊA CHỈ PRICEAGGREGATOR CHO TẤT CẢ TOKENS:\n");
console.log("─".repeat(70));
Object.entries(aggregators).forEach(([symbol, addr]) => {
  console.log(`   ${symbol.padEnd(6)}: ${addr}`);
});

console.log("\n\n💡 LƯU Ý:\n");
console.log("─".repeat(70));
console.log("✅ Script setup_chainlink_complete.cjs đã tự động:");
console.log("   • Đọc địa chỉ từ deployments/aggregators.json");
console.log("   • Thay ${aggregatorAddr} trong TOML bằng địa chỉ thật");
console.log("   • Tạo jobs với địa chỉ đúng cho mỗi token");
console.log("\n⚠️  Nếu tạo job thủ công, cần thay:");
console.log("   '0xYourAggregatorContractAddress'");
console.log("   bằng địa chỉ thật từ bảng trên");

console.log("\n╔════════════════════════════════════════════════════════════════════╗");
console.log("║              ✅ HOÀN TẤT                                            ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");



