# ✅ KIỂM TRA CÔNG THỨC SUPPLY RATE & RESERVE FACTOR

## 📝 CÔNG THỨC THEO YÊU CẦU:

```
Rsupply = U × Rborrow × (1 - reserveFactor)

Trong đó:
- Rsupply: Lãi suất nhận được khi cho vay
- U: Tỷ lệ sử dụng vốn (utilization rate)
- Rborrow: Lãi suất người vay phải trả
- reserveFactor: Tỷ lệ giao thức giữ lại (protocol revenue)
```

---

## 🔍 KIỂM TRA TRONG CODE:

### File: `contracts/core/InterestRateModel.sol` (Lines 61-65)

```solidity
// supply ≈ borrow * U * (1 - reserveFactor)
// U in WAD; (1 - RF) in WAD

// Step 1: Convert reserveFactor to WAD
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14);
//                     ↑
//             10000 bps = 100%
//                              ↑
//         × 1e14 để convert bps → WAD

// Step 2: Calculate supply rate
uint256 supply = (borrow * U) / 1e18;
supply = (supply * oneMinusRF) / 1e18;
```

---

## 🧮 CHUYỂN ĐỔI DỮ LIỆU:

### Reserve Factor Conversion:

```solidity
// reserveFactorBps = 1000 (10%)
// 10000 - 1000 = 9000 bps

// Convert to WAD (1e18):
oneMinusRF = 9000 × 1e14
           = 9,000,000,000,000,000,000,000
           = 9e21

// But 1 - 0.1 = 0.9 in decimal
// 0.9 in WAD = 9e17
// Not 9e21!

// ❌ LỖI TRONG CONVERSION!
```

### ✅ CONVERSION ĐÚNG PHẢI LÀ:

```solidity
// reserveFactorBps = 1000 (means 10%)

// Convert to decimal:
// reserveFactor = reserveFactorBps / 10000 = 1000 / 10000 = 0.1

// 1 - reserveFactor = 1 - 0.1 = 0.9

// Convert to WAD:
oneMinusRF = 0.9 × 1e18 = 9e17

// NOT: 9000 × 1e14 = 9e21
```

---

## ⚠️ PHÁT HIỆN LỖI:

### Code hiện tại:
```solidity
// Line 63
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14);
//                                   ↑
//                           Nếu RF=1000 (10%)
//                           → 10000 - 1000 = 9000
//                           → 9000 × 1e14 = 9e21
//                           ❌ WRONG! Should be 9e17
```

### Sửa lại:
```solidity
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14) / 10000;
//                                              ↑
//                    9000 × 1e14 = 9e21
//                    ÷ 10000 = 9e17 ✅

// HOẶC:
uint256 oneMinusRF = uint256(10000 - reserveFactorBps);
uint256 oneMinusRFWad = (oneMinusRF * 1e18) / 10000;
//                       = 9000 × 1e18 / 10000
//                       = 9e17 ✅
```

---

## 🧪 VÍ DỤ KIỂM TRA:

### Scenario:
- **Borrow Rate (Rborrow)**: 5% APR
- **Utilization (U)**: 80%
- **Reserve Factor**: 10%

### Công thức đúng:
```
Rsupply = U × Rborrow × (1 - RF)
        = 0.8 × 0.05 × (1 - 0.1)
        = 0.8 × 0.05 × 0.9
        = 0.036
        = 3.6% APR ✅
```

### Với code hiện tại (có lỗi):
```solidity
reserveFactorBps = 1000  // 10%

// Wrong conversion
oneMinusRF = (10000 - 1000) × 1e14
           = 9000 × 1e14
           = 9e21  // ← TOO LARGE!

// Calculation
supply = borrow * U / 1e18;
//      = Rborrow * 0.8e18 / 1e18
//      = Rborrow * 0.8

supply = supply * oneMinusRF / 1e18;
//      = (Rborrow * 0.8) * 9e21 / 1e18
//      = Rborrow * 0.8 * 9e3
//      = Rborrow * 7200
//      ❌ WRONG! Should be 0.72 (not 7200!)
```

---

## ✅ MỨC ĐỘ ẢNH HƯỞNG:

### Lỗi này khiến:
1. ❌ Supply rate TÍNH SAI
2. ❌ Lãi suất người gửi nhận được SAI
3. ❌ Protocol thu ít/nhiều hơn dự kiến

**Risk Level:** 🔴 CRITICAL

---

## 🛠️ CÁCH SỬA:

### Option 1: Fix trong InterestRateModel.sol

```solidity
// OLD (Line 63):
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14);

// NEW:
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e18) / 10000;
//                                   ↑
//                    Convert bps → WAD correctly
```

### Option 2: Rewrite entire formula

```solidity
// Lines 61-65
// Calculate supply rate with correct formula
uint256 reserveFactorWAD = (uint256(reserveFactorBps) * 1e14);
uint256 oneMinusRF = 1e18 - reserveFactorWAD;
uint256 supply = (borrow * U) / 1e18;  // borrow * U
supply = (supply * oneMinusRF) / 1e18;  // × (1 - RF)
```

---

## 📊 BẢNG SO SÁNH:

| Input | Expected | Current Code | Correct? |
|-------|----------|--------------|----------|
| RF = 0% (0 bps) | oneMinusRF = 1e18 | oneMinusRF = 1e18 | ✅ OK |
| RF = 10% (1000 bps) | oneMinusRF = 9e17 | oneMinusRF = 9e21 | ❌ WRONG |
| RF = 50% (5000 bps) | oneMinusRF = 5e17 | oneMinusRF = 5e21 | ❌ WRONG |
| RF = 100% (10000 bps) | oneMinusRF = 0 | oneMinusRF = 0 | ✅ OK |

**→ Lỗi khi reserveFactor > 0 và < 100%!**

---

## 🎯 KẾT LUẬN:

### ✅ CÔNG THỨC ĐÚNG:
- ✓ Rsupply = U × Rborrow × (1 - RF)
- ✓ Concept đúng
- ✓ Logic đúng

### ❌ IMPLEMENTATION SAI:
- ✗ Conversion từ bps → WAD sai
- ✗ × 1e14 thay vì × 1e18 / 10000
- ✗ Supply rate bị tính SAI

### 🔴 CẦN SỬA NGAY:
- Sửa dòng 63 trong InterestRateModel.sol
- Verify với test case cụ thể

---

**File fix:** `FIX_SUPPLY_RATE_FORMULA.md`




