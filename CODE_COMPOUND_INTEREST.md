# 📝 ĐOẠN CODE THỂ HIỆN COMPOUND INTEREST THEO GIÂY

## 🎯 CÓ 3 ĐOẠN CODE CHÍNH:

### 1️⃣ **ACCRUE INDEX (Update index theo giây)**

**File:** `contracts/core/LendingPool.sol` (Lines 64-74)

```solidity
uint256 dt = block.timestamp - uint256(r.lastUpdate);  // ← SỐ GIÂY
if (dt > 0) {
    // cập nhật index theo dt (SECONDS)
    uint256 liqIndex = uint256(r.liquidityIndex);
    uint256 borIndex = uint256(r.variableBorrowIndex);
    
    // ✅ COMPOUND INTEREST FORMULA:
    // New_Index = Old_Index × (1 + rate × seconds)
    liqIndex = RayMath.rayMul(liqIndex, 1e27 + uint256(r.liquidityRateRayPerSec) * dt);
    //                            ↑                              ↑
    //                      Old Index                    (1 + rate × seconds)
    
    borIndex = RayMath.rayMul(borIndex, 1e27 + uint256(r.variableBorrowRateRayPerSec) * dt);
    
    r.liquidityIndex = uint128(liqIndex);
    r.variableBorrowIndex = uint128(borIndex);
    r.lastUpdate = uint40(block.timestamp);  // ← Cập nhật timestamp
}
```

**Giải thích:**
- `dt` = số GIÂY đã qua (block.timestamp là số giây)
- `1e27 + rate × dt` = (1 + lãi suất × thời gian)
- Index tăng theo compound interest

---

### 2️⃣ **CALCULATE CURRENT BALANCE (Index-based)**

**File:** `contracts/core/LendingPool.sol` (Lines 148-153)

```solidity
function _currentSupply(address user, address asset) internal view returns (uint256 supplyNow1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (u.supply.principal == 0) return 0;
    
    // ✅ LẤY SỐ DƯ HIỆN TẠI DỰA TRÊN INDEX:
    return LendingMath.valueByIndex(
        u.supply.principal,        // Số tiền gốc ban đầu
        r.liquidityIndex,          // Index hiện tại (đã tăng lãi)
        u.supply.index             // Index lúc user gửi tiền
    );
}
```

**Giải thích:**
- `u.supply.principal` = Số tiền user đã gửi (cố định)
- `r.liquidityIndex` = Index hiện tại (tăng liên tục do lãi)
- `u.supply.index` = Index lúc user gửi tiền (snapshot)

**→ Balance = principal × (currentIndex / snapshotIndex)**

---

### 3️⃣ **VALUE BY INDEX (Library function)**

**File:** `contracts/libraries/LendingMath.sol` (Lines 49-52)

```solidity
/// convert principal theo index (RAY)
function valueByIndex(
    uint256 principal,       // Số tiền gốc
    uint256 indexNowRay,     // Index hiện tại
    uint256 indexSnapRay     // Index snapshot
) internal pure returns (uint256) {
    if (principal == 0) return 0;
    
    // ✅ CÔNG THỨC:
    // Current Value = Principal × (Current Index / Snapshot Index)
    return (principal * indexNowRay) / indexSnapRay;
}
```

**Ví dụ:**
```
User gửi: 1000 USDC
Snapshot index: 1e27 (ban đầu)
After 1 year: Current index = 1.05e27 (tăng 5%)
Current balance = 1000 × (1.05e27 / 1e27) = 1050 USDC
```

---

## 📊 VÍ DỤ HOẠT ĐỘNG:

### Timeline:

```javascript
// Day 0: User gửi 1000 USDC
lend(usdc, 1000);
// u.supply.principal = 1000e18
// u.supply.index = 1e27
// r.liquidityIndex = 1e27

// Day 1: 86400 seconds đã qua
// _accrue() được gọi:
dt = 86400
newIndex = 1e27 × (1 + rate * 86400)
         = 1e27 × 1.0000137
         = 1.0000137e27

// User balance = 1000 × (1.0000137e27 / 1e27)
//               = 1000.0137 USDC
```

---

## 🔍 CODE LIBRARY:

**File:** `contracts/libraries/LendingMath.sol` (Lines 28-36)

```solidity
function accrueIndex(
    uint256 indexRay,           // Index hiện tại
    uint256 rateRayPerSec,      // Lãi suất mỗi giây
    uint256 dt                   // Số giây
) internal pure returns (uint256) {
    // ✅ COMPOUND INTEREST:
    // 1 + lãi = 1 + (rate × time)
    uint256 growth = RAY + rateRayPerSec * dt;
    
    // New index = Old index × (1 + lãi)
    return rayMul(indexRay, growth);
}
```

**→ Đây chính là COMPOUND INTEREST THEO GIÂY!**

---

## 🎯 TÓM TẮT:

### Đoạn code thể hiện Compound Interest:

```solidity
// ✅ ĐOẠN 1: ACCRUE (Line 64-74)
uint256 dt = block.timestamp - r.lastUpdate;  // ← GIÂY
liqIndex = RayMath.rayMul(liqIndex, 1e27 + rate * dt);
//                          ↑
//              Compound interest per second!

// ✅ ĐOẠN 2: CURRENT BALANCE (Line 148-153)
return LendingMath.valueByIndex(
    principal,
    currentIndex,  // Đã tăng lãi
    userIndex      // Snapshot
);
// balance = principal × (currentIndex / userIndex)

// ✅ ĐOẠN 3: LIBRARY (Lines 49-52)
return (principal * indexNowRay) / indexSnapRay;
// ↑ Công thức lấy số dư hiện tại
```

### Đặc điểm:

1. ✅ **dt theo giây**: `block.timestamp - r.lastUpdate`
2. ✅ **Compound**: `index = oldIndex × (1 + rate × seconds)`
3. ✅ **User balance tăng**: `principal × (currentIndex / snapshotIndex)`

---

**ĐÂY LÀ COMPOUND INTEREST THEO GIÂY!** ✅



