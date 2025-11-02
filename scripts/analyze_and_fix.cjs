const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          🔍 PHÂN TÍCH NGUYÊN NHÂN VÀ SỬA LỖI                     ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // 1. Phân tích vấn đề
  console.log("📊 PHÂN TÍCH:");
  console.log("─".repeat(70));
  
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  console.log("\n1️⃣  Địa chỉ trong aggregators.json:");
  Object.entries(aggregators).forEach(([symbol, addr]) => {
    console.log(`   ${symbol}: ${addr}`);
  });

  console.log("\n2️⃣  Kiểm tra trên blockchain:");
  const provider = ethers.provider;
  let allExist = true;
  
  for (const [symbol, address] of Object.entries(aggregators)) {
    const code = await provider.getCode(address);
    const exists = code !== "0x";
    if (!exists) allExist = false;
    console.log(`   ${symbol}: ${exists ? "✅ CÓ CODE" : "❌ KHÔNG CÓ CODE"}`);
  }

  // 2. Nguyên nhân
  console.log("\n🔍 NGUYÊN NHÂN:");
  console.log("─".repeat(70));
  if (!allExist) {
    console.log("❌ Các contract PriceAggregator KHÔNG tồn tại trên blockchain!");
    console.log("   → Có thể do:");
    console.log("      1. Ganache đã reset (mất state)");
    console.log("      2. Chưa chạy deploy script");
    console.log("      3. Deploy bằng mnemonic khác");
    console.log("      4. File aggregators.json có địa chỉ cũ");
  } else {
    console.log("✅ Tất cả contracts đều tồn tại");
  }

  // 3. Giải pháp
  console.log("\n💡 GIẢI PHÁP:");
  console.log("─".repeat(70));
  if (!allExist) {
    console.log("✅ Cần chạy lại script deploy:");
    console.log("   npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache");
    console.log("\n   Script sẽ:");
    console.log("   1. Deploy lại tất cả PriceAggregator contracts");
    console.log("   2. Cập nhật aggregators.json với địa chỉ mới");
    console.log("   3. Cập nhật frontend contracts.ts tự động");
    console.log("   4. Mint tokens cho test accounts");
    console.log("\n   Sau đó:");
    console.log("   → Chạy: node scripts/setup_chainlink_complete.cjs");
    console.log("   → Để authorize node, fund node, và tạo jobs");
  } else {
    console.log("✅ Contracts đã tồn tại, chỉ cần:");
    console.log("   1. Authorize node: node scripts/authorize_all_aggregators.cjs");
    console.log("   2. Fund node: node scripts/fund_node.cjs");
    console.log("   3. Create jobs: node scripts/setup_chainlink_complete.cjs");
  }

  // 4. Kiểm tra Chainlink node
  console.log("\n🔗 KIỂM TRA CHAINLINK:");
  console.log("─".repeat(70));
  try {
    const { execSync } = require("child_process");
    const dockerPs = execSync("docker ps --format \"{{.Names}}\" | findstr chainlink", { encoding: 'utf8' });
    if (dockerPs.trim()) {
      console.log("✅ Chainlink node đang chạy");
    } else {
      console.log("❌ Chainlink node KHÔNG chạy");
      console.log("   → Chạy: docker-compose up -d");
    }
  } catch {
    console.log("⚠️  Không thể kiểm tra (có thể Docker không chạy)");
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ PHÂN TÍCH HOÀN TẤT                                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



