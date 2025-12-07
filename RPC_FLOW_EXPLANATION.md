# 🔄 Flow RPC Calls - Giải Thích Đơn Giản

## ❌ KHÔNG: RPC Calls KHÔNG Qua Backend

### **Flow Thực Tế:**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  (Browser - Next.js Client Component)                  │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Gọi TRỰC TIẾP
                    │
                    ▼
        ┌───────────────────────────┐
        │   RPC Node                │
        │   (http://127.0.0.1:7545)│
        └───────────────────────────┘
                    │
                    │
                    ▼
        ┌───────────────────────────┐
        │   Blockchain              │
        │   (Smart Contracts)       │
        └───────────────────────────┘
```

## 📊 Chi Tiết Từng Loại

### **1. READ Operations (Đọc Data)**

**Flow:**
```
Frontend → RPC Node → Blockchain
```

**Code thực tế:**
```javascript
// Trong LendState.js (dòng 314)
// ALWAYS use direct RPC provider for read operations
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const pool = new ethers.Contract(LendingPoolAddress, ABI, rpcProvider);

// Gọi trực tiếp, KHÔNG qua backend
const accountData = await pool.getAccountData(userAddress);
```

**Ví dụ:**
- Đọc balance: `getTokenBalance()` → Gọi RPC trực tiếp
- Đọc positions: `getAccountData()` → Gọi RPC trực tiếp
- Đọc prices: `oracle.getAssetPrice1e18()` → Gọi RPC trực tiếp

---

### **2. WRITE Operations (Giao Dịch)**

**Flow:**
```
Frontend → MetaMask Signer → RPC Node → Blockchain
```

**Code thực tế:**
```javascript
// Trong tx.ts
const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);

// Gửi transaction trực tiếp, KHÔNG qua backend
const tx = await poolContract.supply(tokenAddress, amount);
await tx.wait();
```

**Ví dụ:**
- Supply: `lend()` → Gửi trực tiếp qua MetaMask
- Withdraw: `withdraw()` → Gửi trực tiếp qua MetaMask
- Borrow: `borrow()` → Gửi trực tiếp qua MetaMask

---

### **3. Backend API (Chỉ Để Hỗ Trợ)**

**Backend KHÔNG phải proxy cho RPC:**

```javascript
// API route: /api/reserve/[asset]/route.ts
// Ngay cả API này cũng gọi RPC trực tiếp!
const provider = new ethers.JsonRpcProvider(RPC_URL);
const pool = new ethers.Contract(POOL_ADDRESS, RESERVE_ABI, provider);
const reserve = await pool.reserves(assetAddress); // Gọi RPC trực tiếp
```

**Backend chỉ dùng để:**
- ✅ Lưu trữ data đã index (MongoDB)
- ✅ Cung cấp API để query nhanh hơn
- ✅ Xử lý business logic phức tạp
- ❌ KHÔNG phải proxy cho RPC calls

---

## 🎯 So Sánh

### **❌ KHÔNG Phải Như Này:**

```
Frontend → Backend API → RPC Node → Blockchain
```

### **✅ Thực Tế Là:**

```
Frontend → RPC Node → Blockchain
         ↓
    (Optional) Backend API
    (Chỉ để cache/index data)
```

---

## 📝 Ví Dụ Cụ Thể

### **Ví Dụ 1: User Xem Balance**

```
1. User click "View Balance"
   ↓
2. Frontend code:
   const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
   const balance = await provider.getBalance(userAddress);
   ↓
3. Gọi TRỰC TIẾP RPC node
   ↓
4. RPC node query blockchain
   ↓
5. Return balance về frontend
```

**KHÔNG qua backend!**

---

### **Ví Dụ 2: User Supply Tokens**

```
1. User click "Supply"
   ↓
2. Frontend code:
   const signer = await provider.getSigner();
   const tx = await poolContract.supply(tokenAddress, amount);
   ↓
3. MetaMask ký transaction
   ↓
4. Gửi TRỰC TIẾP lên blockchain qua RPC
   ↓
5. Transaction được ghi vào blockchain
```

**KHÔNG qua backend!**

---

### **Ví Dụ 3: API Route (Nếu Có)**

```
1. Frontend gọi: GET /api/reserve/USDC
   ↓
2. Backend code:
   const provider = new ethers.JsonRpcProvider(RPC_URL);
   const reserve = await pool.reserves(assetAddress);
   ↓
3. Backend cũng gọi RPC TRỰC TIẾP!
   ↓
4. Backend return data về frontend
```

**Backend chỉ là wrapper, vẫn gọi RPC trực tiếp!**

---

## 🔍 Bằng Chứng Từ Code

### **1. Read Operations:**

```javascript
// LendState.js - dòng 314
// ALWAYS use direct RPC provider for read operations
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const useProvider = rpcProvider; // Force RPC for reads
```

**Comment rõ ràng: "ALWAYS use direct RPC"**

---

### **2. Write Operations:**

```javascript
// tx.ts - dòng 474
const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
const txPromise = poolContract.lend(tokenAddress, amount);
// Gửi trực tiếp qua signer (MetaMask)
```

**Không có API call nào!**

---

### **3. API Route (Nếu Có):**

```javascript
// /api/reserve/[asset]/route.ts - dòng 45
const provider = new ethers.JsonRpcProvider(RPC_URL);
const pool = new ethers.Contract(POOL_ADDRESS, RESERVE_ABI, provider);
const reserve = await pool.reserves(assetAddress);
```

**API cũng gọi RPC trực tiếp, không phải proxy!**

---

## ✅ Kết Luận

**RPC Calls:**
- ✅ Frontend gọi TRỰC TIẾP RPC node
- ✅ KHÔNG qua backend
- ✅ Backend chỉ để cache/index data
- ✅ Backend KHÔNG phải proxy cho RPC

**Lý do:**
- ⚡ Nhanh hơn (không qua layer trung gian)
- 🔒 An toàn hơn (không cần trust backend)
- 🎯 Đúng với kiến trúc DeFi (decentralized)

---

**Tóm lại: Frontend ↔ RPC Node ↔ Blockchain (trực tiếp, không qua backend)**






