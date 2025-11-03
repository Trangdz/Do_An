# 🔍 DEBUG REAL-TIME PRICE

## Nếu vẫn không thấy giá update

---

### **1. Check Browser Console (F12)**

Mở Console, tìm logs:
```
🔍 Fetching APR data for: 0x...
📊 Calling reserves()...
```

Nếu thấy lỗi → Copy paste cho tôi

---

### **2. Check Network Tab (F12)**

1. Mở Network tab
2. Filter: `getAssetPrice`
3. Xem có calls không?

Nếu không có calls → Provider chưa connect

---

### **3. Check MetaMask Network**

Đảm bảo:
- Network: Ganache
- Chain ID: 1337
- RPC: http://127.0.0.1:7545

---

### **4. Hard Refresh**

```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

### **5. Check Auto-Updater Logs**

Terminal 1 phải show:
```
⏰ [Time] Starting update cycle...
✅ Updated 4 prices successfully!
```

Nếu không → Auto-updater bị lỗi

---

### **6. Verify Addresses Match**

```javascript
// Console trong browser
console.log(window.ethereum.chainId) // Should be "0x539" (1337)
```

---

### **7. Last Resort: Redeploy**

```bash
# Terminal 3
npx hardhat run scripts/deploy_ganache.cjs --network ganache

# Sau đó restart frontend (Ctrl+C, npm run dev)
```

---

## 📞 **BÁO LỖI**

Nếu vẫn không work, gửi cho tôi:

1. ✅ Screenshot browser console (F12)
2. ✅ Terminal 1 output (auto-updater)
3. ✅ MetaMask network settings
4. ✅ Error messages (nếu có)

Tôi sẽ fix ngay!

