# Luồng Dữ Liệu: Chainlink Node → MultiPriceAggregator

## Câu Trả Lời: **CÓ, CẦN QUA RPC**

Cả **ghi** và **đọc** dữ liệu từ MultiPriceAggregator đều cần qua RPC.

## 📊 Hai Luồng Chính

### 1️⃣ Chainlink Node GHI Giá Vào MultiPriceAggregator (Qua RPC)

```
Chainlink Node (Off-chain)
  ↓
Fetch giá từ Binance API (HTTP)
  ↓
Encode transaction data
  ↓
Gửi transaction qua RPC → MultiPriceAggregator.updatePrice()
  ↓
MultiPriceAggregator (On-chain) - Lưu giá vào storage
```

**Chi tiết:**

1. **Chainlink Job (TOML file)** chạy theo lịch (ví dụ: `@every 3m`)
   ```toml
   # chainlink-data/job-weth.toml
   schedule = "@every 3m"
   observationSource = """
   fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"]
   parse    [type="jsonparse" path="price" data="$(fetch)"]
   multiply [type="multiply" input="$(parse)" times=100000000]
   encode   [type="ethabiencode" abi="updatePrice(string symbol, int256 price)" data="..."]
   submit   [type="ethtx" to="0xFF13881F1A48cEF04aC5c341aa9D3aFCAB60d4C3" data="$(encode)" gasLimit="500000"]
   """
   ```

2. **Chainlink Node** thực hiện:
   - Fetch giá từ Binance API (HTTP request, không qua RPC)
   - Encode function call `updatePrice(symbol, price)`
   - **Gửi transaction qua RPC** đến MultiPriceAggregator contract
   - Transaction được ký bởi Chainlink node wallet (writer)

3. **MultiPriceAggregator** nhận transaction và lưu giá vào storage:
   ```solidity
   function updatePrice(string memory symbol, int256 price) external onlyWriter {
       prices[symbol].price = price;
       prices[symbol].roundId++;
       prices[symbol].updatedAt = block.timestamp;
   }
   ```

**Kết luận:** Chainlink node **CẦN QUA RPC** để gửi transaction ghi giá vào MultiPriceAggregator.

---

### 2️⃣ Frontend/Backend ĐỌC Giá Từ MultiPriceAggregator (Qua RPC)

```
Frontend/Backend
  ↓
Gọi view function qua RPC
  ↓
MultiPriceAggregator.getPrice() hoặc getAssetPrice1e18()
  ↓
Trả về giá từ storage
```

**Chi tiết:**

1. **Frontend/Backend** gọi view function:
   ```javascript
   // Qua RPC (server-side hoặc client-side)
   const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
   const aggregator = new ethers.Contract(
       MULTI_PRICE_AGGREGATOR_ADDRESS,
       ABI,
       provider
   );
   
   // Đọc giá - CẦN QUA RPC
   const price = await aggregator.getAssetPrice1e18(tokenAddress);
   ```

2. **MultiPriceAggregator** trả về giá từ storage:
   ```solidity
   function getAssetPrice1e18(address token) external view returns (uint256) {
       string memory symbol = tokenSymbols[token];
       PriceData memory priceData = prices[symbol];
       return uint256(priceData.price) * 1e10; // Convert 8 decimals → 18 decimals
   }
   ```

**Kết luận:** Để đọc giá từ MultiPriceAggregator, **CẦN QUA RPC** để gọi view function.

---

## 🔄 Tóm Tắt

| Hoạt Động | Có Cần RPC? | Giải Thích |
|-----------|-------------|------------|
| **Chainlink node fetch giá từ Binance** | ❌ KHÔNG | HTTP request trực tiếp đến Binance API |
| **Chainlink node ghi giá vào MultiPriceAggregator** | ✅ **CÓ** | Gửi transaction qua RPC |
| **Frontend/Backend đọc giá từ MultiPriceAggregator** | ✅ **CÓ** | Gọi view function qua RPC |

## 📋 Trong Kiến Trúc Next.js

Theo kiến trúc đúng (tất cả qua backend):

```
Frontend (Browser)
  ↓
Next.js API Route (/api/price/[token])
  ↓
RPC Call → MultiPriceAggregator.getAssetPrice1e18()
  ↓
Trả về giá cho Frontend
```

**Chainlink Node** (riêng biệt, không qua Next.js backend):
```
Chainlink Node
  ↓
Fetch từ Binance API (HTTP)
  ↓
RPC Transaction → MultiPriceAggregator.updatePrice()
```

## ⚠️ Lưu Ý

1. **Chainlink node** là service riêng biệt, không phải part của Next.js backend
2. **Chainlink node** cần được authorize làm `writer` của MultiPriceAggregator
3. **Frontend/Backend** chỉ đọc giá, không thể ghi (chỉ writer mới được ghi)
4. Tất cả tương tác với blockchain (đọc/ghi) đều **CẦN QUA RPC**





