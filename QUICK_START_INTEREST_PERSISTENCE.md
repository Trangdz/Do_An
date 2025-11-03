# 🚀 QUICK START: Interest Persistence System

## ⚡ Tóm Tắt

Hệ thống tự động **lưu trữ và tính lãi liên tục** cho tất cả user positions, kể cả khi tắt tab hoặc reload.

---

## 📦 Setup Nhanh

### 1. Cài Đặt Dependencies (nếu chưa có)

```bash
# Frontend đã có mongodb
cd lendhub-frontend-nextjs
npm install

# Indexer
cd ../indexer
npm install
```

### 2. Cấu Hình Environment

**File: `indexer/config.env`**
```env
MONGODB_URI=mongodb+srv://...
RPC_URL=http://localhost:7545
LENDING_POOL_ADDRESS=0x...
ORACLE_ADDRESS=0x...
```

**File: `lendhub-frontend-nextjs/.env.local`**
```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=lendhub
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Chạy Services

**Terminal 1: Interest Tracker** (Backend Service)
```bash
cd indexer
npm run interest-tracker
```

**Terminal 2: Frontend**
```bash
cd lendhub-frontend-nextjs
npm run dev
```

---

## ✅ Sử Dụng trong Code

```typescript
import { useDebtPersistence } from '@/hooks/useDebtPersistence';

function MyComponent() {
  const { account } = useAccount();
  
  const {
    positionsData,
    isLoading,
    getRealtimeSupplyBalance,
    getRealtimeDebtBalance
  } = useDebtPersistence({
    userAddress: account?.address || null
  });

  const balance = getRealtimeSupplyBalance('0x92c2...'); // WETH
  const debt = getRealtimeDebtBalance('0xf708...'); // USDC

  return <div>Balance: {ethers.formatEther(balance)}</div>;
}
```

---

## 🧪 Test

```bash
node test-interest-persistence.cjs
```

---

## 📖 Chi Tiết

Xem file `DEBT_INTEREST_PERSISTENCE_GUIDE.md` để biết chi tiết đầy đủ.

---

## ✨ Features

- ✅ Tự động lưu debt/interest vào MongoDB
- ✅ Tính lãi liên tục (kể cả khi tắt tab)
- ✅ Real-time display với client-side simulation
- ✅ Cache mechanism để tăng tốc
- ✅ Persistent across reloads

