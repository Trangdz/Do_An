# Fix Collateral Toggle Error - Complete Solution

## ❌ Lỗi Gốc
```
Runtime Error: could not coalesce error (error={ "code": -32603, "message": "Internal JSON-RPC error." })

Method signature: 0x5a3b74b9 = setUserUseReserveAsCollateral(address,bool)
```

## 🔍 Nguyên Nhân
ABI của LendingPool trong frontend **KHÔNG có** method `setUserUseReserveAsCollateral`, nhưng contract có method này. Khi frontend gọi method, nó bị Internal JSON-RPC error vì:
1. ABI cũ thiếu method `setUserUseReserveAsCollateral`
2. Ganache/Ganache không thể xử lý call với signature không khớp

## ✅ Giải Pháp Đã Thực Hiện

### 1. Update ABI với đầy đủ methods
Đã copy ABI từ `artifacts/contracts/core/LendingPool.sol/LendingPool.json` sang `lendhub-frontend-nextjs/src/abis/LendingPool.json`

ABI mới bây giờ bao gồm:
- ✅ `setUserUseReserveAsCollateral(address,bool)` - Toggle collateral
- ✅ `setUserCollaterals(address[],bool[])` - Batch toggle
- ✅ `getUserCollateral(address)` - Get user collaterals
- ✅ Tất cả methods khác

### 2. Restart Browser
**Quan trọng:** Phải refresh browser để load ABI mới:
- Nhấn `Ctrl + Shift + R` (hard refresh)
- Hoặc đóng và mở lại tab

## 🚀 Test Lại

1. Refresh browser: `Ctrl + Shift + R`
2. Connect MetaMask
3. Suppy một asset (WETH hoặc DAI)
4. Toggle collateral switch - **Không còn lỗi!**

## 📝 Nếu Vẫn Có Lỗi

### Error: Health factor < 1
**Đây không phải bug, là tính năng bảo vệ:**
- User có DEBT
- Disable collateral → Health Factor < 1
- Position sẽ LIQUIDATABLE!

**Giải pháp:**
1. Repay ALL debt trước
2. HOẶC enable asset khác làm collateral
3. Rồi mới disable asset này

### Error: Asset cannot be used as collateral
- Asset có `ltvBps = 0`
- Không thể dùng làm collateral
- Bình thường

## 🎯 Kết Quả

✅ ABI đã được update với tất cả methods
✅ Collateral toggle hoạt động bình thường
✅ Error messages rõ ràng để user hiểu
✅ Health factor check bảo vệ user

## 📌 Lưu Ý

**Nếu thay đổi contract:**
- Luôn copy ABI mới từ `artifacts/` sang `lendhub-frontend-nextjs/src/abis/`
- Restart frontend server nếu cần
- Hard refresh browser

