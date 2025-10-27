# 📚 COLLATERAL LOGIC - GIẢI THÍCH

## 🎯 NHỮNG GÌ BẠN MÔ TẢ:

### 1. **Collateral = OFF (🔴):**
- Assets chỉ nhận lãi (supply interest)
- KHÔNG dùng để vay
- Safe và đơn giản

### 2. **Collateral = ON (🟢):**
- Assets vẫn nhận lãi
- ĐƯỢC dùng làm tài sản thế chấp
- Có thể vay token khác dựa trên giá trị này

---

## 🔧 3 BƯỚC KHI BẬT COLLATERAL:

### Step 1: Đánh dấu trong UserConfig

```solidity
userConfig[msg.sender].isCollateral[USDC] = true;
```

**Trong project của bạn:**
```solidity
// File: LendingPool.sol - Line 486
u.useAsCollateral = true;
```

### Step 2: Tính lại Total Collateral Value

```
CollateralValue = Σ(balance_i × price_i × liquidationThreshold_i)
```

**Trong project của bạn:**
```solidity
// File: LendingPool.sol - Lines 180-189
if (supply > 0 && u.useAsCollateral) {
    uint256 supplyValueUSD = (supply * price) / 1e18;
    uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
    collateralValue1e18 += weightedCollateral;
}
```

### Step 3: Update Health Factor

```
HF = CollateralValue / BorrowValue
```

**Trong project của bạn:**
```solidity
// File: LendingPool.sol - Lines 201-206
if (debtValue1e18 == 0) {
    healthFactor1e18 = type(uint256).max;
} else {
    healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
}
```

---

## ✅ IMPLEMENTATION TRONG PROJECT:

### 1. **Mark Collateral Status:**
```solidity
// Lines 484-486: Enable
u.useAsCollateral = true;

// Lines 490-506: Disable with HF check
require(collateralAfter >= debt, "Health factor would be < 1");
u.useAsCollateral = false;
```

### 2. **Calculate Total Collateral:**
```solidity
// Lines 182-189: Loop through all assets
if (supply > 0 && u.useAsCollateral) {
    supplyValueUSD = (supply * price) / 1e18;
    weightedCollateral = (supplyValueUSD * ltvBps) / 10000;
    collateralValue1e18 += weightedCollateral;
}
```

### 3. **Update Health Factor:**
```solidity
// Lines 201-206: Calculate HF
healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
```

---

## 🎯 DIFFERENCES:

### Project của bạn:
- ✅ Dùng `ltvBps` (Loan-to-Value)
- ✅ Không dùng `liquidationThreshold`
- ✅ Tính chính xác theo USD

### Aave:
- ✅ Dùng `liquidationThreshold`
- ✅ Có thêm layers

**Cả 2 đều đúng, chỉ khác approach!**

---

## 🔍 TRONG CODE:

### Collateral ON:
```solidity
// Set flag
u.useAsCollateral = true;

// Used in calculation
if (u.useAsCollateral && supply > 0) {
    collateralValue += supply * price * ltvBps / 10000;
}

// Check in HF
HF = totalCollateral / totalDebt
```

### Collateral OFF:
```solidity
// Set flag
u.useAsCollateral = false;

// NOT included in calculation
// (excluded from loop by condition)
if (u.useAsCollateral && supply > 0) {
    // Skip this asset
}
```

---

## ✅ PROJECT ĐÃ IMPLEMENT ĐÚNG!

**Logic hoàn toàn đúng như bạn mô tả!** 🎉


