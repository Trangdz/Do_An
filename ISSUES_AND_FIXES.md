# ⚠️ PHÁT HIỆN VẤN ĐỀ VÀ CÁCH SỬA

## 🔴 CÁC VẤN ĐỀ NGHIÊM TRỌNG:

### 1. ❌ WITHDRAW KHÔNG GIỚI HẠN THEO HEALTH FACTOR

**File:** `contracts/core/LendingPool.sol` (Line 210-213)

**Vấn đề:**
```solidity
function _maxWithdrawAllowed(address /*user*/, address /*asset*/) internal pure returns (uint256 xMax1e18) {
    return type(uint256).max;  // ← TRẢ VỀ MAX!
}
```

**Hệ quả:**
- User có thể withdraw hết tiền
- Health factor có thể < 1
- Không thể liquidate

**Cách sửa:**
```solidity
function _maxWithdrawAllowed(address user, address asset) internal view returns (uint256 xMax1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    
    if (!u.useAsCollateral || u.supply.principal == 0) {
        return 0;  // Can withdraw all if not collateral
    }
    
    // Get user account data
    uint256 collateralValue1e18;
    uint256 debtValue1e18;
    
    // Calculate total collateral
    for (uint i = 0; i < _allAssets.length; i++) {
        address assetAddr = _allAssets[i];
        ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
        
        if (uData.useAsCollateral && uData.supply.principal > 0) {
            uint256 supply1e18 = _currentSupply(user, assetAddr);
            uint256 price = oracle.getAssetPrice1e18(assetAddr);
            collateralValue1e18 += supply1e18 * price / 1e18;
        }
    }
    
    // Calculate total debt
    for (uint i = 0; i < _allAssets.length; i++) {
        address assetAddr = _allAssets[i];
        ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
        
        if (uData.borrow.principal > 0) {
            uint256 borrow1e18 = _currentBorrow(user, assetAddr);
            uint256 price = oracle.getAssetPrice1e18(assetAddr);
            debtValue1e18 += borrow1e18 * price / 1e18;
        }
    }
    
    // If no debt, can withdraw all
    if (debtValue1e18 == 0) {
        return u.supply.principal;
    }
    
    // Calculate max can withdraw to keep HF >= 1
    uint256 currentSupply1e18 = _currentSupply(user, asset);
    uint256 assetPrice = oracle.getAssetPrice1e18(asset);
    uint256 collateralForAsset = currentSupply1e18 * assetPrice / 1e18;
    
    // Need: (collateral - withdrawn) / debt >= 1
    // withdrawn <= collateral - debt
    uint256 maxCanWithdrawValue = collateralForAsset;
    if (collateralValue1e18 > debtValue1e18) {
        maxCanWithdrawValue = collateralForAsset - ((collateralValue1e18 - debtValue1e18) * 1e18 / assetPrice);
    }
    
    // Convert to principal
    uint256 maxCanWithdrawPrincipal = maxCanWithdrawValue * 1e18 / assetPrice;
    
    return maxCanWithdrawPrincipal > currentSupply1e18 ? currentSupply1e18 : maxCanWithdrawPrincipal;
}
```

---

### 2. ❌ BORROW KHÔNG KIỂM TRA LTV

**File:** `contracts/core/LendingPool.sol` (Line 297-331)

**Vấn đề:**
- Không check LTV (Loan-to-Value)
- User có thể borrow quá mức cho phép

