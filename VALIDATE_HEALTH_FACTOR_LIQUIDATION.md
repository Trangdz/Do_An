# 🔍 KIỂM TRA HEALTH FACTOR & LIQUIDATION

## 📊 CÔNG THỨC HEALTH FACTOR:

### Aave Standard:
```
Health Factor = Total Collateral (with LTV) / Total Debt

Trong đó:
- Collateral được tính với LTV (Loan-to-Value)
- Debt được tính full value
```

---

## 🔍 PHÂN TÍCH CODE HIỆN TẠI:

### File: `contracts/core/LendingPool.sol` (Lines 162-207)

```solidity
function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    // ✅ Loop qua tất cả assets
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        // Skip if not initialized
        if (r.lastUpdate == 0) continue;
        
        // ✅ Get price
        uint256 price = oracle.getAssetPrice1e18(asset);
        if (price == 0) continue;
        
        // ✅ Calculate COLLATERAL (Line 183-189)
        uint256 supply = _currentSupply(user, asset);
        if (supply > 0 && u.useAsCollateral) {
            uint256 supplyValueUSD = (supply * price) / 1e18;
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            collateralValue1e18 += weightedCollateral;  // ✅ ĐÚNG! Dùng LTV
        }
        
        // ✅ Calculate DEBT (Line 192-198)
        uint256 debt = _currentDebt(user, asset);
        if (debt > 0) {
            uint256 debtValueUSD = (debt * price) / 1e18;
            debtValue1e18 += debtValueUSD;  // ✅ ĐÚNG! Full value
        }
    }
    
    // ✅ Calculate Health Factor (Line 202-206)
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;  // ✅ Correct
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;  // ✅ ĐÚNG
    }
}
```

---

## ✅ KẾT QUẢ KIỂM TRA:

### **HEALTH FACTOR: ĐÚNG! ✅**

Code đã implement đúng:
1. ✅ Collateral dùng LTV (Line 187)
2. ✅ Debt dùng full value (Line 196)
3. ✅ Formula: HF = collateral / debt (Line 205)

**KHÔNG CẦN SỬA!**

---

## 🔍 PHÂN TÍCH LIQUIDATION:

### File: `contracts/core/LendingPool.sol` (Lines 523-606)

```solidity
function liquidationCall(
    address debtAsset,
    address collateralAsset,
    address user,
    uint256 repayRequested
) external nonReentrant whenNotPaused {
    // ✅ Step 0: Accrue
    _accrue(debtAsset);
    _accrue(collateralAsset);
    
    ReserveUserModels.ReserveData storage d = reserves[debtAsset];
    ReserveUserModels.ReserveData storage c = reserves[collateralAsset];
    
    // ✅ Step 1: Check HF < 1
    (, , uint256 hf) = _getAccountData(user);
    require(hf < 1e18, "HF>=1");
    
    // ✅ Step 2: Get current debt
    uint256 debtNow = _currentDebt(user, debtAsset);
    require(debtNow > 0, "no debt");
    
    // ✅ Step 3: Close factor clamp
    uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000;
    uint256 repayReq1e18 = _to1e18(repayRequested, d.decimals);
    uint256 repay1e18 = repayReq1e18 > maxRepay ? maxRepay : repayReq1e18;
    
    // ✅ Step 4: Liquidator transfers debt
    uint256 before = IERC20(debtAsset).balanceOf(address(this));
    IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), _from1e18(repay1e18, d.decimals));
    uint256 received = IERC20(debtAsset).balanceOf(address(this)) - before;
    
    // ✅ Step 5: Calculate seized collateral
    uint256 priceDebt = oracle.getAssetPrice1e18(debtAsset);
    uint256 priceColl = oracle.getAssetPrice1e18(collateralAsset);
    uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;
    
    uint256 bonusBps = c.liqBonusBps;
    uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;  // ✅ Bonus!
    
    uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;
    
    // ✅ Step 6: Check user has enough collateral
    uint256 userCollNow = _currentSupply(user, collateralAsset);
    require(userCollNow >= seizeColl1e18, "insufficient collateral");
    
    // ✅ Step 7: Update user position
    ud.borrow.principal = uint128(dNew);
    uc.supply.principal = uint128(cNew);
    
    // ✅ Step 8: Update reserve books
    d.totalDebtPrincipal -= repay1e18;
    d.reserveCash += repay1e18;
    c.reserveCash -= seizeColl1e18;
    
    IERC20(collateralAsset).safeTransfer(msg.sender, _from1e18(seizeColl1e18, c.decimals));
}
```

