# ✅ KIỂM TRA LOGIC TÍNH TOÁN VÀ CƠ CHẾ VAY

## 🎯 CÁC ĐIỂM CẦN KIỂM TRA:

### 1. **Logic Tính Lãi Suất (Interest Rate Model)**
### 2. **Cơ Chế Vay (Borrowing Mechanism)**
### 3. **Kiểm Tra Collateral**
### 4. **Health Factor**

---

## 📊 PHÂN TÍCH CODE HIỆN TẠI:

### ✅ PHẦN ĐÚNG:

#### 1. Interest Rate Model - ĐÚNG:

```solidity
// contracts/core/InterestRateModel.sol (Lines 47-59)

if (U <= Ustar) {
    // SLOPE 1: Linear
    uint256 ratioWAD = (U * 1e18) / Ustar;
    borrow = base + (s1 * ratioWAD) / 1e18;
} else {
    // SLOPE 2: Steep
    uint256 numer = U - Ustar;
    uint256 denom = (1e18 - Ustar);
    uint256 ratioWAD = (numer * 1e18) / denom;
    borrow = base + s1 + (s2 * ratioWAD) / 1e18;
}

// ✅ CÔNG THỨC ĐÚNG!
```

#### 2. Accrue Interest - ĐÚNG:

```solidity
// contracts/core/LendingPool.sol (Lines 69-72)

liqIndex = RayMath.rayMul(liqIndex, 1e27 + uint256(r.liquidityRateRayPerSec) * dt);
borIndex = RayMath.rayMul(borIndex, 1e27 + uint256(r.variableBorrowRateRayPerSec) * dt);

// ✅ INDEX UPDATE ĐÚNG!
```

---

## ⚠️ CÁC VẤN ĐỀ CẦN KIỂM TRA:

### 1. **Borrow Amount Validation**

```solidity
// contracts/core/LendingPool.sol (Line 297-331)

function borrow(address asset, uint256 amount) external {
    // ... 
    
    // ❓ CẦN KIỂM TRA: Có validate được borrow bao nhiêu?
    // Health factor check?
    // Collateral sufficient?
}
```

**Cần kiểm tra:**
- ✅ User có đủ collateral không?
- ✅ Health factor >= 1 sau khi borrow?
- ✅ Không borrow quá available liquidity?

### 2. **Withdraw Restriction**

```solidity
// contracts/core/LendingPool.sol (Line 269-277)

function withdraw(...) {
    uint256 xMax = _maxWithdrawAllowed(msg.sender, asset);
    // ^ ❌ HÀM NÀY RETURN MAX VALUE!
    
    if (amt > xMax) amt = xMax;
    // Vì xMax = max → KHÔNG CÓ GIỚI HẠN!
}
```

**❌ VẤN ĐỀ:**
```solidity
// Line 210-213
function _maxWithdrawAllowed(...) internal pure returns (uint256 xMax1e18) {
    return type(uint256).max;  // ← TRẢ VỀ MAX!
}
```

**→ User có thể withdraw hết tiền, health factor < 1!**

### 3. **Health Factor Calculation**

```solidity
// contracts/core/LendingPool.sol (Line 192-206)

function _getAccountData(address user) internal view returns (...) {
    uint256 collateralValue1e18 = 0;
    uint256 debtValue1e18 = 0;
    
    // Calculate collateral
    for (uint i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        if (u.useAsCollateral && u.supply.principal > 0) {
            uint256 userSupply1e18 = _currentSupply(user, asset);
            uint256 price = oracle.getAssetPrice1e18(asset);
            collateralValue1e18 += userSupply1e18 * price / 1e18;
        }
    }
    
    // Calculate debt
    for (uint i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        if (u.borrow.principal > 0) {
            uint256 userDebt1e18 = _currentBorrow(user, asset);
            uint256 price = oracle.getAssetPrice1e18(asset);
            debtValue1e18 += userDebt1e18 * price / 1e18;
        }
    }
    
    // Health factor = collateral / debt
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
    }
    
    // ✅ LOGIC ĐÚNG
    // ⚠️ NHƯNG thiếu LTV check!
}
```

**❌ Thiếu:**
- Không có LTV (Loan-to-Value) check
- Không có liquidation threshold check
- Health factor không dùng LTV

---

## 🧪 TẠO TEST COMPREHENSIVE:

