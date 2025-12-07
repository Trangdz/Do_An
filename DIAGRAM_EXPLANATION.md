# 📊 Giải Thích Sơ Đồ Kiến Trúc

## 🔍 Các Điểm Chưa Đúng Trong Sơ Đồ Cũ

### **1. ❌ Thiếu: Frontend Gọi RPC Trực Tiếp**

**Sơ Đồ Cũ:**
- Frontend chỉ gọi Backend API
- Không thể hiện Frontend có thể gọi RPC trực tiếp

**Thực Tế:**
```javascript
// Frontend gọi RPC TRỰC TIẾP
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const data = await pool.getAccountData(userAddress);
```

**✅ Sửa:**
- Thêm arrow: `Frontend → Read RPC → RPC Node`

---

### **2. ❌ Không Rõ: Indexer Tách Biệt**

**Sơ Đồ Cũ:**
- Indexer ẩn trong "Backend (Next.js Routes / Services)"
- Không rõ Indexer là service riêng

**Thực Tế:**
```javascript
// indexer/index.js - Chạy riêng biệt
this.provider.on('block', async (blockNumber) => {
  await this.indexBlock(blockNumber);
});
```

**✅ Sửa:**
- Tách Indexer thành component riêng
- Thêm arrow: `Indexer → Subscribe Events → RPC Node`

---

### **3. ❌ Không Rõ: 2 Flow Đọc Data**

**Sơ Đồ Cũ:**
- Chỉ thể hiện 1 flow: Frontend → Backend → MongoDB

**Thực Tế:**
```
Flow 1: Frontend → RPC Node (trực tiếp, chính xác)
Flow 2: Frontend → Backend API → MongoDB (nhanh, cached)
```

**✅ Sửa:**
- Thể hiện cả 2 flows song song

---

### **4. ❌ Thiếu: Wallet Đọc RPC**

**Sơ Đồ Cũ:**
- Wallet chỉ gửi signed transactions

**Thực Tế:**
- Wallet cũng đọc RPC để query state

**✅ Sửa:**
- Thêm arrow: `Wallet → Read RPC → RPC Node`

---

## ✅ Sơ Đồ Chuẩn Chỉ

### **Mermaid Code (Full):**

Xem file `ARCHITECTURE_DIAGRAM.mmd`

### **Mermaid Code (Simple):**

Xem file `SIMPLE_ARCHITECTURE_DIAGRAM.mmd`

---

## 📝 Flow Chi Tiết

### **Flow 1: User Đọc Data**

```
User muốn xem positions
    ↓
Frontend có 2 options:
    ↓
┌─────────────────┬─────────────────┐
│ Option A: API   │ Option B: RPC    │
│ (Nhanh, cached) │ (Chậm, chính xác)│
└─────────────────┴─────────────────┘
    ↓                    ↓
Backend API          RPC Node
    ↓                    ↓
MongoDB            LendingPool
    ↓                    ↓
Return cached      Return on-chain
```

---

### **Flow 2: User Thực Hiện Transaction**

```
User click "Supply"
    ↓
Frontend gọi supply()
    ↓
Wallet (MetaMask) ký transaction
    ↓
Wallet → Signed TX → RPC Node
    ↓
RPC Node → LendingPool
    ↓
LendingPool execute
    ↓
Emit Event: Supplied
    ↓
Indexer bắt event
    ↓
Indexer → Store → MongoDB
    ↓
Frontend refresh data
```

---

### **Flow 3: Indexer Sync Data**

```
Indexer chạy real-time
    ↓
Subscribe events từ RPC Node
    ↓
Khi có event:
  - Parse data
  - Store vào MongoDB
  - Update user positions
    ↓
Frontend có thể query từ MongoDB (nhanh)
```

---

## 🎯 Điểm Quan Trọng

1. ✅ **Frontend gọi RPC trực tiếp** (không chỉ qua Backend)
2. ✅ **Indexer tách biệt** (service riêng, real-time)
3. ✅ **2 flow song song**: RPC (chính xác) và API (nhanh)
4. ✅ **Wallet có 2 chức năng**: Transactions và Read RPC

---

**Sơ đồ chuẩn phản ánh đúng logic và luồng thực tế!** ✅






