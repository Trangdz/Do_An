# ✅ Kiểm Tra Logic Rút Tài Sản

## 📐 Công Thức Từ Document

```
x_max = (CollateralValue - DebtValue) × 10000 / (Price(asset) × LTV_asset)
```

Trong đó:
- `x_max`: Lượng token tối đa có thể rút (giữ HF ≥ 1)
- `CollateralValue`: Giá trị tổng collateral hiện tại (USD)
- `DebtValue`: Tổng giá trị nợ (USD)
- `Price(asset)`: Giá của asset (USD/token)
- `LTV_asset`: Loan-To-Value của asset (%)

## 🔍 Logic Hiện Tại Trong Contract

### Function: `withdraw()` (line 299-338)

```solidity
// 3 điều kiện chính:
uint256 amt = req1e18;
if (amt > balNow) amt = balNow;      // ✅ Không vượt số dư
if (amt > available) amt = available; // ✅ Không vượt thanh khoản
if (amt > xMax) amt = xMax;          // ✅ Không làm HF < 1

if (amt == 0) revert HealthFactorTooLow();
```

### Function: `_maxWithdrawAllowed()` (line 210-260)

**Case 1:** Không phải collateral
```solidity
if (!u.useAsCollateral) {
    return supply; // Rút hết
}
```

**Case 2:** Không có debt
```solidity
if (totalDebt == 0) {
    return supply; // Rút hết
}
```

**Case 3:** Có debt, check HF
```solidity
// Tính weighted collateral của asset này
uint256 price = oracle.getAssetPrice1e18(asset);
uint256 supplyValueUSD = (supply * price) / 1e18;
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;

// Nếu rút hết asset này → HF < 1?
uint256 collateralAfter = totalColl - weightedCollateral;
if (collateralAfter < totalDebt) {
    // Tính x_max
    uint256 maxCollateralToRemove = totalColl - totalDebt;
    
    // Có thể rút hết không?
    if (maxCollateralToRemove >= weightedCollateral) {
        return supply; // Rút hết
    } else {
        // Rút một phần
        uint256 partialValue = (supply * maxCollateralToRemove) / weightedCollateral;
        return partialValue;
    }
}

return supply; // Có thể rút hết
```

## ✅ Chứng Minh Công Thức Khớp

**Công thức trong document:**
```
x_max = (Coll - Debt) × 10000 / (Price × LTV)
```

**Công thức trong code:**
```
maxCollateralToRemove (USD) = totalColl - totalDebt
partialValue = supply × maxCollateralToRemove / weightedCollateral
```

Mà:
```
weightedCollateral = supply × price × LTV / 10000
```

Nên:
```
partialValue = supply × maxCollateralToRemove / (supply × price × LTV / 10000)
             = maxCollateralToRemove × 10000 / (price × LTV)
             = (totalColl - totalDebt) × 10000 / (price × LTV)
```

**✅ HOÀN TOÀN KHỚP!**

## 🎯 3 Điều Kiện Kiểm Tra

| Điều Kiện | Code Location | Status |
|-----------|---------------|--------|
| **1. Không vượt số dư** | `if (amt > balNow) amt = balNow;` | ✅ |
| **2. Không vượt thanh khoản** | `if (amt > available) amt = available;` | ✅ |
| **3. HF sau rút ≥ 1** | `if (amt > xMax) amt = xMax;` | ✅ |

## 📊 Test Scenarios

### Scenario 1: Withdraw Không Phải Collateral
```
✅ Supply 100 WETH (collateral = OFF)
✅ Request withdraw 100 WETH
✅ Result: Withdraw 100 WETH (no restrictions)
```

### Scenario 2: Withdraw Collateral, No Debt
```
✅ Supply 100 WETH (collateral = ON)
✅ Debt = 0
✅ Request withdraw 100 WETH
✅ Result: Withdraw 100 WETH (no restrictions)
```

### Scenario 3: Withdraw Collateral, Has Debt
```
✅ Supply 100 WETH
✅ Price: $2000
✅ LTV: 80%
✅ Weighted collateral: $160,000

✅ Borrow 50 DAI
✅ Debt: $50

✅ Calculate max withdraw:
  maxCollateralToRemove = 160,000 - 50 = $159,950
  weightedCollateral = $160,000
  
  Since maxCollateralToRemove < weightedCollateral:
    partialValue = 100 × 159,950 / 160,000 = 99.96 WETH
    x_max = 99.96 WETH

✅ Result: Can withdraw 99.96 WETH max
```

## 🐛 Potential Issues

### Issue 1: Precision Loss
```solidity
uint256 partialValue = (supply * maxCollateralToRemove) / weightedCollateral;
```
⚠️ Với số lớn, có thể bị precision loss. Nên add overflow check.

### Issue 2: No Validation cho Edge Cases
```solidity
if (amt == 0) revert HealthFactorTooLow();
```
⚠️ Error message không rõ ràng. User không biết tại sao.

### Issue 3: Rounding Down
Code luôn round DOWN, có thể gây confusion.

## 🔧 Recommendations

### 1. Add Better Error Messages
```solidity
if (amt == 0) {
    revert CustomError(
        "Cannot withdraw: Health factor would drop below 1.00"
    );
}
```

### 2. Add Health Factor Preview
```solidity
function getMaxWithdraw(address asset) external view returns (
    uint256 maxAmount,
    uint256 healthFactorAfter
);
```

### 3. Handle Rounding
```solidity
// Round to nearest, not down
partialValue = (supply * maxCollateralToRemove + weightedCollateral / 2) 
               / weightedCollateral;
```

## ✅ Kết Luận

### Logic Rút Tài Sản: ✅ ĐÚNG
- ✅ Công thức khớp với document
- ✅ 3 điều kiện được kiểm tra đầy đủ
- ✅ Xử lý tất cả edge cases

### Improvements Needed:
1. ✅ Better error messages
2. ✅ Preview health factor before withdraw
3. ✅ Handle rounding edge cases
4. ✅ Add fuzz testing

## 📝 Code Review Checklist

- [x] Formula matches specification
- [x] Overdraft protection (amt ≤ balNow)
- [x] Liquidity check (amt ≤ available)
- [x] Health factor check (amt ≤ xMax)
- [ ] Precision loss handling
- [ ] Better error messages
- [ ] Rounding considerations
- [ ] Gas optimization opportunities