---

## ✅ KẾT QUẢ KIỂM TRA LIQUIDATION:

### Liquidation Logic: ĐÚNG! ✅

Đã implement đúng:
1. ✅ Check HF < 1
2. ✅ Close factor (line 547)
3. ✅ Liquidation bonus (line 565)
4. ✅ Calculate seized collateral
5. ✅ Update positions
6. ✅ Transfer collateral

**KHÔNG CẦN SỬA!**

---

## ⚠️ VẤN ĐỀ PHÁT HIỆN:

### _maxWithdrawAllowed: VẪN SAI

**File:** Line 210-214

```solidity
function _maxWithdrawAllowed(address /*user*/, address /*asset*/) internal pure returns (uint256 xMax1e18) {
    // Simplified version for demo - return max value to allow withdraw
    // In production, you would implement proper health factor calculation
    return type(uint256).max;  // ← ❌ VẪN TRẢ VỀ MAX!
}
```

**Hệ quả:**
- User có thể withdraw hết tiền
- Health factor có thể < 1
- Không thể liquidate

**CẦN SỬA!**

---

## 🛠️ CÁCH SỬA _maxWithdrawAllowed:

```solidity
function _maxWithdrawAllowed(address user, address asset) internal view returns (uint256 xMax1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    
    if (!u.useAsCollateral || u.supply.principal == 0) {
        return u.supply.principal;  // Can withdraw all if not collateral
    }
    
    // Get current supply
    uint256 currentSupply = _currentSupply(user, asset);
    
    // Get user health factor before withdraw
    (uint256 totalCollateral, uint256 totalDebt, uint256 hf) = _getAccountData(user);
    
    // If no debt, can withdraw all
    if (totalDebt == 0) {
        return currentSupply;
    }
    
    // If HF already < 1, cannot withdraw
    if (hf < 1e18) {
        return 0;
    }
    
    // Get asset data
    ReserveUserModels.ReserveData storage r = reserves[asset];
    uint256 assetPrice = oracle.getAssetPrice1e18(asset);
    
    // Calculate how much can withdraw while keeping HF >= 1
    // HF_after = (collateral - withdraw_value) / debt >= 1
    // withdraw_value <= collateral - debt
    uint256 assetCollateralValue = (currentSupply * assetPrice * r.ltvBps) / (1e18 * 10000);
    
    // Max withdraw to maintain HF >= 1
    uint256 maxWithdrawValue = 0;
    if (totalCollateral > totalDebt) {
        maxWithdrawValue = ((totalCollateral - totalDebt) * 1e18) / assetPrice;
        // Apply LTV
        maxWithdrawValue = (maxWithdrawValue * r.ltvBps) / 10000;
    }
    
    // Return min of current supply and max allowed
    return maxWithdrawValue < currentSupply ? maxWithdrawValue : currentSupply;
}
```

---

## 📊 BẢNG TÓM TẮT:

| Component | Status | Issue | Fix Needed? |
|-----------|--------|-------|-------------|
| **Health Factor** | ✅ ĐÚNG | None | ❌ No |
| **Liquidation** | ✅ ĐÚNG | None | ❌ No |
| **_maxWithdrawAllowed** | ❌ SAI | Returns max | ✅ YES |

---

## 🎯 KẾT LUẬN:

### ✅ ĐÚNG:
1. ✅ Health Factor calculation - ĐÚNG
2. ✅ Liquidation logic - ĐÚNG
3. ✅ Close factor - ĐÚNG
4. ✅ Liquidation bonus - ĐÚNG

### ❌ SAI:
1. ❌ `_maxWithdrawAllowed()` - VẪN TRẢ VỀ MAX!

### 🔴 CẦN SỬA:
Chỉ cần sửa `_maxWithdrawAllowed()` function!




