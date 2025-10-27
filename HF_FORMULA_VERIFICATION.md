# ✅ XÁC MINH CÔNG THỨC HEALTH FACTOR

## 📋 CÔNG THỨC TRONG TÀI LIỆU:

```
HF = (Σ_i Collateral_i × Price_i × LTV_i) / (Σ_j Debt_j × Price_j)

Trong đó:
- Collateral_i: Số lượng collateral
- Price_i: Giá thị trường (USD)
- LTV_i: Loan-to-Value ratio
- Debt_j: Số lượng vay
- Price_j: Giá thị trường (USD)
```

---

## 🔍 SO SÁNH VỚI CODE:

### Collateral Calculation (Line 186-188):

**Tài liệu:**
```
Collateral_value_i = Collateral_i × Price_i × LTV_i
```

**Code:**
```solidity
// Line 186
uint256 supplyValueUSD = (supply * price) / 1e18;
//                         ↑     ↑
//                    Collateral_i  Price_i

// Line 187
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
//                                                 ↑
//                                              LTV_i

// Line 188
collateralValue1e18 += weightedCollateral;
//  ↑
//  Σ_i Collateral_i × Price_i × LTV_i
```

**→ ✅ ĐÚNG!**

### Debt Calculation (Line 192-198):

**Tài liệu:**
```
Debt_value_j = Debt_j × Price_j
```

**Code:**
```solidity
// Line 192
uint256 debt = _currentDebt(user, asset);  // Debt_j

// Line 196
uint256 debtValueUSD = (debt * price) / 1e18;
//                      ↑     ↑
//                   Debt_j  Price_j

// Line 197
debtValue1e18 += debtValueUSD;
// ↑
// Σ_j Debt_j × Price_j
```

**→ ✅ ĐÚNG!**

### Health Factor Calculation (Line 205):

**Tài liệu:**
```
HF = Total_Collateral / Total_Debt
```

**Code:**
```solidity
// Line 205
healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
//                   ↑                        ↑
//              Σ_i (Coll×Price×LTV)      Σ_j (Debt×Price)
```

**→ ✅ ĐÚNG!**

---

## 🧪 VÍ DỤ MINH HỌA:

### Scenario:
```
User có:
- 10 WETH (giá $1,600, LTV=80%)
- Vay 5,000 USDC (giá $1)
```

### Tính theo tài liệu:

**1. Collateral:**
```
Collateral_i = 10 WETH
Price_i = $1,600
LTV_i = 80%

Value = 10 × 1,600 × 0.8 = $12,800
```

**2. Debt:**
```
Debt_j = 5,000 USDC
Price_j = $1

Value = 5,000 × 1 = $5,000
```

**3. Health Factor:**
```
HF = $12,800 / $5,000 = 2.56
```

**4. Kết luận:**
```
HF = 2.56 > 1 → An toàn! ✅
```

---

## ✅ XÁC NHẬN:

Code đang dùng đúng công thức HF.

| Line | Formula trong tài liệu | Code | Status |
|------|------------------------|------|--------|
| 187 | Coll × Price × LTV | `(supply * price * ltvBps) / 10000` | ✅ |
| 196 | Debt × Price | `(debt * price) / 1e18` | ✅ |
| 205 | HF = Coll / Debt | `(collateral * 1e18) / debt` | ✅ |

---

**CÔNG THỨC HF = ĐÚNG! ✅**


