# 🔧 Backend Trong Dự Án Này Làm Gì?

## 📋 Tổng Quan

Backend trong dự án này **KHÔNG phải proxy cho RPC**, mà làm các việc sau:

1. ✅ **Cung cấp API endpoints** để frontend query data nhanh
2. ✅ **Đọc từ MongoDB** (cached/indexed data)
3. ✅ **Đọc từ blockchain** (một số endpoints đặc biệt)
4. ✅ **Xử lý business logic** (tính toán, aggregation)

---

## 🎯 Các API Endpoints

### **1. `/api/positions/[user]` - User Positions**

**Chức năng:**
- Lấy user positions từ MongoDB
- Trả về cached data (nhanh)

**Code:**
```typescript
// Đọc từ MongoDB
const positions = await db.collection('userPositions').findOne({
  user: userAddress.toLowerCase()
});
```

**Làm gì:**
- ✅ Đọc từ MongoDB (cached data từ indexer)
- ❌ KHÔNG gọi blockchain (chỉ đọc cache)

---

### **2. `/api/reserve/[asset]` - Reserve Data**

**Chức năng:**
- Lấy reserve data (APR, utilization, etc.)
- Gọi blockchain trực tiếp

**Code:**
```typescript
// Gọi blockchain trực tiếp
const provider = new ethers.JsonRpcProvider(RPC_URL);
const pool = new ethers.Contract(POOL_ADDRESS, RESERVE_ABI, provider);
const reserve = await pool.reserves(assetAddress);
```

**Làm gì:**
- ✅ Gọi blockchain trực tiếp (không qua cache)
- ✅ Tính toán APR, utilization
- ✅ Trả về formatted data

---

### **3. `/api/transactions` - Transaction History**

**Chức năng:**
- Lấy transaction history từ MongoDB
- Hỗ trợ pagination, filtering

**Code:**
```javascript
// Đọc từ MongoDB
const transactions = await db.collection('transactions')
  .find(query)
  .sort({ timestamp: -1 })
  .skip(offset)
  .limit(limit)
  .toArray();
```

**Làm gì:**
- ✅ Đọc từ MongoDB (indexed transactions)
- ✅ Filter theo user, type
- ✅ Pagination support

---

### **4. `/api/analytics` - Analytics Data**

**Chức năng:**
- Tính toán analytics từ MongoDB
- Aggregation queries

**Code:**
```javascript
// Aggregation từ MongoDB
const transactionStats = await db.collection('transactions')
  .aggregate(pipeline)
  .toArray();
```

**Làm gì:**
- ✅ Tính toán stats (volume, users, assets)
- ✅ Daily/weekly/monthly analytics
- ✅ Top assets, top users

---

### **5. `/api/snapshot/get` - Interest Snapshots**

**Chức năng:**
- Lấy interest snapshots từ MongoDB
- Cached APR/APY data

**Code:**
```typescript
// Đọc từ MongoDB
const snapshot = await db.collection('interest_snapshots').findOne({
  pool: poolAddress,
  asset: assetAddress
});
```

**Làm gì:**
- ✅ Đọc cached snapshots
- ✅ Trả về APR/APY đã tính sẵn

---

### **6. `/api/snapshot/save` - Save Snapshots**

**Chức năng:**
- Lưu interest snapshots vào MongoDB
- Cache APR/APY calculations

**Code:**
```typescript
// Lưu vào MongoDB
await db.collection('interest_snapshots').updateOne(
  { pool, asset },
  { $set: snapshotData },
  { upsert: true }
);
```

**Làm gì:**
- ✅ Lưu calculated snapshots
- ✅ Cache để query nhanh

---

## 🔍 Backend KHÔNG Làm Gì?

### **❌ KHÔNG phải proxy cho RPC:**
```
❌ Frontend → Backend → RPC Node
```

### **✅ Thực tế:**
```
✅ Frontend → RPC Node (trực tiếp)
✅ Frontend → Backend API (optional cache)
```

---

## 📊 Tóm Tắt Chức Năng Backend

| Chức Năng | Mô Tả | Data Source |
|-----------|-------|-------------|
| **User Positions** | Lấy positions từ cache | MongoDB |
| **Reserve Data** | Lấy reserve data + tính APR | Blockchain (trực tiếp) |
| **Transaction History** | Lấy lịch sử giao dịch | MongoDB |
| **Analytics** | Tính toán stats | MongoDB (aggregation) |
| **Snapshots** | Lưu/lấy interest snapshots | MongoDB |

---

## 🎯 Backend Làm Gì?

### **1. Cung Cấp Cached Data (Nhanh)**
```
Frontend → Backend API → MongoDB
         (Nhanh, có thể stale)
```

### **2. Tính Toán Business Logic**
```
Backend nhận request
    ↓
Đọc từ MongoDB
    ↓
Tính toán (aggregation, stats)
    ↓
Return formatted data
```

### **3. Một Số Endpoints Gọi Blockchain**
```
Backend API → RPC Node → Blockchain
(Chỉ một số endpoints đặc biệt)
```

---

## ✅ Kết Luận

**Backend trong dự án này:**

1. ✅ **Cung cấp API** để frontend query data nhanh
2. ✅ **Đọc từ MongoDB** (cached/indexed data)
3. ✅ **Tính toán analytics** (aggregation)
4. ✅ **Cache snapshots** (APR/APY)
5. ❌ **KHÔNG phải proxy** cho mọi RPC calls
6. ❌ **KHÔNG xử lý transactions** (transactions qua MetaMask trực tiếp)

**Backend chỉ là helper layer để tối ưu hiệu năng, không phải bắt buộc!**






