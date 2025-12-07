# 🤔 Tại Sao Next.js Lại Gọi RPC Ở Frontend?

## 📋 Hiểu Về Next.js

Next.js có **2 môi trường chạy code**:

### **1. Server-Side (Backend)**
- Chạy trên server (Node.js)
- Có thể gọi RPC từ server
- Không có access đến browser APIs (MetaMask, localStorage, etc.)

### **2. Client-Side (Frontend/Browser)**
- Chạy trong browser
- Có access đến MetaMask, localStorage
- User có thể tương tác trực tiếp

---

## 🔍 Code Hiện Tại Chạy Ở Đâu?

### **Client-Side (Browser):**

```javascript
// LendState.js - React Component
// Mặc định chạy ở CLIENT-SIDE (browser)
const LendState = (props) => {
  const [metamaskDetails, setMetamaskDetails] = useState({...});
  
  // Code này chạy trong BROWSER
  const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const accountData = await pool.getAccountData(userAddress);
}
```

**Tại sao chạy ở client-side?**
- ✅ Cần access MetaMask (chỉ có ở browser)
- ✅ Cần signer để ký transactions
- ✅ User tự control transactions (DeFi pattern)

---

## 🤷 Tại Sao Không Gọi Ở Server-Side?

### **Có thể làm, nhưng có vấn đề:**

#### **Option 1: Gọi RPC ở Server-Side (API Routes)**

```typescript
// app/api/account-data/route.ts (Server-Side)
export async function GET(request: Request) {
  // Chạy trên SERVER
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const pool = new ethers.Contract(POOL_ADDRESS, ABI, provider);
  const accountData = await pool.getAccountData(userAddress);
  
  return Response.json(accountData);
}
```

**Vấn đề:**
- ❌ Transactions cần MetaMask signer (chỉ có ở browser)
- ❌ User phải trust server
- ❌ Không đúng tinh thần DeFi (decentralized)

---

#### **Option 2: Gọi RPC ở Client-Side (Hiện Tại)**

```javascript
// LendState.js (Client-Side - Browser)
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const accountData = await pool.getAccountData(userAddress);
```

**Ưu điểm:**
- ✅ User tự control
- ✅ Không cần trust server
- ✅ Transactions qua MetaMask (browser)
- ✅ Đúng tinh thần DeFi

---

## 🎯 So Sánh

| Aspect | Server-Side | Client-Side (Hiện Tại) |
|--------|------------|------------------------|
| **Read Data** | ✅ Có thể | ✅ Có thể |
| **Write Transactions** | ❌ Cần private key | ✅ Dùng MetaMask |
| **User Trust** | ❌ Phải trust server | ✅ Không cần trust |
| **DeFi Pattern** | ❌ Centralized | ✅ Decentralized |
| **MetaMask** | ❌ Không có | ✅ Có |

---

## 💡 Tại Sao Next.js Vẫn Gọi Ở Frontend?

### **1. Transactions Cần MetaMask**

```javascript
// Transactions PHẢI chạy ở browser
const signer = await provider.getSigner(); // MetaMask signer
const tx = await poolContract.supply(amount); // Cần ký transaction
```

**MetaMask chỉ có ở browser, không có ở server!**

---

### **2. DeFi Pattern: User Tự Control**

```
✅ Đúng (Client-Side):
User → MetaMask → Blockchain
(User tự control, không qua server)

❌ Sai (Server-Side):
User → Server → Blockchain
(User phải trust server)
```

---

### **3. Không Cần Trust Server**

```
Client-Side:
- User gọi RPC trực tiếp
- User ký transaction trực tiếp
- Không cần trust server

Server-Side:
- User phải trust server
- Server có thể giả mạo data
- Không đúng tinh thần DeFi
```

---

## 🔄 Có Thể Kết Hợp Cả Hai

### **Hybrid Approach:**

```typescript
// Server-Side: Đọc data (không cần signer)
// app/api/positions/[user]/route.ts
export async function GET(request: Request) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const accountData = await pool.getAccountData(userAddress);
  return Response.json(accountData);
}

// Client-Side: Transactions (cần MetaMask)
// components/SupplyButton.tsx
const handleSupply = async () => {
  const signer = await provider.getSigner(); // MetaMask
  const tx = await poolContract.supply(amount);
};
```

**Khi nào dùng gì:**
- **Server-Side**: Đọc data, cache, API
- **Client-Side**: Transactions, user interactions

---

## 📊 Flow Thực Tế Trong Next.js

### **Hiện Tại (Client-Side):**

```
Browser (Client)
    ↓
React Component (LendState.js)
    ↓
Gọi RPC trực tiếp
    ↓
Blockchain
```

### **Nếu Dùng Server-Side:**

```
Browser (Client)
    ↓
Fetch API: /api/account-data
    ↓
Next.js API Route (Server)
    ↓
Gọi RPC từ server
    ↓
Blockchain
```

**Nhưng transactions vẫn phải ở client-side!**

---

## ✅ Kết Luận

**Tại sao Next.js gọi RPC ở frontend:**

1. ✅ **Transactions cần MetaMask** (chỉ có ở browser)
2. ✅ **DeFi pattern** (user tự control, không trust server)
3. ✅ **Đơn giản hơn** (không cần API layer cho mọi thứ)
4. ✅ **An toàn hơn** (không cần trust server)

**Có thể dùng server-side cho:**
- ✅ Đọc data (không cần signer)
- ✅ Cache/index data
- ✅ API endpoints

**Nhưng transactions PHẢI ở client-side!**

---

**Tóm lại: Next.js có thể chạy code ở cả server và client, nhưng DeFi transactions phải chạy ở client (browser) vì cần MetaMask.**






