# Phân Biệt: Read Operations vs Write Operations (Transactions)

## 🤔 Câu Hỏi: Tại Sao Có Mâu Thuẫn?

Bạn đúng khi chỉ ra mâu thuẫn! Tôi cần làm rõ:

- **Read Operations** (đọc data) → **NÊN** qua Backend API
- **Write Operations** (transactions) → **PHẢI** ở Frontend (cần MetaMask)

## 📊 So Sánh Chi Tiết

### **1. READ Operations (Đọc Data)**

#### **❌ Cách SAI (Hiện Tại):**

```typescript
// Frontend gọi RPC trực tiếp
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const balance = await rpcProvider.getBalance(userAddress);
```

**Vấn đề:**
- RPC URL bị expose ra client
- Không có rate limiting
- Không có caching
- Vi phạm best practice Next.js

#### **✅ Cách ĐÚNG (Nên Làm):**

```typescript
// Frontend gọi Backend API
const response = await fetch(`/api/balance/${userAddress}`);
const data = await response.json();
const balance = data.balance;
```

```typescript
// Backend API (server-side) gọi RPC
// app/api/balance/[user]/route.ts
export async function GET(request, { params }) {
  const provider = new ethers.JsonRpcProvider(RPC_URL); // Server-side
  const balance = await provider.getBalance(userAddress);
  return NextResponse.json({ balance });
}
```

**Lợi ích:**
- RPC URL không expose ra client
- Có thể cache responses
- Có thể rate limiting
- Tuân thủ Next.js best practice

### **2. WRITE Operations (Transactions)**

#### **✅ Cách ĐÚNG (PHẢI Ở Frontend):**

```typescript
// Frontend gọi trực tiếp (cần MetaMask)
const signer = await provider.getSigner(); // MetaMask signer
const tx = await poolContract.lend(tokenAddress, amount);
```

**Lý do:**
- Cần MetaMask signer (chỉ có ở browser)
- Cần private key để ký transaction (chỉ có ở MetaMask)
- User phải approve transaction (chỉ có ở browser)

#### **❌ Cách SAI (Không Thể Làm):**

```typescript
// Backend API không thể ký transaction
// app/api/lend/route.ts
export async function POST(request) {
  // ❌ LỖI: Server không có MetaMask
  const signer = await provider.getSigner(); // undefined
  
  // ❌ LỖI: Server không có private key của user
  const tx = await poolContract.lend(...); // Không thể ký
}
```

**Vấn đề:**
- Server không có MetaMask
- Server không có private key của user
- Không thể ký transaction ở server

## 🎯 Tóm Tắt

### **READ Operations:**

| Aspect | Frontend → RPC (SAI) | Frontend → Backend → RPC (ĐÚNG) |
|--------|---------------------|----------------------------------|
| **Có thể làm?** | ✅ Có thể | ✅ Có thể |
| **Nên làm?** | ❌ Không nên | ✅ Nên |
| **Lý do** | Expose RPC URL, không có cache | Bảo mật, cache, rate limit |

### **WRITE Operations (Transactions):**

| Aspect | Frontend → RPC (ĐÚNG) | Frontend → Backend → RPC (SAI) |
|--------|----------------------|--------------------------------|
| **Có thể làm?** | ✅ Có thể | ❌ Không thể |
| **Nên làm?** | ✅ Phải | ❌ Không thể |
| **Lý do** | Cần MetaMask, private key | Server không có MetaMask |

## 📋 Code Thực Tế

### **READ Operations - Cần Sửa:**

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

```javascript
// ❌ SAI: Gọi RPC trực tiếp từ Frontend
const getUserAssets = async () => {
  const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const balance = await rpcProvider.getBalance(userAddress);
  // ...
};
```

**Nên sửa thành:**

```javascript
// ✅ ĐÚNG: Gọi Backend API
const getUserAssets = async () => {
  const response = await fetch(`/api/balance/${userAddress}`);
  const data = await response.json();
  const balance = data.balance;
  // ...
};
```

### **WRITE Operations - Đúng Rồi:**

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
// ✅ ĐÚNG: Transactions ở Frontend (cần MetaMask)
export async function lend(signer: ethers.Signer, tokenAddress: string, amount: bigint) {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  const txPromise = poolContract.lend(tokenAddress, amount);
  return await sendWithToast(txPromise, {...});
}
```

**Đúng vì:**
- Cần `signer` (MetaMask signer)
- User phải approve transaction
- Private key chỉ có ở browser

## 🔄 Luồng Đúng

### **READ Operations:**

```
Frontend (Browser)
  ↓ fetch('/api/balance/0x...')
Backend API (Server)
  ↓ new ethers.JsonRpcProvider(RPC_URL)
RPC Node
  ↓
Smart Contract (view function)
  ↓
Trả về data
```

### **WRITE Operations (Transactions):**

```
Frontend (Browser)
  ↓
MetaMask Signer (ký transaction)
  ↓ (TRỰC TIẾP, KHÔNG QUA BACKEND)
RPC Node
  ↓
Smart Contract (state-changing function)
  ↓
Transaction được ghi vào blockchain
```

## ⚠️ Lưu Ý Quan Trọng

### **1. READ Operations:**

- ✅ **Có thể** gọi RPC trực tiếp từ Frontend (nhưng không nên)
- ✅ **Nên** gọi qua Backend API (bảo mật, cache, rate limit)

### **2. WRITE Operations (Transactions):**

- ✅ **PHẢI** gọi RPC trực tiếp từ Frontend (cần MetaMask)
- ❌ **KHÔNG THỂ** gọi qua Backend API (server không có MetaMask)

## 🎯 Kết Luận

### **Tại Sao Có "Mâu Thuẫn":**

1. **Read Operations:**
   - Tôi nói "nên qua Backend API" → **ĐÚNG**
   - Nhưng code hiện tại gọi trực tiếp → **CẦN SỬA**

2. **Write Operations (Transactions):**
   - Tôi nói "phải ở Frontend" → **ĐÚNG**
   - Code hiện tại đã đúng → **KHÔNG CẦN SỬA**

### **Tóm Tắt:**

- ✅ **Read Operations** → Nên qua Backend API (hiện tại đang gọi trực tiếp, cần sửa)
- ✅ **Write Operations** → Phải ở Frontend (đã đúng, không cần sửa)

**Cảm ơn bạn đã chỉ ra mâu thuẫn! Tôi đã làm rõ sự khác biệt giữa read và write operations.**





