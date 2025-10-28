# 🛠️ SỬA CÔNG THỨC SUPPLY RATE

## ❌ LỖI TRONG CODE:

**File:** `contracts/core/InterestRateModel.sol` (Line 63)

```solidity
// Line 63 (CŨ - SAI):
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14);
```

**Vấn đề:**
- Nếu reserveFactorBps = 1000 (10%)
- oneMinusRF = 9000 × 1e14 = 9e21
- Nhưng đúng phải là: 0.9 × 1e18 = 9e17
- → Sai 10,000 lần!

---

## ✅ CÁCH SỬA:

### Sửa dòng 63 trong InterestRateModel.sol:

```solidity
// OLD (SAI):
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14);

// NEW (ĐÚNG):
uint256 oneMinusRF = ((uint256(10000 - reserveFactorBps) * 1e14) / 10000);
// OR:
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e18) / 10000;
```

### Giải thích:

```solidity
// reserveFactorBps = 1000 (10%)

// Bước 1: 1 - RF in bps
// (10000 - 1000) = 9000 bps (meaning 90%)

// Bước 2: Convert to WAD
// 9000 bps → decimal: 9000 / 10000 = 0.9
// 0.9 → WAD: 0.9 × 1e18 = 9e17

// ✅ CORRECT:
oneMinusRF = (9000 × 1e18) / 10000 = 9e17
```

---

## 🧪 TEST CASE:

### Input:
```javascript
reserveFactorBps = 1000  // 10%
borrowRate = 0.05         // 5% APR
utilization = 0.8         // 80%
```

### Expected:
```
Rsupply = U × Rborrow × (1 - RF)
        = 0.8 × 0.05 × 0.9
        = 0.036
        = 3.6% APR
```

### With current (wrong) code:
```solidity
oneMinusRF = (10000 - 1000) × 1e14
           = 9000 × 1e14
           = 9e21

supply = borrow × U / 1e18 × oneMinusRF / 1e18
       = 0.05 × 0.8 × 9e21 / 1e36
       = 0.05 × 0.8 × 9000
       = 360  // ❌ WRONG! Should be 0.036
```

### With fixed code:
```solidity
oneMinusRF = (9000 × 1e18) / 10000
           = 9e17

supply = borrow × U / 1e18 × oneMinusRF / 1e18
       = 0.05 × 0.8 × 9e17 / 1e36
       = 0.05 × 0.8 × 0.9
       = 0.036  // ✅ CORRECT!
```

---

## 📝 CODE FIX:

### File: `contracts/core/InterestRateModel.sol`

```solidity
// Line 61-65

// Step 1: Calculate 1 - RF in bps
uint256 bpsOneMinusRF = uint256(10000 - reserveFactorBps);

// Step 2: Convert bps to WAD
uint256 oneMinusRF = (bpsOneMinusRF * 1e18) / 10000;

// Step 3: Calculate supply rate
uint256 supply = (borrow * U) / 1e18;
supply = (supply * oneMinusRF) / 1e18;
```

**HOẶC ngắn gọn:**

```solidity
// Line 63
uint256 oneMinusRF = ((uint256(10000 - reserveFactorBps) * 1e14) / 10000);
// OR:
uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e18) / 10000;
```

---

## 🎯 IMPACT:

### Nếu reserveFactor = 10%:

| Metric | Expected | Current (Wrong) | Impact |
|--------|----------|-----------------|--------|
| Supply Rate | 3.6% | 360% | ❌ Sai 100 lần |
| User Interest | Normal | 100× too high | 🔴 CRITICAL |
| Protocol Revenue | 0.4% | 40% | ❌ SAI |

---

**CẦN SỬA NGAY!**



