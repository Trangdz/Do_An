# 🚀 HƯỚNG DẪN KHỞI ĐỘNG GANACHE

## ✅ ĐÃ XỬ LÝ:

1. ✅ Đã dừng tất cả Ganache processes (6 instances)
2. ✅ Đã dừng tất cả Node.js processes
3. ✅ Cải thiện error handling cho toggle collateral

---

## 🎯 BƯỚC TIẾP THEO:

### 1. Mở Ganache App:

**Cách 1: Desktop App**
- Windows: Nhấn Windows + Ganache
- Hoặc: Start menu → Tìm "Ganache"

**Cách 2: Command Line**
```bash
# Tìm Ganache.exe
where Ganache
# Hoặc
Get-Process Ganache
```

---

### 2. Khởi động Ganache Network:

1. Mở Ganache app
2. Click "New Workspace" hoặc "Load Workspace"
3. Settings:
   - **Hostname:** 127.0.0.1
   - **Port:** 7545 (hoặc 8545)
   - **Network ID:** 1337
   - **Block Time:** 0
   - **Gas Limit:** 6721975
   - **Gas Price:** 20000000000
4. Click **"Start"**

---

### 3. Check Ganache:

```powershell
# Check port
Test-NetConnection -ComputerName localhost -Port 7545
# Should return: True
```

---

### 4. Start Frontend:

```bash
cd D:\Do_an2\lendhub_v2\lendhub-frontend-nextjs
npm run dev
# Hoặc
npx next dev
```

---

### 5. Mở Browser:

**URL:** http://localhost:3000

---

## ❌ NẾU VẪN LỖI:

### Check 1: Ganache đang chạy?
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*Ganache*"}
```

### Check 2: Port 7545 đang listen?
```powershell
netstat -ano | findstr :7545
```

### Check 3: Contract đã deploy?
```bash
# Check addresses.js
cat lendhub-frontend-nextjs/src/addresses.js

# Contract address phải match với Ganache
```

### Check 4: Network ID đúng chưa?
```javascript
// File: hardhat.config.cjs
ganache: {
  url: "http://127.0.0.1:7545",
  chainId: 1337,  // ← Phải match với Ganache
}
```

---

## 🔧 REDEPLOY CONTRACT (Nếu cần):

```bash
# Terminal 1: Ganache running

# Terminal 2:
cd D:\Do_an2\lendhub_v2
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache

# Copy contract addresses vào addresses.js
```

---

**Hoàn thành!** Hãy mở Ganache và start network! 🚀

