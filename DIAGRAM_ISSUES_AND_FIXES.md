# 🔍 Phân Tích Sơ Đồ: Chỗ Nào Chưa Đúng?

## ❌ Các Vấn Đề Trong Sơ Đồ Cũ

### **1. Thiếu: Frontend Gọi RPC Trực Tiếp**

**Sơ Đồ Cũ:**
```
Frontend → Backend API → RPC Node
```

**Thực Tế:**
```
Frontend → RPC Node (TRỰC TIẾP)
Frontend → Backend API (Optional - Cache)
```

**Bằng Chứng:**
```javascript
// LendState.js - Frontend gọi RPC trực tiếp
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const accountData = await pool.getAccountData(userAddress);
```

**Vấn Đề:**
- ❌ Sơ đồ cũ không thể hiện Frontend có thể gọi RPC trực tiếp
- ✅ Thực tế Frontend gọi RPC trực tiếp cho mọi read operations

---

### **2. Không Rõ: Indexer Tách Biệt**

**Sơ Đồ Cũ:**
```
Backend (Next.js Routes / Services)
  - Có thể có indexer bên trong
```

**Thực Tế:**
```
Backend API (Next.js Routes)
  ↓
Indexer/Workers (Tách biệt)
  - Subscribe events real-time
  - Lưu vào MongoDB
```

**Bằng Chứng:**
```javascript
// indexer/index.js - Chạy riêng biệt
this.provider.on('block', async (blockNumber) => {
  await this.indexBlock(blockNumber);
});
```

**Vấn Đề:**
- ❌ Sơ đồ cũ không tách biệt Indexer
- ✅ Thực tế Indexer là service riêng, chạy real-time

---

### **3. Không Rõ: Flow Đọc Data**

**Sơ Đồ Cũ:**
```
Frontend → Backend → MongoDB
```

**Thực Tế:**
```
Frontend có 2 options:
  1. Gọi RPC trực tiếp (chính xác, chậm)
  2. Gọi Backend API (nhanh, có thể stale)
```

**Bằng Chứng:**
```javascript
// Option 1: RPC trực tiếp
const provider = new ethers.JsonRpcProvider(RPC_URL);
const data = await pool.getAccountData(user);

// Option 2: API (cached)
const response = await fetch('/api/positions/user');
const data = await response.json();
```

**Vấn Đề:**
- ❌ Sơ đồ cũ chỉ thể hiện 1 flow
- ✅ Thực tế có 2 flow song song

---

### **4. Thiếu: Wallet Đọc RPC**

**Sơ Đồ Cũ:**
```
Wallet → Signed TX → RPC Node
```

**Thực Tế:**
```
Wallet → Signed TX → RPC Node (Transactions)
Wallet → Read RPC → RPC Node (Query state)
```

**Vấn Đề:**
- ❌ Sơ đồ cũ chỉ thể hiện transactions
- ✅ Wallet cũng đọc RPC để query state

---

## ✅ Sơ Đồ Chuẩn Chỉ

### **Điểm Quan Trọng:**

1. ✅ **Frontend gọi RPC trực tiếp** (không chỉ qua Backend)
2. ✅ **Indexer tách biệt** (service riêng, real-time)
3. ✅ **2 flow đọc data**: RPC trực tiếp hoặc API cache
4. ✅ **Wallet có 2 chức năng**: Transactions và Read RPC

---

## 📊 So Sánh

| Aspect | Sơ Đồ Cũ | Sơ Đồ Chuẩn |
|--------|----------|-------------|
| Frontend → RPC | ❌ Không có | ✅ Có (trực tiếp) |
| Indexer | ❌ Ẩn trong Backend | ✅ Tách riêng |
| Flow đọc data | ❌ 1 flow | ✅ 2 flows |
| Wallet Read RPC | ❌ Không có | ✅ Có |
| Cache layer | ❌ Không rõ | ✅ MongoDB rõ ràng |

---

## 🎯 Kết Luận

**Sơ đồ cũ thiếu:**
1. Frontend gọi RPC trực tiếp
2. Indexer tách biệt
3. 2 flow đọc data song song
4. Wallet đọc RPC

**Sơ đồ chuẩn đã bổ sung đầy đủ!** ✅






