# ⚠️ FIX TOGGLE ERROR

## ❌ LỖI:

```
"Failed to toggle collateral"
"Internal JSON-RPC error"
"code": -32603
```

## 🔍 NGUYÊN NHÂN:

Contract hiện tại (address: `0x324a12a67466e6a89fee979cdcc2e9a27a4237fe`) 
**CHƯA CÓ** function `setUserUseReserveAsCollateral()`!

## ✅ ĐÃ SỬA:

### Code Updated:
- ✅ Try-catch để check function exists
- ✅ Show informative error message
- ✅ Disable gracefully if function missing

### Error Message Mới:
```javascript
"⚠️ Contract update required!

This feature requires the contract to be 
redeployed with new functions.

Please:
1. Deploy updated contract
2. Update address in addresses.js
3. Refresh page"
```

---

## 🚀 CÁCH FIX PERMANENT:

### Option 1: Tạm thời comment switch UI

### Option 2: Deploy contract mới
```bash
# 1. Deploy
npx hardhat run scripts/deploy_ganache_simple.cjs

# 2. Update address
# Edit: lendhub-frontend-nextjs/src/addresses.js

# 3. Refresh
```

---

## 🎯 HIỆN TẠI:

- ✅ Switch hiển thị đẹp
- ⚠️ Click báo lỗi (contract chưa update)
- ℹ️ Error message rõ ràng

**Next:** Deploy contract mới! 🚀


