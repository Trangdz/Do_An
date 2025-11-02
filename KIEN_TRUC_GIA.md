# 📊 KIẾN TRÚC GIÁ TRONG DỰ ÁN LENDHUB

## 🔄 LUỒNG DỮ LIỆU GIÁ

```
Binance API → Chainlink Node → PriceAggregator Contract → Frontend
                                    ↓
                            PriceOracle Contract → LendingPool
```

## 📋 CÁC CONTRACT ĐƯỢC SỬ DỤNG

### 1️⃣ **PriceAggregator** (Contract nhận dữ liệu từ Chainlink)

**Vai trò:** Nhận giá từ Chainlink node và lưu trữ

**Địa chỉ deployed:**
- ETH: `0xCb215B63885E7fbE526c3eb60E0DBf346B95eb25`
- WETH: `0x2B8e8EFd011c9B43765D9f7b32D54eFe3fbc5eCd`
- USDC: `0xE61cD632ef12182Cfce5B5A086f6f5e7bDf322C9`
- DAI: `0x3F584c47bB8Eb94E004A8f412c778681E3DBe4B7`
- LINK: `0x5b69cB58C4A20797C6F5C1a9e1b7BE2E0d9b801D`

**Functions chính:**
- `updateAnswer(int256 answer_)` - Chainlink node gọi để set giá
- `latestRoundData()` - Frontend/contracts khác đọc giá
- `setWriter(address writer, bool allowed)` - Authorize Chainlink node

**Chainlink Jobs:**
- Mỗi 1 phút, Chainlink node:
  1. Fetch giá từ Binance API
  2. Parse và multiply (nhân 100000000 để có 8 decimals)
  3. Encode thành function call
  4. Gọi `updateAnswer()` trên PriceAggregator contract

---

### 2️⃣ **PriceOracle** (Contract được LendingPool sử dụng)

**Vai trò:** Cung cấp giá cho LendingPool contract

**Địa chỉ:** `0x53fB23fbCcA52b758de8715dccB070F814251Ace`

**Functions:**
- `setAssetPrice(address token, uint256 price)` - Set giá thủ công (hiện tại)
- `getAssetPrice1e18(address token)` - LendingPool đọc giá

**Vấn đề hiện tại:**
- PriceOracle đang dùng `setAssetPrice()` thủ công (set giá cố định khi deploy)
- Chưa kết nối với PriceAggregator để tự động cập nhật

---

### 3️⃣ **ChainlinkPriceOracle** (Contract có sẵn nhưng chưa deploy)

**Vai trò:** Oracle production-ready, đọc từ PriceAggregator

**Features:**
- Mapping token → PriceAggregator address
- Đọc giá từ PriceAggregator qua `latestRoundData()`
- Validate data freshness (không cho phép giá quá cũ)
- Tự động convert decimals (8 → 18)

**Hiện tại:** Chưa được deploy, chỉ có PriceOracle đơn giản

---

## 🔍 CÁCH HOẠT ĐỘNG HIỆN TẠI

### Backend (Smart Contracts):
1. **Chainlink Node** chạy jobs mỗi 1 phút
2. Jobs gọi `updateAnswer()` trên **PriceAggregator** contracts
3. **PriceAggregator** lưu giá mới vào storage
4. **PriceOracle** vẫn dùng giá cũ (set thủ công khi deploy)

### Frontend:
1. Frontend đọc trực tiếp từ **PriceAggregator** qua `useChainlinkPrice` hook
2. Hiển thị giá real-time trên Markets page
3. Không phụ thuộc vào PriceOracle

---

## ⚠️ VẤN ĐỀ HIỆN TẠI

**Không đồng bộ:**
- PriceAggregator: Có giá real-time từ Chainlink ✅
- PriceOracle: Giá cố định từ khi deploy ❌
- LendingPool: Đọc từ PriceOracle (giá cũ) ❌
- Frontend: Đọc từ PriceAggregator (giá mới) ✅

**Hệ quả:**
- Frontend hiển thị giá đúng
- Nhưng tính toán trong LendingPool (liquidation, collateral, borrow) dùng giá cũ

---

## ✅ GIẢI PHÁP ĐỀ XUẤT

### Option 1: Deploy ChainlinkPriceOracle (Recommended)
1. Deploy `ChainlinkPriceOracle` contract
2. Map các token → PriceAggregator addresses
3. Update LendingPool để dùng ChainlinkPriceOracle thay vì PriceOracle

### Option 2: Update PriceOracle tự động
1. Tạo job Chainlink để gọi `setAssetPrice()` trên PriceOracle
2. Sau khi update PriceAggregator, tự động update PriceOracle

### Option 3: LendingPool đọc trực tiếp từ PriceAggregator
1. Modify LendingPool để đọc từ PriceAggregator thay vì PriceOracle
2. Đơn giản hơn nhưng phải sửa contract

---

## 📝 TÓM TẮT

**Contract nhận dữ liệu:**
- ✅ **PriceAggregator** - Nhận giá từ Chainlink node qua `updateAnswer()`

**Contract set giá:**
- ⚠️ **PriceOracle** - Set giá thủ công (chưa tự động)
- ✅ **PriceAggregator** - Set giá tự động từ Chainlink (đang hoạt động)

**Contract đọc giá:**
- **Frontend:** Đọc từ PriceAggregator (✅ real-time)
- **LendingPool:** Đọc từ PriceOracle (❌ giá cũ)

**Khuyến nghị:** Deploy ChainlinkPriceOracle và kết nối với PriceAggregator để đồng bộ giá cho toàn bộ system.



