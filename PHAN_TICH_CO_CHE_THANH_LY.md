# Phân Tích Sâu Cơ Chế Thanh Lý (Liquidation Mechanism)

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Các Khái Niệm Cơ Bản](#các-khái-niệm-cơ-bản)
3. [Điều Kiện Thanh Lý](#điều-kiện-thanh-lý)
4. [Công Thức Tính Toán](#công-thức-tính-toán)
5. [Quy Trình Thanh Lý Chi Tiết](#quy-trình-thanh-lý-chi-tiết)
6. [Các Tham Số Quan Trọng](#các-tham-số-quan-trọng)
7. [Ví Dụ Cụ Thể](#ví-dụ-cụ-thể)
8. [Bảo Mật và Rủi Ro](#bảo-mật-và-rủi-ro)
9. [Code Analysis](#code-analysis)

---

## 🎯 Tổng Quan

**Liquidation (Thanh lý)** là cơ chế bảo vệ protocol khi người dùng không còn đủ tài sản thế chấp để đảm bảo khoản vay của họ. Khi Health Factor (HF) < 1.0, bất kỳ ai cũng có thể thanh lý vị thế của người dùng để nhận phần thưởng.

### Mục Đích

1. **Bảo vệ Protocol**: Đảm bảo protocol luôn có đủ tài sản thế chấp
2. **Khuyến khích Thanh Lý**: Liquidator nhận bonus khi thanh lý
3. **Giảm Rủi Ro**: Ngăn chặn vị thế không đảm bảo tích lũy

---

## 📚 Các Khái Niệm Cơ Bản

### 1. Health Factor (HF)

**Công thức:**
```
HF = (Tổng giá trị Collateral × LTV) / Tổng giá trị Debt
```

**Ý nghĩa:**
- `HF >= 1.0`: Vị thế an toàn
- `HF < 1.0`: Vị thế có thể bị thanh lý
- `HF = 0`: Vị thế hoàn toàn không đảm bảo

**Trong code:**
```solidity
// contracts/core/LendingPool.sol:382
healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
```

### 2. Collateral Value (Giá trị thế chấp)

**Công thức:**
```
Collateral Value = Σ(Supply × Price × LTV)
```

**Lưu ý:**
- Chỉ tính các asset được enable làm collateral (`useAsCollateral = true`)
- Áp dụng LTV (Loan-to-Value) để tính giá trị thế chấp

**Trong code:**
```solidity
// contracts/core/LendingPool.sol:364
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
```

### 3. Debt Value (Giá trị nợ)

**Công thức:**
```
Debt Value = Σ(Debt × Price)
```

**Lưu ý:**
- Debt bao gồm cả lãi suất tích lũy (accrued interest)
- Tính theo giá thị trường hiện tại

**Trong code:**
```solidity
// contracts/core/LendingPool.sol:373
uint256 debtValueUSD = (debt * price) / 1e18;
```

### 4. LTV (Loan-to-Value)

**Định nghĩa:**
- Tỷ lệ cho phép vay dựa trên giá trị thế chấp
- Ví dụ: LTV = 75% → Vay tối đa 75% giá trị thế chấp

**Ví dụ:**
- Collateral: $1000 USDC
- LTV: 75%
- Có thể vay tối đa: $750

### 5. Liquidation Threshold

**Định nghĩa:**
- Ngưỡng thanh lý (thường > LTV)
- Khi HF < 1.0, vị thế có thể bị thanh lý

**Quan hệ:**
```
LTV < Liquidation Threshold
```

**Ví dụ:**
- LTV: 75%
- Liquidation Threshold: 80%
- Buffer: 5% (khoảng an toàn)

### 6. Liquidation Bonus

**Định nghĩa:**
- Phần thưởng cho liquidator khi thanh lý
- Thường từ 5-20%

**Công thức:**
```
Seize Amount = Repay Amount × (1 + Bonus)
```

**Ví dụ:**
- Repay: $100
- Bonus: 10%
- Seize: $110

### 7. Close Factor

**Định nghĩa:**
- Tỷ lệ tối đa có thể thanh lý trong 1 lần
- Thường 50% để tránh thanh lý quá mức

**Công thức:**
```
Max Repay = Total Debt × Close Factor
```

**Ví dụ:**
- Total Debt: $1000
- Close Factor: 50%
- Max Repay: $500

---

## ⚠️ Điều Kiện Thanh Lý

### Điều Kiện Bắt Buộc

1. **Health Factor < 1.0**
   ```solidity
   // contracts/core/LendingPool.sol:1082
   require(hf < 1e18, "HF>=1");
   ```

2. **User có debt > 0**
   ```solidity
   // contracts/core/LendingPool.sol:1086
   require(debtNow > 0, "no debt");
   ```

3. **Asset không bị pause**
   ```solidity
   // contracts/core/LendingPool.sol:1069-1070
   require(!pausedAssets[debtAsset], "Debt asset is paused");
   require(!pausedAssets[collateralAsset], "Collateral asset is paused");
   ```

4. **User có đủ collateral**
   ```solidity
   // contracts/core/LendingPool.sol:1114
   require(userCollNow >= seizeColl1e18, "insufficient collateral");
   ```

### Điều Kiện Tự Động

- **Accrue interest**: Tự động tính lãi trước khi kiểm tra
- **Price update**: Sử dụng giá mới nhất từ oracle
- **Index update**: Cập nhật liquidity index và borrow index

---

## 🧮 Công Thức Tính Toán

### 1. Tính Health Factor

```solidity
// Step 1: Tính tổng collateral value (weighted by LTV)
totalCollateral = Σ(supply × price × ltvBps / 10000)
  where: supply > 0 AND useAsCollateral = true

// Step 2: Tính tổng debt value
totalDebt = Σ(debt × price)
  where: debt > 0

// Step 3: Tính Health Factor
if (totalDebt == 0) {
    HF = ∞ (type(uint256).max)
} else {
    HF = (totalCollateral × 1e18) / totalDebt
}
```

**Code:**
```solidity
// contracts/core/LendingPool.sol:339-384
function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    // Loop through all assets
    for (uint256 i = 0; i < _allAssets.length; i++) {
        // Calculate collateral (weighted by LTV)
        if (supply > 0 && u.useAsCollateral) {
            uint256 supplyValueUSD = (supply * price) / 1e18;
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            collateralValue1e18 += weightedCollateral;
        }
        
        // Calculate debt
        if (debt > 0) {
            uint256 debtValueUSD = (debt * price) / 1e18;
            debtValue1e18 += debtValueUSD;
        }
    }
    
    // Calculate HF
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
    }
}
```

### 2. Tính Current Debt

```solidity
// Debt hiện tại = Principal × (BorrowIndex / UserBorrowIndex)
currentDebt = principal × (currentBorrowIndex / userBorrowIndex)
```

**Code:**
```solidity
// contracts/core/LendingPool.sol:319-324
function _currentDebt(address user, address asset) internal view returns (uint256 debtNow1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (u.borrow.principal == 0) return 0;
    return LendingMath.valueByIndex(u.borrow.principal, r.variableBorrowIndex, u.borrow.index);
}
```

### 3. Tính Current Supply

```solidity
// Supply hiện tại = Principal × (LiquidityIndex / UserSupplyIndex)
currentSupply = principal × (currentLiquidityIndex / userSupplyIndex)
```

**Code:**
```solidity
// contracts/core/LendingPool.sol:312-317
function _currentSupply(address user, address asset) internal view returns (uint256 supplyNow1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (u.supply.principal == 0) return 0;
    return LendingMath.valueByIndex(u.supply.principal, r.liquidityIndex, u.supply.index);
}
```

### 4. Tính Liquidation Amounts

```solidity
// Step 1: Tính max repay (theo close factor)
maxRepay = totalDebt × closeFactorBps / 10000
actualRepay = min(repayRequested, maxRepay)

// Step 2: Quy đổi sang USD
repayUsd = actualRepay × priceDebt / 1e18

// Step 3: Tính seize amount (với bonus)
seizeUsd = repayUsd × (10000 + liqBonusBps) / 10000

// Step 4: Quy đổi sang collateral tokens
seizeColl = seizeUsd × 1e18 / priceColl
```

**Code:**
```solidity
// contracts/core/LendingPool.sol:1088-1110
// 3) closeFactor clamp
uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000;
uint256 repayReq1e18 = _to1e18(repayRequested, d.decimals);
uint256 repay1e18 = repayReq1e18 > maxRepay ? maxRepay : repayReq1e18;

// 5) USD quy đổi & tính lượng collateral bị tịch thu
uint256 priceDebt = oracle.getAssetPrice1e18(debtAsset);
uint256 priceColl = oracle.getAssetPrice1e18(collateralAsset);
uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;

uint256 bonusBps = c.liqBonusBps;
uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;

uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;
```

---

## 🔄 Quy Trình Thanh Lý Chi Tiết

### Bước 0: Accrue Interest

```solidity
// contracts/core/LendingPool.sol:1071-1075
_requireInited(debtAsset);
_requireInited(collateralAsset);
_accrue(debtAsset);
_accrue(collateralAsset);
```

**Mục đích:**
- Cập nhật lãi suất tích lũy
- Cập nhật liquidity index và borrow index
- Đảm bảo số liệu mới nhất

### Bước 1: Kiểm Tra Health Factor

```solidity
// contracts/core/LendingPool.sol:1081-1082
(, , uint256 hf) = _getAccountData(user);
require(hf < 1e18, "HF>=1");
```

**Kiểm tra:**
- HF phải < 1.0 (1e18 trong 1e18 format)
- Nếu HF >= 1.0, revert

### Bước 2: Lấy Debt Hiện Tại

```solidity
// contracts/core/LendingPool.sol:1085-1086
uint256 debtNow = _currentDebt(user, debtAsset);
require(debtNow > 0, "no debt");
```

**Tính toán:**
- Debt bao gồm cả lãi suất tích lũy
- Sử dụng `_currentDebt()` để tính chính xác

### Bước 3: Áp Dụng Close Factor

```solidity
// contracts/core/LendingPool.sol:1088-1092
uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000;
uint256 repayReq1e18 = _to1e18(repayRequested, d.decimals);
uint256 repay1e18 = repayReq1e18 > maxRepay ? maxRepay : repayReq1e18;
require(repay1e18 > 0, "zero repay");
```

**Logic:**
- Tính max repay theo close factor
- Clamp repay amount nếu vượt quá
- Đảm bảo repay > 0

### Bước 4: Nhận Debt Asset Từ Liquidator

```solidity
// contracts/core/LendingPool.sol:1094-1099
uint256 before = IERC20(debtAsset).balanceOf(address(this));
IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), _from1e18(repay1e18, d.decimals));
uint256 received = IERC20(debtAsset).balanceOf(address(this)) - before;
uint256 received1e18 = _to1e18(received, d.decimals);
if (received1e18 < repay1e18) { repay1e18 = received1e18; }
```

**Lưu ý:**
- FoT-aware (Fee-on-Transfer tokens)
- Tính toán dựa trên số token thực nhận
- Clamp lại nếu nhận ít hơn dự kiến

### Bước 5: Tính Collateral Seize Amount

```solidity
// contracts/core/LendingPool.sol:1101-1110
uint256 priceDebt = oracle.getAssetPrice1e18(debtAsset);
uint256 priceColl = oracle.getAssetPrice1e18(collateralAsset);
uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;

uint256 bonusBps = c.liqBonusBps;
uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;

uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;
```

**Tính toán:**
1. Quy đổi repay amount sang USD
2. Áp dụng liquidation bonus
3. Quy đổi sang collateral tokens

### Bước 6: Kiểm Tra Collateral Đủ

```solidity
// contracts/core/LendingPool.sol:1112-1114
uint256 userCollNow = _currentSupply(user, collateralAsset);
require(userCollNow >= seizeColl1e18, "insufficient collateral");
```

**Kiểm tra:**
- User phải có đủ collateral
- Nếu không đủ, revert

### Bước 7: Cập Nhật Vị Thế User

```solidity
// contracts/core/LendingPool.sol:1116-1128
// debt giảm
uint256 dNew = debtNow - repay1e18;
ud.borrow.principal = uint128(dNew);
ud.borrow.index = d.variableBorrowIndex;

// collateral giảm
uint256 cNew = userCollNow - seizeColl1e18;
uc.supply.principal = uint128(cNew);
uc.supply.index = c.liquidityIndex;
```

**Cập nhật:**
- Giảm debt principal
- Cập nhật borrow index
- Giảm supply principal
- Cập nhật supply index

### Bước 8: Cập Nhật Sổ Cái (Ledger)

```solidity
// contracts/core/LendingPool.sol:1130-1141
// Debt reserve
d.totalDebtPrincipal = uint128(uint256(d.totalDebtPrincipal) - repay1e18);
d.reserveCash = uint128(uint256(d.reserveCash) + repay1e18);

// Collateral reserve
require(c.reserveCash >= seizeColl1e18, "pool coll cash low");
c.reserveCash = uint128(uint256(c.reserveCash) - seizeColl1e18);

// Transfer collateral to liquidator
IERC20(collateralAsset).safeTransfer(
    msg.sender,
    _from1e18(seizeColl1e18, c.decimals)
);
```

**Cập nhật:**
- Giảm total debt principal
- Tăng reserve cash (debt asset)
- Giảm reserve cash (collateral asset)
- Transfer collateral cho liquidator

### Bước 9: Emit Event

```solidity
// contracts/core/LendingPool.sol:1143-1145
emit Liquidated(
    msg.sender, user, debtAsset, collateralAsset, repay1e18, seizeColl1e18
);
```

**Event:**
- Liquidator address
- User address
- Debt asset
- Collateral asset
- Repay amount
- Seize amount

---

## ⚙️ Các Tham Số Quan Trọng

### 1. LTV (Loan-to-Value)

**Định nghĩa:**
- Tỷ lệ cho phép vay
- Đơn vị: Basis points (bps), 10000 = 100%

**Ví dụ:**
- LTV = 7500 bps = 75%
- Collateral $1000 → Có thể vay $750

**Code:**
```solidity
// contracts/core/LendingPool.sol:814
r.ltvBps = ltvBps;
```

### 2. Liquidation Threshold

**Định nghĩa:**
- Ngưỡng thanh lý
- Phải > LTV

**Ví dụ:**
- LTV: 75%
- Threshold: 80%
- Buffer: 5%

**Code:**
```solidity
// contracts/core/LendingPool.sol:815
r.liqThresholdBps = liqThresholdBps;
```

**Validation:**
```solidity
// contracts/core/LendingPool.sol:868
require(newLiqThresholdBps > r.ltvBps, "Threshold must be > LTV");
```

### 3. Liquidation Bonus

**Định nghĩa:**
- Phần thưởng cho liquidator
- Thường 5-20%

**Ví dụ:**
- Bonus: 1000 bps = 10%
- Repay $100 → Seize $110

**Code:**
```solidity
// contracts/core/LendingPool.sol:881
r.liqBonusBps = newLiqBonusBps;
```

**Validation:**
```solidity
// contracts/core/LendingPool.sol:878
require(newLiqBonusBps <= 2000, "Liquidation bonus cannot exceed 20%");
```

### 4. Close Factor

**Định nghĩa:**
- Tỷ lệ tối đa thanh lý trong 1 lần
- Thường 50%

**Ví dụ:**
- Close Factor: 5000 bps = 50%
- Total Debt: $1000
- Max Repay: $500

**Code:**
```solidity
// contracts/core/LendingPool.sol:817
r.closeFactorBps = closeFactorBps;
```

**Usage:**
```solidity
// contracts/core/LendingPool.sol:1089
uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000;
```

---

## 💡 Ví Dụ Cụ Thể

### Scenario 1: Liquidation Cơ Bản

**Tình huống:**
- User có:
  - Collateral: 1000 USDC (LTV: 75%)
  - Debt: 800 USDT
  - HF ban đầu: 0.9375 (< 1.0)

**Tham số:**
- Close Factor: 50%
- Liquidation Bonus: 10%

**Quy trình:**

1. **Kiểm tra HF:**
   ```
   Collateral Value = 1000 × 0.75 = $750
   Debt Value = $800
   HF = 750 / 800 = 0.9375 < 1.0 ✅
   ```

2. **Tính max repay:**
   ```
   Max Repay = 800 × 0.5 = $400
   ```

3. **Liquidator trả $400 USDT**

4. **Tính seize amount:**
   ```
   Repay USD = $400
   Seize USD = 400 × 1.1 = $440
   Seize USDC = 440 / 1.0 = 440 USDC
   ```

5. **Kết quả:**
   - User còn: 560 USDC, 400 USDT debt
   - Liquidator nhận: 440 USDC
   - HF mới: (560 × 0.75) / 400 = 1.05 > 1.0 ✅

### Scenario 2: Cross-Asset Liquidation

**Tình huống:**
- User có:
  - Collateral: 1 ETH (giá $2000, LTV: 80%)
  - Debt: 1500 USDT
  - HF: 0.89 < 1.0

**Tham số:**
- Close Factor: 50%
- Liquidation Bonus: 8%

**Quy trình:**

1. **Kiểm tra HF:**
   ```
   Collateral Value = 1 × 2000 × 0.8 = $1600
   Debt Value = $1500
   HF = 1600 / 1500 = 1.067 > 1.0 ❌
   ```
   **Wait...** Giá ETH giảm xuống $1800:
   ```
   Collateral Value = 1 × 1800 × 0.8 = $1440
   HF = 1440 / 1500 = 0.96 < 1.0 ✅
   ```

2. **Tính max repay:**
   ```
   Max Repay = 1500 × 0.5 = $750 USDT
   ```

3. **Liquidator trả $750 USDT**

4. **Tính seize amount:**
   ```
   Repay USD = $750
   Seize USD = 750 × 1.08 = $810
   Seize ETH = 810 / 1800 = 0.45 ETH
   ```

5. **Kết quả:**
   - User còn: 0.55 ETH, 750 USDT debt
   - Liquidator nhận: 0.45 ETH
   - HF mới: (0.55 × 1800 × 0.8) / 750 = 1.056 > 1.0 ✅

### Scenario 3: Partial Liquidation

**Tình huống:**
- User có:
  - Collateral: 2000 USDC (LTV: 75%)
  - Debt: 1600 USDT
  - HF: 0.9375 < 1.0

**Tham số:**
- Close Factor: 50%
- Liquidation Bonus: 5%

**Quy trình:**

1. **Lần 1:**
   ```
   Max Repay = 1600 × 0.5 = $800
   Seize = 800 × 1.05 = $840
   ```
   - User còn: 1160 USDC, 800 USDT debt
   - HF = (1160 × 0.75) / 800 = 1.0875 > 1.0 ✅

2. **Lần 2 (nếu giá giảm tiếp):**
   - Nếu HF < 1.0 lại, có thể thanh lý tiếp
   - Max Repay = 800 × 0.5 = $400

---

## 🔒 Bảo Mật và Rủi Ro

### 1. Reentrancy Protection

```solidity
// contracts/core/LendingPool.sol:1063
function liquidationCall(...) external nonReentrant whenNotPaused {
```

**Bảo vệ:**
- `nonReentrant`: Ngăn chặn reentrancy attack
- `whenNotPaused`: Kiểm tra contract không bị pause

### 2. Price Oracle Security

```solidity
// contracts/core/LendingPool.sol:1102-1103
uint256 priceDebt = oracle.getAssetPrice1e18(debtAsset);
uint256 priceColl = oracle.getAssetPrice1e18(collateralAsset);
```

**Rủi ro:**
- Oracle manipulation
- Stale price

**Giải pháp:**
- Sử dụng Chainlink oracle (decentralized)
- Price staleness check (nếu có)

### 3. FoT Token Protection

```solidity
// contracts/core/LendingPool.sol:1094-1099
uint256 before = IERC20(debtAsset).balanceOf(address(this));
IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), ...);
uint256 received = IERC20(debtAsset).balanceOf(address(this)) - before;
```

**Bảo vệ:**
- Tính toán dựa trên số token thực nhận
- Clamp lại nếu nhận ít hơn

### 4. Insufficient Collateral Check

```solidity
// contracts/core/LendingPool.sol:1113-1114
uint256 userCollNow = _currentSupply(user, collateralAsset);
require(userCollNow >= seizeColl1e18, "insufficient collateral");
```

**Bảo vệ:**
- Đảm bảo user có đủ collateral
- Revert nếu không đủ

### 5. Pool Cash Check

```solidity
// contracts/core/LendingPool.sol:1135
require(c.reserveCash >= seizeColl1e18, "pool coll cash low");
```

**Bảo vệ:**
- Đảm bảo pool có đủ cash
- Tránh underflow

### 6. Close Factor Limit

```solidity
// contracts/core/LendingPool.sol:1089
uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000;
```

**Bảo vệ:**
- Giới hạn thanh lý trong 1 lần
- Tránh thanh lý quá mức

---

## 📊 Code Analysis

### Function Signature

```solidity
function liquidationCall(
    address debtAsset,        // Asset cần trả (ví dụ: USDT)
    address collateralAsset,  // Asset thế chấp (ví dụ: USDC)
    address user,             // User bị thanh lý
    uint256 repayRequested    // Số tiền muốn trả (native decimals)
) external nonReentrant whenNotPaused
```

### Key Functions

#### 1. `_getAccountData()`

**Mục đích:** Tính toán collateral, debt, và health factor

**Code:**
```solidity
// contracts/core/LendingPool.sol:339-384
function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
)
```

**Logic:**
- Loop qua tất cả assets
- Tính collateral (weighted by LTV)
- Tính debt
- Tính HF

#### 2. `_currentDebt()`

**Mục đích:** Tính debt hiện tại (bao gồm lãi)

**Code:**
```solidity
// contracts/core/LendingPool.sol:319-324
function _currentDebt(address user, address asset) internal view returns (uint256 debtNow1e18)
```

**Logic:**
- Sử dụng `LendingMath.valueByIndex()`
- Tính: `principal × (currentIndex / userIndex)`

#### 3. `_currentSupply()`

**Mục đích:** Tính supply hiện tại (bao gồm lãi)

**Code:**
```solidity
// contracts/core/LendingPool.sol:312-317
function _currentSupply(address user, address asset) internal view returns (uint256 supplyNow1e18)
```

**Logic:**
- Sử dụng `LendingMath.valueByIndex()`
- Tính: `principal × (currentIndex / userIndex)`

#### 4. `getLiquidationRisk()`

**Mục đích:** Tính rủi ro thanh lý cho 1 asset cụ thể

**Code:**
```solidity
// contracts/core/LendingPool.sol:1382-1408
function getLiquidationRisk(address user, address asset) external view returns (uint256)
```

**Logic:**
- Tính HF nếu remove asset này
- Return risk in bps (0-10000)

### Events

```solidity
// contracts/core/LendingPool.sol:1053-1060
event Liquidated(
    address indexed liquidator,
    address indexed user,
    address indexed debtAsset,
    address collateralAsset,
    uint256 repayAmount1e18,
    uint256 collateralSeized1e18
);
```

---

## 🎯 Tóm Tắt

### Điều Kiện Thanh Lý

1. ✅ Health Factor < 1.0
2. ✅ User có debt > 0
3. ✅ Asset không bị pause
4. ✅ User có đủ collateral

### Quy Trình

1. Accrue interest
2. Kiểm tra HF
3. Tính max repay (close factor)
4. Nhận debt asset từ liquidator
5. Tính collateral seize (với bonus)
6. Kiểm tra đủ collateral
7. Cập nhật vị thế user
8. Cập nhật sổ cái
9. Transfer collateral cho liquidator
10. Emit event

### Công Thức

```
HF = (Collateral × LTV) / Debt
Max Repay = Debt × Close Factor
Seize = Repay × (1 + Bonus)
```

### Bảo Mật

- ✅ Reentrancy protection
- ✅ FoT token protection
- ✅ Insufficient collateral check
- ✅ Pool cash check
- ✅ Close factor limit

---

**Kết luận:** Cơ chế thanh lý được thiết kế an toàn, bảo vệ protocol và khuyến khích liquidator tham gia. Tất cả các tính toán đều được thực hiện on-chain, đảm bảo tính minh bạch và công bằng. 🎯


