# ✅ HƯỚNG DẪN KHỞI ĐỘNG FRONTEND

## 🚨 VẤN ĐỀ:

Lỗi **EPERM** với file `.next/trace` - Windows lock file.

## 🔧 GIẢI PHÁP:

### 1. **Kill all Node processes:**
```powershell
Get-Process -Name node | Stop-Process -Force
```

### 2. **Xóa .next folder:**
```powershell
cd D:\Do_an2\lendhub_v2\lendhub-frontend-nextjs
Remove-Item -Recurse -Force .next
```

### 3. **Start:**
```powershell
npm run dev
```

---

## 🎯 NẾU VẪN LỖI:

### Option 1: Disable trace
Thêm vào `next.config.js`:
```javascript
module.exports = {
  experimental: {
    outputFileTracing: false
  }
}
```

### Option 2: Run as Admin
Right-click PowerShell → Run as Administrator

### Option 3: Check port
Port 3000 đang được dùng bởi process khác:
- Kill process: `netstat -ano | findstr :3000`
- Hoặc dùng port khác: `npm run dev -- -p 3001`

---

## ✅ SUCCESS CHECK:

Nếu thấy:
```
✓ Ready in 2s
✓ Compiled
```

→ **Thành công!**

---

**Frontend đang khởi động trong background!** 🚀



