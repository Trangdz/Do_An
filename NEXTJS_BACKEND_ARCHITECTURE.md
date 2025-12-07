# Kiến Trúc Next.js: Tất Cả RPC Phải Qua Backend

## ✅ Kiến Trúc Đúng

Trong Next.js, **TẤT CẢ** RPC calls phải đi qua **Next.js API Routes** (server-side), không gọi trực tiếp từ browser.

### Luồng Đúng:

```
Frontend (Browser) 
  ↓
Next.js API Routes (/api/*) - Server-side
  ↓
RPC Node (Blockchain)
```

## 🔍 Phân Tích Code Hiện Tại

### ❌ Code SAI (Cần Sửa):

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

```javascript
// ❌ SAI: Gọi RPC trực tiếp từ browser (client-side)
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const bal = await rpcProvider.getBalance(metamaskDetails.currentAccount);
```

**Vấn đề:**
- Code này chạy ở **browser** (client-side)
- RPC URL bị expose ra client
- Không có rate limiting, caching, error handling tập trung
- Vi phạm best practice của Next.js

### ✅ Code ĐÚNG (Đã Có):

**File: `lendhub-frontend-nextjs/src/app/api/reserve/[asset]/route.ts`**

```typescript
// ✅ ĐÚNG: API route (server-side) gọi RPC
export async function GET(request: NextRequest, { params }) {
  const provider = new ethers.JsonRpcProvider(RPC_URL); // Server-side
  const pool = new ethers.Contract(POOL_ADDRESS, RESERVE_ABI, provider);
  const reserve = await pool.reserves(assetAddress);
  return NextResponse.json({ ... });
}
```

**Đúng vì:**
- Code chạy ở **server** (Next.js API route)
- RPC URL không expose ra client
- Có thể thêm caching, rate limiting, error handling

## 📋 Các API Routes Hiện Có

### ✅ Đã Đúng (Server-side RPC):

1. **`/api/reserve/[asset]`** - Đọc reserve data từ blockchain
2. **`/api/positions/[user]`** - Đọc positions từ MongoDB (có thể cần verify với blockchain)
3. **`/api/transactions`** - Đọc transaction history từ MongoDB
4. **`/api/analytics`** - Analytics từ MongoDB
5. **`/api/snapshot/get`** - Interest snapshots từ MongoDB

### ❌ Cần Sửa (Client-side RPC):

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

Các hàm đang gọi RPC trực tiếp:
- `getUserAssets()` - Line 314
- `getPriceUSD()` - Line 434
- `getAccountData()` - Line 611
- `getUserReserves()` - Line 682
- `getReserveData()` - Line 710
- `getUserBorrows()` - Line 826
- `getUserSupplies()` - Line 924
- `getMaxBorrow()` - Line 1069

## 🔄 Cách Sửa

### Bước 1: Tạo API Routes Mới

Tạo các API routes để thay thế direct RPC calls:

```
/api/balance/[user]          - Get user balances
/api/account-data/[user]     - Get account data (collateral, debt, health factor)
/api/user-reserves/[user]    - Get user reserves
/api/reserve-data/[asset]    - Get reserve data (đã có /api/reserve/[asset])
/api/user-borrows/[user]     - Get user borrows
/api/user-supplies/[user]    - Get user supplies
/api/max-borrow/[user]       - Get max borrow amount
/api/price/[token]           - Get token price (đã có logic trong getPriceUSD)
```

### Bước 2: Refactor Frontend

Thay thế direct RPC calls bằng API calls:

```javascript
// ❌ TRƯỚC (SAI):
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const bal = await rpcProvider.getBalance(user);

// ✅ SAU (ĐÚNG):
const response = await fetch(`/api/balance/${user}`);
const data = await response.json();
const bal = data.balance;
```

## 🎯 Lợi Ích

1. **Bảo mật**: RPC URL không expose ra client
2. **Rate Limiting**: Có thể thêm rate limiting ở server
3. **Caching**: Có thể cache responses ở server
4. **Error Handling**: Xử lý lỗi tập trung
5. **Monitoring**: Dễ dàng monitor và log
6. **Best Practice**: Tuân thủ Next.js architecture

## ⚠️ Ngoại Lệ: MetaMask Transactions

**Transactions** (write operations) vẫn phải qua MetaMask ở browser:

```javascript
// ✅ ĐÚNG: Transactions qua MetaMask (browser)
const signer = await provider.getSigner();
const tx = await contract.lend(tokenAddress, amount, { signer });
```

**Lý do:**
- Cần user ký transaction bằng private key
- Private key chỉ có ở browser (MetaMask)
- Không thể ký transaction ở server

## 📊 Diagram Cập Nhật

Xem file `SIMPLE_ARCHITECTURE_DIAGRAM.mmd` đã được cập nhật.






