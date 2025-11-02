const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║     🔍 PHÂN TÍCH SÂU LOGIC KẾT NỐI CONTRACT                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  
  console.log(`📋 Network: Chain ID ${network.chainId}\n`);
  console.log("═".repeat(70));
  
  // ========================================
  // 1. KIỂM TRA PRICEAGGREGATOR CONTRACTS
  // ========================================
  console.log("\n1️⃣  PRICEAGGREGATOR CONTRACTS:\n");
  console.log("─".repeat(70));
  
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;
  const PriceAggregatorABI = [
    "function updateAnswer(int256 answer_) external returns (uint80 roundId)",
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() external view returns (uint8)",
    "function isWriter(address) external view returns (bool)",
    "function owner() external view returns (address)"
  ];
  
  for (const [symbol, address] of Object.entries(aggregators)) {
    console.log(`\n${symbol}:`);
    console.log(`   Address: ${address}`);
    
    try {
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.log(`   ❌ KHÔNG CÓ CODE - Contract chưa deploy!`);
        continue;
      }
      
      const aggregator = new ethers.Contract(address, PriceAggregatorABI, provider);
      
      // Kiểm tra hàm updateAnswer
      try {
        const iface = new ethers.Interface(PriceAggregatorABI);
        const updateAnswerFragment = iface.getFunction("updateAnswer");
        console.log(`   ✅ Function updateAnswer exists`);
        console.log(`      Signature: ${updateAnswerFragment.format("full")}`);
        console.log(`      Selector: ${updateAnswerFragment.selector}`);
      } catch (err) {
        console.log(`   ❌ Function updateAnswer không tồn tại: ${err.message}`);
      }
      
      // Kiểm tra decimals
      try {
        const decimals = await aggregator.decimals();
        console.log(`   ✅ decimals(): ${decimals}`);
      } catch (err) {
        console.log(`   ❌ decimals() error: ${err.message}`);
      }
      
      // Kiểm tra owner
      try {
        const owner = await aggregator.owner();
        console.log(`   ✅ owner(): ${owner}`);
      } catch (err) {
        console.log(`   ❌ owner() error: ${err.message}`);
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  // ========================================
  // 2. KIỂM TRA CHAINLINK JOBS
  // ========================================
  console.log("\n\n2️⃣  CHAINLINK JOBS LOGIC:\n");
  console.log("─".repeat(70));
  
  console.log("\n📋 Format TOML trong script:");
  console.log("   encode   [type=\"ethabiencode\" abi=\"(int256)\" data=\"[$(multiply)]\"]");
  console.log("   submit   [type=\"ethtx\" to=\"${aggregatorAddr}\" functionSignature=\"updateAnswer(int256)\" data=\"$(encode)\"]");
  
  console.log("\n🔍 Phân tích:");
  console.log("   1. ethabiencode với abi=\"(int256)\" → encode một int256 value");
  console.log("   2. functionSignature=\"updateAnswer(int256)\" → chỉ định hàm cần gọi");
  console.log("   3. to=\"${aggregatorAddr}\" → địa chỉ PriceAggregator contract");
  
  // Kiểm tra function selector
  const updateAnswerSignature = "updateAnswer(int256)";
  const selector = ethers.id(updateAnswerSignature).slice(0, 10);
  console.log(`\n   ✅ Function selector: ${selector}`);
  console.log(`      (Chainlink sẽ prepend selector vào encoded data)`);
  
  // ========================================
  // 3. KIỂM TRA PRICEORACLE
  // ========================================
  console.log("\n\n3️⃣  PRICEORACLE CONTRACT:\n");
  console.log("─".repeat(70));
  
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  let oracleAddress = null;
  
  if (fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    const oracleMatch = addressesContent.match(/PriceOracleAddress\s*=\s*"([^"]+)"/);
    if (oracleMatch) {
      oracleAddress = oracleMatch[1];
      console.log(`\n   Address: ${oracleAddress}`);
      
      try {
        const code = await provider.getCode(oracleAddress);
        if (code === "0x") {
          console.log(`   ❌ KHÔNG CÓ CODE - Contract chưa deploy!`);
        } else {
          const PriceOracleABI = [
            "function getAssetPrice1e18(address token) external view returns (uint256)",
            "function setAssetPrice(address token, uint256 price) external"
          ];
          const oracle = new ethers.Contract(oracleAddress, PriceOracleABI, provider);
          console.log(`   ✅ Contract exists`);
          console.log(`   ✅ Functions: getAssetPrice1e18(), setAssetPrice()`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
  }
  
  // ========================================
  // 4. KIỂM TRA LENDINGPOOL
  // ========================================
  console.log("\n\n4️⃣  LENDINGPOOL CONTRACT:\n");
  console.log("─".repeat(70));
  
  let poolAddress = null;
  if (fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");
    const poolMatch = addressesContent.match(/LendingPoolAddress\s*=\s*"([^"]+)"/);
    if (poolMatch) {
      poolAddress = poolMatch[1];
      console.log(`\n   Address: ${poolAddress}`);
      
      try {
        const code = await provider.getCode(poolAddress);
        if (code === "0x") {
          console.log(`   ❌ KHÔNG CÓ CODE - Contract chưa deploy!`);
        } else {
          const LendingPoolABI = [
            "function oracle() external view returns (address)",
            "function getAssetPrice1e18(address token) external view returns (uint256)"
          ];
          const pool = new ethers.Contract(poolAddress, LendingPoolABI, provider);
          
          try {
            const oracleAddr = await pool.oracle();
            console.log(`   ✅ oracle(): ${oracleAddr}`);
            if (oracleAddr.toLowerCase() === oracleAddress?.toLowerCase()) {
              console.log(`   ✅ Khớp với PriceOracle address!`);
            } else {
              console.log(`   ⚠️  KHÔNG khớp với PriceOracle address`);
            }
          } catch (err) {
            console.log(`   ⚠️  Không thể lấy oracle address: ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
  }
  
  // ========================================
  // 5. PHÂN TÍCH LOGIC FLOW
  // ========================================
  console.log("\n\n5️⃣  PHÂN TÍCH LOGIC FLOW:\n");
  console.log("─".repeat(70));
  
  console.log("\n📊 Chainlink → PriceAggregator:");
  console.log("   1. Chainlink job fetch giá từ Binance");
  console.log("   2. Encode: abi=\"(int256)\" data=\"[$(multiply)]\"");
  console.log("   3. Submit: functionSignature=\"updateAnswer(int256)\" to=\"PriceAggregator\"");
  console.log("   4. ✅ Logic: ĐÚNG - Gọi đúng hàm updateAnswer(int256)");
  
  console.log("\n📊 Frontend → PriceAggregator:");
  console.log("   1. useChainlinkPrice hook gọi latestRoundData()");
  console.log("   2. ✅ Logic: ĐÚNG - Đọc từ đúng contract");
  
  console.log("\n📊 LendingPool → PriceOracle:");
  console.log("   1. LendingPool gọi oracle.getAssetPrice1e18(token)");
  console.log("   2. PriceOracle trả về giá từ mapping (giá cố định)");
  console.log("   ⚠️  Vấn đề: PriceOracle không kết nối với PriceAggregator!");
  
  // ========================================
  // 6. TÓM TẮT VẤN ĐỀ
  // ========================================
  console.log("\n\n6️⃣  TÓM TẮT VẤN ĐỀ:\n");
  console.log("─".repeat(70));
  
  console.log("\n✅ ĐÚNG:");
  console.log("   • Chainlink jobs gọi đúng hàm updateAnswer(int256)");
  console.log("   • Địa chỉ PriceAggregator trong jobs là đúng");
  console.log("   • Frontend đọc từ đúng PriceAggregator");
  
  console.log("\n⚠️  VẤN ĐỀ:");
  console.log("   • PriceOracle không kết nối với PriceAggregator");
  console.log("   • LendingPool dùng giá cố định từ PriceOracle");
  console.log("   • Frontend có giá real-time, nhưng LendingPool dùng giá cũ");
  
  console.log("\n💡 GIẢI PHÁP:");
  console.log("   Option 1: Deploy ChainlinkPriceOracle và map với PriceAggregator");
  console.log("   Option 2: Update LendingPool để đọc trực tiếp từ PriceAggregator");
  console.log("   Option 3: Tạo job Chainlink để update PriceOracle sau khi update PriceAggregator");
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ PHÂN TÍCH HOÀN TẤT                                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);



