# ✅ FIX: Lỗi khi Bật/Tắt Collateral

## 🔍 VẤN ĐỀ:

**Hiện tượng:** Khi bật/tắt collateral → Bị lỗi

**Nguyên nhân:**
1. ❌ **Health Factor < 1** khi disable collateral
2. ❌ **LTV = 0%** - asset không được dùng làm collateral
3. ❌ **Không có supply** - user chưa supply asset này

## ✅ ĐÃ FIX:

### 1. Thêm Detailed Error Handling:
- Parse `estimateGas` error để bắt revert reason
- Hiển thị message cụ thể cho từng lỗi

### 2. Các Lỗi Được Handle:

**A. Health Factor < 1:**
```
❌ Cannot disable collateral!

You have debt and disabling this collateral would make your 
health factor < 1.00.

To disable collateral:
1. Repay some debt first
2. Or enable other assets as collateral
3. Then try again
```

**B. LTV = 0%:**
```
❌ Asset cannot be used as collateral

This asset has LTV = 0% and cannot be used as collateral.
```

**C. No Supply:**
```
❌ No supply balance

You must have supplied this asset before you can toggle collateral.
```

### 3. Logic Contract (Đã có):

```solidity
// Check health factor after disabling
else {
    (uint256 collateralBefore, uint256 debt, ) = _getAccountData(msg.sender);
    uint256 collateralAfter = collateralBefore - weightedCollateral;
    
    if (debt > 0) {
        require(collateralAfter >= debt, "Health factor would be < 1");
    }
    
    u.useAsCollateral = false;
    emit CollateralDisabled(msg.sender, asset);
}
```

---

## 🎯 KẾT QUẢ:

✅ User thấy message rõ ràng khi toggle fail  
✅ Không crash frontend  
✅ Hiểu được tại sao không toggle được  
✅ Có hướng dẫn fix

---

**Đã fix trong:** `src/components/TokenCard.tsx`


