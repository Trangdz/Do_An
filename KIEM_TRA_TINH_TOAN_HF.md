# 🔍 Kiểm Tra Tính Toán Health Factor Sau Thanh Lý

## 📋 Thông Số

- **Liquidation Threshold:** 80%
- **Maximum LTV:** 75%
- **Bonus:** 6%

## 📊 Scenario

1. **Thế chấp:** 10 LINK @ 10 USD/LINK = 100 USD
2. **Vay:** 60 USD
3. **Giá giảm:** 7 USD/LINK
4. **Liquidator trả:** 30 USD

## 🧮 Tính Toán Chi Tiết

### Bước 1: Trước Khi Thanh Lý

**Dữ liệu:**
- Collateral: 10 LINK
- Giá LINK: 7 USD/LINK
- Debt: 60 USD
- Liquidation Threshold: 80%

**Tính toán:**
- Collateral Value (raw) = 10 × 7 = **70 USD**
- Collateral Value (weighted by LiqThreshold 80%) = 70 × 0.80 = **56 USD**
- Health Factor = 56 / 60 = **0.9333 < 1.0** ❌

**Kết luận:** Position có thể thanh lý

### Bước 2: Thanh Lý 30 USD

**Logic thanh lý:**
1. Liquidator trả 30 USD
2. Tính seize amount với bonus 6%:
   - Repay USD = 30 USD
   - Seize USD = 30 × (1 + 0.06) = **31.8 USD**
   - Seize LINK = 31.8 / 7 = **4.5429 LINK**

**Sau thanh lý:**
- Collateral còn lại = 10 - 4.5429 = **5.4571 LINK**
- Debt còn lại = 60 - 30 = **30 USD**

### Bước 3: HF Sau Thanh Lý

**Tính toán:**
- Collateral Value (raw) = 5.4571 × 7 = **38.1997 USD**
- Collateral Value (weighted by LiqThreshold 80%) = 38.1997 × 0.80 = **30.5598 USD**
- Health Factor = 30.5598 / 30 = **1.0193 > 1.0** ✅

**Kết luận:** Position **KHÔNG THỂ THANH LÝ** tiếp

## 📝 So Sánh Với Contract Logic

### Contract Logic (LendingPool.sol)

```solidity
// 1. Calculate seize amount
uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;
uint256 bonusBps = c.liqBonusBps; // 600 bps = 6%
uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;
uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;

// 2. Update position
uint256 dNew = debtNow - repay1e18;
uint256 cNew = userCollNow - seizeColl1e18;

// 3. Calculate new HF
// HF = (Collateral × LiqThreshold) / Debt
```

### Kết Quả

**Với dữ liệu:**
- Repay: 30 USD
- Bonus: 6% (600 bps)
- Seize: 4.5429 LINK
- Collateral còn lại: 5.4571 LINK
- Debt còn lại: 30 USD

**HF sau thanh lý:**
- HF = (5.4571 × 7 × 0.80) / 30 = **1.0193**

## ✅ Kết Luận

1. **Tính toán đúng:** HF sau thanh lý = **1.0193 > 1.0**
2. **Position an toàn:** Không thể thanh lý tiếp
3. **Logic contract:** Đang dùng Liquidation Threshold (80%) để tính HF ✅

## 🎯 Lưu Ý

- Nếu HF vẫn < 1.0 sau thanh lý, có thể do:
  - Close Factor = 50% giới hạn số tiền thanh lý
  - Interest accrual làm debt tăng
  - Cần thanh lý nhiều lần

- Với scenario này, HF = 1.0193 > 1.0, position an toàn ✅

