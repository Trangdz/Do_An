# 🔍 Phân Tích Scenario Thanh Lý

## 📋 Scenario

1. **Thế chấp:** 10 LINK @ 10 USD/LINK = 100 USD
2. **Vay:** 60 USD
3. **Giá LINK giảm:** 7 USD/LINK
4. **Thanh lý:** 30 USDC
5. **Vấn đề:** HF vẫn < 1 sau khi thanh lý

## 📊 Tính Toán Chi Tiết

### Bước 1: Trước Khi Thanh Lý

**Dữ liệu:**
- Collateral: 10 LINK
- Giá LINK: 7 USD/LINK
- Debt: 60 USD
- LTV: 75%
- Liquidation Threshold: 80%

**Tính toán:**
- Collateral Value (raw) = 10 × 7 = **70 USD**
- Collateral Value (weighted by LTV) = 70 × 0.75 = **52.5 USD**
- Collateral Value (weighted by LiqThreshold) = 70 × 0.80 = **56 USD**
- Health Factor (LTV) = 52.5 / 60 = **0.875 < 1.0** ❌
- Health Factor (LiqThreshold) = 56 / 60 = **0.933 < 1.0** ❌

**Kết luận:** Position có thể thanh lý

### Bước 2: Thanh Lý 30 USDC

**Logic thanh lý:**
1. Liquidator trả 30 USDC
2. Tính seize amount với bonus 5%:
   - Repay USD = 30 USD
   - Seize USD = 30 × (1 + 0.05) = **31.5 USD**
   - Seize LINK = 31.5 / 7 = **4.5 LINK**

**Sau thanh lý:**
- Collateral còn lại = 10 - 4.5 = **5.5 LINK**
- Debt còn lại = 60 - 30 = **30 USD**

### Bước 3: HF Sau Thanh Lý

**Tính toán:**
- Collateral Value (raw) = 5.5 × 7 = **38.5 USD**
- Collateral Value (weighted by LTV) = 38.5 × 0.75 = **28.875 USD**
- Collateral Value (weighted by LiqThreshold) = 38.5 × 0.80 = **30.8 USD**
- Health Factor (LTV) = 28.875 / 30 = **0.9625 < 1.0** ❌
- Health Factor (LiqThreshold) = 30.8 / 30 = **1.0267 > 1.0** ✅

## ⚠️ Vấn Đề

### Vấn Đề 1: Contract Chưa Được Redeploy

**Nếu contract vẫn dùng LTV (chưa được redeploy với fix):**
- HF = 0.9625 < 1.0
- Position **VẪN CÓ THỂ THANH LÝ** ❌

**Nếu contract đã dùng Liquidation Threshold (đã redeploy):**
- HF = 1.0267 > 1.0
- Position **KHÔNG THỂ THANH LÝ** ✅

### Vấn Đề 2: Close Factor

**Close Factor = 50%:**
- Max repay = 60 × 0.50 = **30 USD**
- User đã thanh lý đúng 30 USD (tối đa)

**Nếu muốn HF > 1 sau thanh lý:**
- Cần thanh lý nhiều hơn 30 USD
- Nhưng bị giới hạn bởi Close Factor = 50%

### Vấn Đề 3: Logic Thanh Lý

**Hiện tại:**
- Contract chỉ check HF < 1.0 trước khi thanh lý
- Không đảm bảo HF > 1.0 sau khi thanh lý
- Có thể cần thanh lý nhiều lần

**Giải pháp:**
- Sau khi thanh lý, re-check HF
- Nếu HF vẫn < 1.0, có thể thanh lý tiếp
- Hoặc tăng Close Factor để thanh lý nhiều hơn trong 1 lần

## 🔧 Giải Pháp

### Giải Pháp 1: Redeploy Contract với Fix

**Sửa Health Factor dùng Liquidation Threshold:**
```solidity
// Trước:
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;

// Sau:
uint256 weightedCollateral = (supplyValueUSD * uint256(r.liqThresholdBps)) / 10000;
```

**Kết quả:**
- HF sau thanh lý = 1.0267 > 1.0 ✅
- Position không thể thanh lý tiếp

### Giải Pháp 2: Tăng Close Factor

**Nếu muốn thanh lý nhiều hơn trong 1 lần:**
- Tăng Close Factor từ 50% lên 75% hoặc 100%
- Cho phép thanh lý nhiều hơn để đảm bảo HF > 1.0

**Ví dụ với Close Factor = 75%:**
- Max repay = 60 × 0.75 = **45 USD**
- Seize = (45 × 1.05) / 7 = **6.75 LINK**
- Collateral còn lại = 10 - 6.75 = **3.25 LINK**
- Debt còn lại = 60 - 45 = **15 USD**
- Collateral Value = 3.25 × 7 = **22.75 USD**
- HF (LiqThreshold) = (22.75 × 0.80) / 15 = **1.213 > 1.0** ✅

### Giải Pháp 3: Cho Phép Thanh Lý Nhiều Lần

**Logic hiện tại:**
- Sau khi thanh lý 30 USD, HF vẫn < 1.0
- Liquidator có thể thanh lý tiếp 30 USD nữa
- Lặp lại cho đến khi HF > 1.0

**Code đã thêm:**
```solidity
// Re-check HF(user) sau khi thanh lý
(, , uint256 hfAfter) = _getAccountData(user);
// Nếu HF vẫn < 1, liquidator có thể thanh lý tiếp
```

## 📝 Tóm Tắt

1. **Vấn đề:** HF vẫn < 1.0 sau khi thanh lý 30 USD
2. **Nguyên nhân:** 
   - Contract chưa được redeploy (vẫn dùng LTV)
   - Close Factor = 50% giới hạn số tiền thanh lý
3. **Giải pháp:**
   - Redeploy contract với fix (dùng LiqThreshold)
   - Hoặc tăng Close Factor
   - Hoặc cho phép thanh lý nhiều lần

## 🎯 Next Steps

1. **Redeploy contract** với fix Health Factor
2. **Test lại scenario** với dữ liệu thực tế
3. **Kiểm tra HF** sau khi thanh lý
4. **Nếu vẫn < 1.0:** Có thể cần thanh lý tiếp hoặc tăng Close Factor

