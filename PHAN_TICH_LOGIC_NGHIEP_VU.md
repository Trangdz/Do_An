# PHÂN TÍCH LOGIC NGHIỆP VỤ CHO GOVERNANCE PROPOSALS

## 📋 CÁC PROPOSAL TYPES CẦN TRIỂN KHAI

### 1. Change Liquidation Threshold
**Mục đích:** Thay đổi ngưỡng thanh lý (khi nào bắt đầu liquidation)

**Logic nghiệp vụ:**
- Threshold phải > LTV (không thể thanh lý khi LTV < Threshold)
- Threshold ≤ 100% (không thể vượt 100%)
- Khi threshold giảm → dễ bị thanh lý hơn (risk tăng)
- Khi threshold tăng → khó bị thanh lý hơn (risk giảm)

**Validation:**
- `newThreshold > LTV` (phải lớn hơn LTV)
- `newThreshold <= 10000` (không vượt 100%)

**Function:** `updateLiquidationThreshold(address asset, uint16 newLiqThresholdBps)`

---

### 2. Change Liquidation Bonus
**Mục đích:** Thay đổi bonus cho liquidator khi thanh lý

**Logic nghiệp vụ:**
- Bonus thường 5-10% (500-1000 bps)
- Bonus cao → liquidator có động lực hơn → dễ thanh lý hơn
- Bonus thấp → liquidator ít động lực → khó thanh lý hơn

**Validation:**
- `newBonus >= 0` (không thể âm)
- `newBonus <= 2000` (thường không quá 20%)

**Function:** Cần tạo `updateLiquidationBonus(address asset, uint16 newLiqBonusBps)`

---

### 3. Change LTV (Loan-to-Value)
**Mục đích:** Thay đổi tỷ lệ cho vay tối đa so với giá trị collateral

**Logic nghiệp vụ:**
- LTV cao → có thể vay nhiều hơn → risk tăng
- LTV thấp → có thể vay ít hơn → risk giảm
- LTV phải < Liquidation Threshold

**Validation:**
- `newLTV <= 10000` (không vượt 100%)
- `newLTV < Liquidation Threshold` (phải nhỏ hơn threshold)

**Function:** `updateLTV(address asset, uint16 newLtvBps)` ✅ (đã có)

---

### 4. Change Borrow Cap / Supply Cap
**Mục đích:** Thay đổi giới hạn tổng số token có thể borrow/supply

**Logic nghiệp vụ:**
- Cap = 0 → không giới hạn
- Cap > 0 → giới hạn tổng supply/borrow
- Cap thấp → kiểm soát risk tốt hơn
- Cap cao → cho phép nhiều hơn

**Validation:**
- `newCap >= 0` (có thể = 0 để bỏ giới hạn)
- Supply Cap thường ≥ Borrow Cap

**Function:** Cần tạo:
- `updateBorrowCap(address asset, uint128 newBorrowCap)`
- `updateSupplyCap(address asset, uint128 newSupplyCap)`

---

### 5. Pause Asset / Unpause Asset
**Mục đích:** Tạm dừng/khôi phục các operations trên asset

**Logic nghiệp vụ:**
- Pause → không thể lend, borrow, withdraw, repay, liquidate
- Unpause → khôi phục tất cả operations
- Dùng khi có vấn đề về security hoặc market conditions

**Validation:**
- Asset phải đã được init
- Pause → check asset chưa bị pause
- Unpause → check asset đã bị pause

**Function:** Cần tạo:
- `pauseAsset(address asset)`
- `unpauseAsset(address asset)`

---

### 6. Change Reserve Factor
**Mục đích:** Thay đổi tỷ lệ lãi suất dành cho protocol reserve

**Logic nghiệp vụ:**
- Reserve Factor cao → protocol thu nhiều hơn → users nhận ít hơn
- Reserve Factor thấp → protocol thu ít hơn → users nhận nhiều hơn
- Thường 5-15% (500-1500 bps)

**Validation:**
- `newFactor <= 10000` (không vượt 100%)

**Function:** Cần tạo `updateReserveFactor(address asset, uint16 newReserveFactorBps)`

---

### 7. Change Interest Rate Model (slope1, slope2, Uopt)
**Mục đích:** Thay đổi parameters của interest rate model

**Logic nghiệp vụ:**
- **Base Rate:** Lãi suất cơ bản khi utilization thấp
- **Slope 1:** Độ dốc từ base rate đến optimal utilization
- **Slope 2:** Độ dốc sau optimal utilization (khi utilization cao)
- **Uopt (Optimal Utilization):** Tỷ lệ sử dụng tối ưu (khi nào chuyển slope1 → slope2)

**Validation:**
- `baseRate < slope1 < slope2` (thứ tự hợp lý)
- `optimalU <= 10000` (không vượt 100%)
- `optimalU` thường 70-85%

**Function:** Cần tạo `updateInterestRateModel(address asset, uint64 baseRate, uint64 slope1, uint64 slope2, uint16 optimalU)`

---

## 🔍 VALIDATION RULES TỔNG HỢP

### 1. Liquidation Threshold
```solidity
require(newThreshold <= 10000, "Threshold cannot exceed 100%");
require(newThreshold > r.ltvBps, "Threshold must be > LTV");
```

### 2. Liquidation Bonus
```solidity
require(newBonus <= 2000, "Bonus cannot exceed 20%");
```

### 3. LTV
```solidity
require(newLTV <= 10000, "LTV cannot exceed 100%");
require(newLTV < r.liqThresholdBps, "LTV must be < Threshold");
```

### 4. Caps
```solidity
// Supply Cap
require(newSupplyCap >= 0, "Invalid supply cap");

// Borrow Cap
require(newBorrowCap >= 0, "Invalid borrow cap");
// Optional: require(newSupplyCap >= newBorrowCap, "Supply cap should >= Borrow cap");
```

### 5. Reserve Factor
```solidity
require(newFactor <= 10000, "Reserve factor cannot exceed 100%");
```

### 6. Interest Rate Model
```solidity
require(baseRate < slope1, "Base rate must be < Slope 1");
require(slope1 < slope2, "Slope 1 must be < Slope 2");
require(optimalU <= 10000, "Optimal utilization cannot exceed 100%");
```

---

## 📝 FORMAT DESCRIPTION CHO CONTRACT PARSING

### Change Liquidation Threshold
```
Asset: WETH
Proposed Threshold (%): 85
```

### Change Liquidation Bonus
```
Asset: WETH
Proposed Bonus (%): 7
```

### Change LTV
```
Asset: WETH
Proposed LTV (%): 75
```

### Change Borrow Cap
```
Asset: WETH
Proposed Borrow Cap: 50000000
```

### Change Supply Cap
```
Asset: WETH
Proposed Supply Cap: 100000000
```

### Pause Asset
```
Asset: WETH
Pause Asset
```

### Unpause Asset
```
Asset: WETH
Unpause Asset
```

### Change Reserve Factor
```
Asset: WETH
Proposed Reserve Factor (%): 12
```

### Change Interest Rate Model
```
Asset: WETH
Proposed Base Rate (APR %): 2
Proposed Slope 1 (APR %): 5
Proposed Slope 2 (APR %): 100
Optimal Utilization (%): 80
```

---

## 🎯 IMPLEMENTATION PLAN

1. ✅ Thêm các functions còn thiếu vào LendingPool
2. ✅ Thêm logic xử lý vào LendHubGovernor
3. ✅ Thêm helper functions để extract parameters
4. ✅ Cập nhật frontend để chỉ hiển thị các proposal types này
5. ✅ Test validation logic

















