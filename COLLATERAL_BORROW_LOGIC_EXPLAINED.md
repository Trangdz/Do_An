# 💰 LOGIC TÍNH TOÁN COLLATERAL VÀ BORROW TRONG LENDHUB V2

## 📊 **VÍ DỤ THỰC TẾ: Thế chấp 100 WETH = 160,000 USD**

### **Tình huống:**
- Người dùng thế chấp: **100 WETH**
- Giá WETH: **$1,600**
- LTV WETH: **75%**

### **Bước 1: Tính Collateral Value**

```solidity
// Smart Contract: contracts/core/LendingPool.sol (Lines 180-189)

// 1. Get supply amount
supply = 100 WETH = 100 * 10^18 wei

// 2. Get price
price = 1600 * 10^18 (price in 1e18, meaning $1600 per WETH)

// 3. Calculate supply value in USD
supplyValueUSD = (supply * price) / 1e18
supplyValueUSD = (100 * 10^18 * 1600 * 10^18) / 10^18
supplyValueUSD = 160,000 * 10^18

// 4. Apply LTV (Loan-to-Value)
weightedCollateral = (supplyValueUSD * ltvBps) / 10000
weightedCollateral = (160,000 * 10^18 * 7500) / 10000
weightedCollateral = 120,000 * 10^18

// Kết quả: Collateral Value = $120,000
```

### **Bước 2: Tính Max Borrow USDC**

#### **❌ LOGIC SAI (trước khi sửa):**
```solidity
// Line 804 (OLD CODE - SAI)
uint256 maxBorrowValue = (availableCollateral * borrowAssetData.ltvBps) / 10000;
// Với WETH collateral = $120,000
// USDC LTV = 75% = 7500 bps
// maxBorrowValue = ($120,000 * 7500) / 10000 = $90,000
// maxBorrowAmount = $90,000 / $1 = 90,000 USDC

// ❌ SAI vì áp dụng LTV 2 lần!
// Collateral đã được apply LTV (75% của 160,000 = 120,000)
// Nhưng lại apply LTV 75% lần nữa → chỉ có thể vay 90,000 USDC
```

#### **✅ LOGIC ĐÚNG (sau khi sửa):**
```solidity
// Line 809 (NEW CODE - ĐÚNG)
uint256 maxBorrowAmount = (availableCollateral * 1e18) / borrowAssetPrice;
// Với WETH collateral = $120,000 (đã apply LTV 75%)
// availableCollateral = $120,000
// USDC price = $1 = 1 * 10^18
// maxBorrowAmount = ($120,000 * 10^18) / (1 * 10^18)
// maxBorrowAmount = 120,000 USDC

// ✅ ĐÚNG! Vì:
// - Collateral đã được apply LTV 75% (160,000 * 75% = 120,000)
// - Không cần apply LTV lần nữa
// - Có thể vay toàn bộ 120,000 USDC (không áp dụng LTV của USDC)
```

### **Bước 3: Kiểm tra Health Factor**

```solidity
// Health Factor = Total Collateral / Total Debt

// Ví dụ:
// - Vay 100,000 USDC
// - Collateral: 120,000 USD
// - HF = 120,000 / 100,000 = 1.2

// Safety Margin:
// - Khuyến nghị: HF > 1.5
// - Risk: 1.0 < HF < 1.5
// - Liquidation: HF < 1.0
```

---

## 🔍 **PHÂN TÍCH CHI TIẾT LOGIC**

### **1. Collateral Calculation (Lines 180-189)**

```solidity
// For each asset:
if (supply > 0 && u.useAsCollateral) {
    uint256 supplyValueUSD = (supply * price) / 1e18;
    uint256 weightedCollateral = (supplyValueUSD * r.ltvBps) / 10000;
    collateralValue1e18 += weightedCollateral;
}
```

**Công thức:**
```
Collateral Value (USD) = Σ(supply_i * price_i * ltv_i / 10000)
```

**Ví dụ Multi-Asset:**
- 100 WETH @ $1,600 → $160,000 * 75% = **$120,000**
- 50,000 DAI @ $1.00 → $50,000 * 80% = **$40,000**
- **Total Collateral = $160,000**

### **2. Debt Calculation (Lines 192-198)**

```solidity
// For each asset:
if (debt > 0) {
    uint256 debtValueUSD = (debt * price) / 1e18;
    debtValue1e18 += debtValueUSD;
}
```

**Công thức:**
```
Debt Value (USD) = Σ(debt_i * price_i)
```

**Lưu ý:** Debt **KHÔNG** được apply LTV (vì là số tiền thực tế nợ)

### **3. Max Borrowable Calculation (Lines 757-811)**