**Cách sửa:**
```solidity
function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    _requireInited(asset);
    
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (!r.isBorrowable) revert InvalidAmount();
    
    _accrue(asset);
    
    // Calculate how much can borrow based on collateral
    uint256 availableToBorrow = _calculateMaxBorrow(msg.sender, asset);
    
    if (availableToBorrow == 0) revert InsufficientCollateral();
    
    uint256 requested1e18 = _to1e18(amount, r.decimals);
    uint256 borrowAmount1e18 = requested1e18 > availableToBorrow 
        ? availableToBorrow 
        : requested1e18;
    
    // ... rest of the function
}

function _calculateMaxBorrow(address user, address asset) internal view returns (uint256 maxBorrow1e18) {
    uint256 totalCollateral1e18;
    uint256 totalDebt1e18;
    
    // Sum all collateral with LTV
    for (uint i = 0; i < _allAssets.length; i++) {
        address assetAddr = _allAssets[i];
        ReserveUserModels.ReserveData storage rData = reserves[assetAddr];
        ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
        
        if (uData.useAsCollateral && uData.supply.principal > 0) {
            uint256 supply1e18 = _currentSupply(user, assetAddr);
            uint256 price = oracle.getAssetPrice1e18(assetAddr);
            uint256 collateralValue = supply1e18 * price / 1e18;
            
            // Apply LTV
            uint256 collateralWithLTV = collateralValue * rData.ltvBps / 10000;
            totalCollateral1e18 += collateralWithLTV;
        }
    }
    
    // Sum all debt
    for (uint i = 0; i < _allAssets.length; i++) {
        address assetAddr = _allAssets[i];
        ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
        
        if (uData.borrow.principal > 0) {
            uint256 borrow1e18 = _currentBorrow(user, assetAddr);
            uint256 price = oracle.getAssetPrice1e18(assetAddr);
            totalDebt1e18 += borrow1e18 * price / 1e18;
        }
    }
    
    // Get price of asset to borrow
    uint256 borrowAssetPrice = oracle.getAssetPrice1e18(asset);
    
    // Calculate max can borrow
    if (totalCollateral1e18 <= totalDebt1e18) {
        return 0;
    }
    
    uint256 availableCollateral = totalCollateral1e18 - totalDebt1e18;
    maxBorrow1e18 = availableCollateral * 1e18 / borrowAssetPrice;
    
    return maxBorrow1e18;
}
```

---

### 3. ⚠️ HEALTH FACTOR KHÔNG DÙNG LTV

**File:** `contracts/core/LendingPool.sol` (Line 192-206)

**Vấn đề:**
```solidity
// Current: Uses full collateral value
collateralValue1e18 += userSupply1e18 * price / 1e18;

// ❌ Should use LTV-adjusted value
// collateralValue1e18 += (userSupply1e18 * price / 1e18) * ltvBps / 10000;
```

**Cách sửa:**
```solidity
// In _getAccountData function:
for (uint i = 0; i < _allAssets.length; i++) {
    address assetAddr = _allAssets[i];
    ReserveUserModels.ReserveData storage rData = reserves[assetAddr];
    ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
    
    if (uData.useAsCollateral && uData.supply.principal > 0) {
        uint256 userSupply1e18 = _currentSupply(user, assetAddr);
        uint256 price = oracle.getAssetPrice1e18(assetAddr);
        uint256 fullValue = userSupply1e18 * price / 1e18;
        
        // ✅ Apply LTV
        uint256 ltvAdjustedValue = fullValue * rData.ltvBps / 10000;
        collateralValue1e18 += ltvAdjustedValue;
    }
}
```

---

## ✅ NHỮNG ĐIỂM ĐÚNG:

1. ✅ Interest rate calculation (2-slope model)
2. ✅ Index accrual
3. ✅ Utilization calculation
4. ✅ Events emitted
5. ✅ Reentrancy protection

---

## 🧪 CÁCH TEST:

```bash
# Chạy test file đã tạo
npx hardhat test test/validate_logic.cjs

# Hoặc test toàn bộ
npx hardhat test
```

---

## 📝 TODO LIST:

- [ ] Fix `_maxWithdrawAllowed()` function
- [ ] Add LTV check in `_calculateMaxBorrow()`
- [ ] Fix health factor calculation to use LTV
- [ ] Add liquidate function
- [ ] Test all scenarios
- [ ] Security audit




