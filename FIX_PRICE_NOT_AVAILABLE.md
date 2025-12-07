# FIX: PRICE NOT AVAILABLE ERROR

## 🐛 VẤN ĐỀ

Khi một asset không có price trong oracle, các view functions như `getAccountData()` sẽ revert với error:
```
"MultiPriceAggregator: price not available"
```

**Nguyên nhân:**
- `oracle.getAssetPrice1e18()` revert nếu price không available
- Các view functions gọi oracle trực tiếp mà không có error handling
- Khi một asset không có price → toàn bộ function revert

---

## ✅ GIẢI PHÁP

Wrap tất cả calls đến `oracle.getAssetPrice1e18()` trong **try-catch** để skip assets không có price thay vì revert.

### 1. Sửa `_getAccountData()` ✅

**Trước:**
```solidity
uint256 price = oracle.getAssetPrice1e18(asset);
if (price == 0) continue;
```

**Sau:**
```solidity
uint256 price;
try oracle.getAssetPrice1e18(asset) returns (uint256 p) {
    price = p;
    if (price == 0) continue;
} catch {
    continue; // Skip if price not available
}
```

### 2. Sửa các View Functions ✅

**Functions đã sửa:**
- `_getAccountData()` ✅
- `getDebtUtilization()` ✅
- `getMaxBorrowable()` ✅
- `getLiquidationRisk()` ✅
- `_maxWithdrawAllowed()` ✅
- `canWithdrawAmount()` ✅
- `canDisableCollateral()` ✅
- `setUserCollaterals()` ✅

---

## 📝 LOGIC XỬ LÝ

### View Functions (Skip assets không có price)

```solidity
uint256 price;
try oracle.getAssetPrice1e18(asset) returns (uint256 p) {
    price = p;
    if (price == 0) continue; // Skip zero price
} catch {
    continue; // Skip if price not available
}
```

**Lý do:**
- View functions chỉ để đọc data
- Không nên revert nếu một asset không có price
- Skip asset đó và tiếp tục tính toán với các assets khác

### State-Changing Functions (Có thể revert)

Một số functions như `borrow()`, `lend()` vẫn cần revert nếu không có price vì:
- Đây là critical operations
- Cần price để tính toán chính xác
- Revert để bảo vệ user khỏi lỗi tính toán

---

## 🎯 KẾT QUẢ

✅ **View functions** không còn revert khi asset không có price
✅ **Skip assets** không có price và tiếp tục tính toán
✅ **User experience** tốt hơn - không bị crash khi một asset chưa có price

---

## ⚠️ LƯU Ý

1. **Assets không có price** sẽ bị skip trong calculations
2. **User có thể thấy** collateral/debt không đầy đủ nếu asset chưa có price
3. **Cần set price** cho tất cả assets trước khi sử dụng

---

## 🔧 NEXT STEPS

1. ✅ Đã sửa tất cả view functions
2. ⚠️ Cần đảm bảo tất cả assets đều có price trong oracle
3. 💡 Có thể thêm warning trong frontend nếu asset không có price