```solidity
// 1. Calculate total collateral (already includes LTV)
totalCollateral = Σ(supply_i * price_i * ltv_i / 10000)

// 2. Calculate total debt (full value)
totalDebt = Σ(debt_i * price_i)

// 3. Calculate available collateral
availableCollateral = totalCollateral - totalDebt

// 4. Convert to token amount (DON'T apply LTV again!)
maxBorrowAmount = (availableCollateral * 1e18) / borrowAssetPrice
```

**Ví dụ:**
```
- Total Collateral: $160,000
- Total Debt: $40,000
- Available: $120,000
- Max Borrow USDC: $120,000 / $1 = 120,000 USDC
```

---

## 🎯 **TẠI SAO KHÔNG ÁP DỤNG LTV 2 LẦN?**

### **❌ SAI - Apply LTV 2 lần:**
```
Collateral: 100 WETH → $160,000
Apply LTV 75%: $120,000
Apply LTV 75% LẦN 2: $90,000 ← SAI!
```

### **✅ ĐÚNG - Apply LTV 1 lần:**
```
Collateral: 100 WETH → $160,000
Apply LTV 75%: $120,000
Convert to token: $120,000 / $1 = 120,000 USDC ← ĐÚNG!
```

**Lý do:**
- **LTV của Collateral Asset** (WETH 75%): Xác định giá trị thế chấp
- **LTV của Borrow Asset** (USDC 80%): KHÔNG cần dùng vì:
  - Chúng ta đang vay **stablecoin** (USDC)
  - Không cần apply LTV cho borrow asset
  - Chỉ cần convert từ USD sang token amount

---

## 🔐 **ĐIỀU KIỆN BORROW**

### **1. Check Collateral Enabled:**
```solidity
// Line 767
if (uData.useAsCollateral && uData.supply.principal > 0)
```

### **2. Check Available Collateral > Debt:**
```solidity
// Line 788
if (totalCollateral <= totalDebt) {
    return 0;
}
```

### **3. Check Asset Borrowable:**
```solidity
// Line 801
if (!borrowAssetData.isBorrowable) return 0;
```

### **4. Check Liquidity:**
```solidity
// Line 381 (trong borrow function)
require(r.reserveCash >= borrowAmount1e18, "Insufficient liquidity");
```

### **5. Check Health Factor:**
```solidity
// Line 363 (trong borrow function)
require(col * 100 > totalNewDebt * 101, "Health factor too low");
// Với safety buffer 1%
```

---

## 📊 **VÍ DỤ ĐẦY ĐỦ**

### **Scenario: Vay 100,000 USDC**

**Input:**
- Thế chấp: 100 WETH ($160,000)
- LTV WETH: 75%
- Collateral Value: $120,000
- Current Debt: $0
- Price USDC: $1

**Calculation:**
```
1. Total Collateral: $120,000
2. Available: $120,000 - $0 = $120,000
3. Max Borrow: $120,000 / $1 = 120,000 USDC
4. Request: 100,000 USDC ✅ ALLOWED
5. New Debt: $100,000
6. Health Factor: $120,000 / $100,000 = 1.2 ✅ SAFE
```

**Result:**
- ✅ Có thể vay 100,000 USDC
- ✅ Health Factor = 1.2 (safe)
- ✅ Collateral đủ để support debt

---

## 🛠️ **NHỮNG GÌ ĐÃ SỬA**

### **1. Auto-Enable Collateral (Line 289-292)**
```solidity
// Auto-enable as collateral if asset has LTV > 0
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;
    emit CollateralEnabled(msg.sender, asset);
}
```

**Benefit:** User không cần manually enable collateral

### **2. Fix Max Borrowable Logic (Line 803-811)**
```solidity
// BEFORE (SAI):
uint256 maxBorrowValue = (availableCollateral * borrowAssetData.ltvBps) / 10000;
uint256 maxBorrowAmount = (maxBorrowValue * 1e18) / borrowAssetPrice;

// AFTER (ĐÚNG):
uint256 maxBorrowAmount = (availableCollateral * 1e18) / borrowAssetPrice;
```

**Benefit:** Tính đúng số USDC có thể vay theo logic nghiệp vụ

---

## ✅ **KẾT LUẬN**

**Logic đúng:**
1. Collateral = Σ(Supply × Price × LTV_collateral / 10000)
2. Debt = Σ(Debt × Price)
3. Max Borrow = Available Collateral / Price_borrow_token
4. **KHÔNG** apply LTV cho borrow asset

**Ví dụ với 100 WETH @ $1,600:**
- Collateral: $120,000 (sau LTV 75%)
- Max Borrow USDC: **120,000 USDC** ✅
- KHÔNG phải 90,000 USDC như logic cũ
