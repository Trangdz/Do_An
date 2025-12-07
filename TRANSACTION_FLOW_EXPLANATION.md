# Luồng Transaction: Gửi Trực Tiếp Đến RPC (KHÔNG Qua Backend)

## ✅ Câu Trả Lời: **GỬI TRỰC TIẾP ĐẾN RPC**

Khi thực hiện giao dịch (lend, borrow, withdraw, repay), transaction được gửi **TRỰC TIẾP** từ Frontend đến RPC, **KHÔNG QUA BACKEND**.

## 🔍 Phân Tích Code

### Code Hiện Tại:

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
export async function lend(
  signer: ethers.Signer,  // MetaMask signer
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // Tạo contract instance với signer (MetaMask)
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  // Gửi transaction TRỰC TIẾP đến RPC
  const txPromise = poolContract.lend(tokenAddress, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  }, toastCallback);
}
```

**Luồng thực tế:**
```
Frontend (Browser)
  ↓
MetaMask Signer (ký transaction)
  ↓
Gửi TRỰC TIẾP đến RPC
  ↓
Blockchain
```

## ❓ Tại Sao Transactions KHÔNG Qua Backend?

### 1. **Cần Private Key Để Ký Transaction**

Transactions phải được ký bằng **private key** của user:
- Private key chỉ có ở **MetaMask** (browser)
- Backend **KHÔNG THỂ** có private key của user
- Nếu backend có private key → **RẤT NGUY HIỂM** (centralized, có thể bị hack)

### 2. **MetaMask Xử Lý Signing**

```javascript
// User phải approve transaction trong MetaMask
const signer = await provider.getSigner(); // MetaMask signer
const tx = await contract.lend(tokenAddress, amount); // MetaMask sẽ popup để user ký
```

### 3. **Security Best Practice**

- **Private key** luôn ở client-side (MetaMask)
- **Backend** không bao giờ thấy private key
- User có **full control** về transactions của mình

## 📊 So Sánh: Read vs Write Operations

| Loại Operation | Luồng | Lý Do |
|----------------|-------|-------|
| **Read Operations** (đọc dữ liệu) | Frontend → Backend API → RPC | ✅ Có thể cache, rate limit, bảo mật RPC URL |
| **Write Operations** (transactions) | Frontend → RPC (trực tiếp) | ✅ Cần private key (chỉ có ở MetaMask) |

## 🔄 Luồng Chi Tiết

### Read Operations (Qua Backend):

```
Frontend
  ↓ fetch('/api/reserve/0x...')
Backend API Route
  ↓ new ethers.JsonRpcProvider(RPC_URL)
RPC Node
  ↓
Smart Contract (view function)
  ↓
Trả về dữ liệu
```

### Write Operations (Trực Tiếp RPC):

```
Frontend
  ↓
MetaMask Signer (ký transaction)
  ↓ (TRỰC TIẾP, KHÔNG QUA BACKEND)
RPC Node
  ↓
Smart Contract (state-changing function)
  ↓
Transaction được ghi vào blockchain
```

## 📋 Các API Routes Hiện Có

### ✅ API Routes (Chỉ Đọc):

- `/api/reserve/[asset]` - Đọc reserve data
- `/api/positions/[user]` - Đọc user positions
- `/api/transactions` - Đọc transaction history (từ MongoDB)
- `/api/analytics` - Analytics data
- `/api/snapshot/get` - Interest snapshots

### ❌ KHÔNG CÓ API Routes Cho Transactions:

- ❌ `/api/lend` - KHÔNG CÓ
- ❌ `/api/borrow` - KHÔNG CÓ
- ❌ `/api/withdraw` - KHÔNG CÓ
- ❌ `/api/repay` - KHÔNG CÓ

**Lý do:** Transactions phải được ký ở browser, không thể qua backend.

## ⚠️ Lưu Ý Quan Trọng

### 1. **Read Operations** → Qua Backend (Đúng)
- Đọc reserve data
- Đọc user positions
- Đọc transaction history
- Analytics

### 2. **Write Operations** → Trực Tiếp RPC (Đúng)
- Lend (supply)
- Borrow
- Withdraw
- Repay
- Approve tokens

### 3. **Ngoại Lệ: Chainlink Node**
- Chainlink node gửi transactions để update giá
- Chainlink node có private key riêng (không phải của user)
- Chainlink node gửi trực tiếp đến RPC (không qua Next.js backend)

## 🎯 Kết Luận

**Transactions (write operations) LUÔN gửi trực tiếp đến RPC từ browser, không qua backend.**

**Read operations** có thể qua backend để:
- Cache dữ liệu
- Rate limiting
- Bảo mật RPC URL
- Error handling tập trung

**Write operations** phải trực tiếp vì:
- Cần private key (chỉ có ở MetaMask)
- User phải approve transaction
- Security best practice





