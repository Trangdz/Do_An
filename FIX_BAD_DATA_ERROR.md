# 🔧 FIX: BAD_DATA ERROR

## ❌ **LỖI**

```
could not decode result data (value="0x", 
info={ "method": "reserves", "signature": "reserves(address)" }, 
code=BAD_DATA)
```

---

## 🔍 **NGUYÊN NHÂN**

**Contract address đã thay đổi sau khi redeploy!**

```javascript
// Deploy mới:
LendingPool: 0x1d62f6ccd182e578b4beBEba888e1717c6A3710E ✅ NEW

// Frontend có thể đang dùng address cũ:
LendingPool: 0x3025454848FF75297cCdF5280A59b7A3Fc6892F9 ❌ OLD
```

---

## ✅ **GIẢI PHÁP**

### **1. Clear Frontend Cache + Restart**

```bash
cd lendhub-frontend-nextjs
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm run dev
```

**→ ĐÃ CHẠY! Đợi frontend load...**

---

### **2. Verify Addresses**

**Check `addresses.js`:**
```javascript
// Should match deploy output:
export const LendingPoolAddress = "0x1d62f6ccd182e578b4beBEba888e1717c6A3710E";
export const PriceOracleAddress = "0xCf5b00295cE0035eE154450800Ec3E5E93e4DE8c";
```

---

### **3. Check Browser Console**

**Sau khi frontend load, kiểm tra:**
```
1. F12 → Console
2. Xem có log "Pool:" với address đúng không
3. Refresh page nếu vẫn lỗi
```

---

## 🎯 **STATUS**

```
✅ Đã restart frontend (clearing .next cache)
✅ Addresses.js đã được update bởi deploy script
⏳ Đợi frontend load (30 giây)
```

**→ Thử refresh browser sau khi thấy "Ready in ..." trong terminal!**

