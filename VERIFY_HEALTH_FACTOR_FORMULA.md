# ✅ KIỂM TRA CÔNG THỨC HEALTH FACTOR

## 📝 CÔNG THỨC TRONG TÀI LIỆU:

```
HF = (Σ_i Collateral_i × Price_i × LTV_i) / (Σ_j Debt_j × Price_j)

Trong đó:
- Collateral_i: Số lượng collateral của asset i
- Price_i: Giá thị trường hiện tại của asset i
- LTV_i: Tỷ lệ cho vay tối đa của asset i
- Debt_j: Số lượng đã vay của asset j  
- Price_j: Giá thị trường hiện tại của asset j
```

---

## 🔍 SO SÁNH VỚI CODE:

### File: `contracts/core/LendingPool.sol` (Lines 180-206)

```solidity
function _getAccountData(address user) internal view returns (...) {
    uint256 collateralValue1e18 = 0;
    uint256 debtValue1e18 = 0;
    
    // Loop qua tất cả assets (Σ_i, Σ_j)
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        if (r.lastUpdate == 0) continue;
        
        uint256 price = oracle.getAssetPrice1e18(asset);
        if (price == 0) continue;
        
        // ✅ TÍNH COLLATERAL (Lines 183-189)
        uint256 supply = _currentSupply(user, asset);  // Collateral_i
        if (supply > 0 && u.useAsCollateral) {
            uint256 supplyValueUSD = (supply * price) / 1e18;
            //                         ↑              ↑
            //                     Collateral_i    Price_i
            
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            //                                      ↑
            //                                   LTV_i
            
            collateralValue1e18 += weightedCollateral;
            //                      ↑
            //              Σ_i Collateral_i × Price_i × LTV_i
        }
        
        // ✅ TÍNH DEBT (Lines 192-198)
        uint256 debt = _currentDebt(user, asset);  // Debt_j
        if (debt > 0) {
            uint256 debtValueUSD = (debt * price) / 1e18;
            //                      ↑     ↑
            //                   Debt_j  Price_j
            
            debtValue1e18 += debtValueUSD;
            //                ↑
            //        Σ_j Debt_j × Price_j
        }
    }
    
    // ✅ TÍNH HEALTH FACTOR (Lines 202-206)
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
        //                    ↑                              ↑
        //              Σ_i (Coll×Price×LTV)          Σ_j (Debt×Price)
    }
}
```

---

## ✅ SO SÁNH TỪNG BƯỚC:

### 1. **Tính Collateral (Line 187):**

**Công thức trong tài liệu:**
```
Collateral_value = Collateral_i × Price_i × LTV_i
```

**Code:**
```solidity
weightedCollateral = (supply * price * ltvBps) / 10000;
//                    ↑         ↑       ↑
//                Collateral_i Price_i LTV_i
```

**→ ✅ ĐÚNG!**

### 2. **Tính Debt (Line 196):**

**Công thức trong tài liệu:**
```
Debt_value = Debt_j × Price_j
```

**Code:**
```solidity
debtValueUSD = (debt * price) / 1e18;
//              ↑     ↑
//           Debt_j Price_j
```

**→ ✅ ĐÚNG!**

### 3. **Tính Health Factor (Line 205):**

**Công thức trong tài liệu:**
```
HF = (Σ_i Collateral_i × Price_i × LTV_i) / (Σ_j Debt_j × Price_j)
```

**Code:**
```solidity
healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
//                 = (Σ_i weightedCollateral) / (Σ_j debtValueUSD)
```

**→ ✅ ĐÚNG!**

---

## 🧪 VÍ DỤ KIỂM TRA:

### Input:
```
User có:
- 10 WETH làm collateral (LTV = 80%)
- Vay 5,000 USDC
- Giá WETH = $1,600
- Giá USDC = $1
```

### Tính toán theo công thức:

**1. Collateral Value:**
```
Collateral_i = 10 WETH
Price_i = $1,600
LTV_i = 80%

Collateral_value = 10 × 1,600 × 0.8
                  = 12,800 USD
```

**2. Debt Value:**
```
Debt_j = 5,000 USDC
Price_j = $1

Debt_value = 5,000 × 1
            = 5,000 USD
```

**3. Health Factor:**
```
HF = 12,800 / 5,000
   = 2.56
```

**→ HF > 1 → AN TOÀN! ✅**

---

## 📊 KẾT LUẬN:

### ✅ CODE ĐÃ IMPLEMENT ĐÚNG:

| Component | Tài liệu | Code | Match? |
|-----------|----------|------|--------|
| **Collateral** | Σ Coll × Price × LTV | ✅ weightedCollateral | ✅ ĐÚNG |
| **Debt** | Σ Debt × Price | ✅ debtValueUSD | ✅ ĐÚNG |
| **HF Formula** | Coll / Debt | ✅ HF = coll / debt | ✅ ĐÚNG |

### ✅ ĐIỀU KIỆN LIQUIDATION:

```
Line 540 trong liquidationCall():
require(hf < 1e18, "HF>=1");
```

**→ Đúng với tài liệu:**
- HF > 1: Safe (không liquidate)
- HF < 1: Liquidate ✅

---

## 🎯 TÓM TẮT:

### ✅ CÔNG THỨC HF HOÀN TOÀN ĐÚNG!

```
HF = (Σ_i Collateral_i × Price_i × LTV_i) / (Σ_j Debt_j × Price_j)
    ↑                               ↑                                  ↑
    Collateral                      LTV                              Debt
```

Code đã implement:
- ✅ Collateral với LTV
- ✅ Debt full value
- ✅ Tổng hợp đúng
- ✅ Liquidation threshold đúng

**KHÔNG CẦN SỬA GÌ THÊM!**

---

## ⚠️ LƯU Ý:

Chỉ cần sửa `_maxWithdrawAllowed()` để đảm bảo user không thể withdraw quá mức khiến HF < 1.

**Còn lại tất cả đều ĐÚNG! ✅**




