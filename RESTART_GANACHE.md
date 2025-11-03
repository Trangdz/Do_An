# ✅ RESTART GANACHE

## 🔍 VẤN ĐỀ:

**Error:** `Internal JSON-RPC error (code -32603)` khi toggle collateral

**Nguyên nhân:**
- Có nhiều Ganache instances chạy cùng lúc (6 processes)
- Ganache bị conflict hoặc không response

## ✅ ĐÃ XỬ LÝ:

### 1. Dừng tất cả Ganache:
```powershell
Stop-Process -Name "Ganache" -Force
Get-Process | Where-Object {...} | Stop-Process -Force
```

### 2. Khởi động lại Ganache fresh:
```powershell
Start-Process "Ganache.exe"
```

### 3. Đợi 10 giây để Ganache ready

---

## 🎯 KIỂM TRA:

1. ✅ Mở Ganache App
2. ✅ Check port 7545 (hoặc 7545)
3. ✅ Xem có network đang chạy không
4. ✅ Refresh browser
5. ✅ Thử toggle collateral lại

---

## 🔧 NẾU VẪN LỖI:

**Option 1: Restart Ganache manually**
1. Close Ganache app
2. Open Ganache lại
3. Create/load workspace
4. Start network

**Option 2: Check contract address**
```javascript
// File: src/addresses.js
export const LendingPoolAddress = "0x173411c68bD934fb1c00A447Bf6266d40Fb3d107";
```

**Option 3: Re-deploy contract**
```bash
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

---

**Đã thực hiện!**



