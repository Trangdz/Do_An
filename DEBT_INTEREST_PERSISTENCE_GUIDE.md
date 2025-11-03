# 💰 HƯỚNG DẪN: LƯU TRỮ VÀ TÍNH LÃI LIÊN TỤC

## 🎯 Giải Pháp Hoàn Chỉnh

Hệ thống đã được implement để **tự động lưu trữ và tính lãi liên tục** cho tất cả user positions, kể cả khi tắt tab hoặc reload trang.

---

## 📋 Kiến Trúc Hệ Thống

### 1. **Interest Tracker Service** (Backend)
- **File:** `indexer/interest-tracker.cjs`
- **Chức năng:**
  - Tự động accrue interest trên smart contract
  - Tính toán debt/supply balance với lãi
  - Lưu snapshot vào MongoDB mỗi 1 phút
  - Track health factor và collateral ratios

### 2. **API Endpoint** (Frontend Backend)
- **File:** `lendhub-frontend-nextjs/src/app/api/positions/[user]/route.ts`
- **Chức năng:**
  - Cung cấp API để frontend lấy user positions
  - Kết nối MongoDB để query dữ liệu
  - Trả về debt/interest data format chuẩn

### 3. **Debt Persistence Library** (Frontend)
- **File:** `lendhub-frontend-nextjs/src/lib/debtPersistence.ts`
- **Chức năng:**
  - Load positions từ API hoặc localStorage cache
  - Tính toán real-time balance với client-side simulation
  - Cache dữ liệu để tăng tốc độ load

### 4. **React Hook** (Frontend)
- **File:** `lendhub-frontend-nextjs/src/hooks/useDebtPersistence.ts`
- **Chức năng:**
  - Quản lý state của user positions
  - Auto-refresh từ database mỗi 1 phút
  - Client-side simulation mỗi 1 giây cho real-time display

---

## 🚀 Cách Sử Dụng

### Bước 1: Cấu Hình Environment Variables

#### Backend (Interest Tracker)
File: `indexer/config.env`
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lendhub
RPC_URL=http://localhost:7545
LENDING_POOL_ADDRESS=0x...
ORACLE_ADDRESS=0x...
```

#### Frontend
File: `lendhub-frontend-nextjs/.env.local`
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lendhub
MONGODB_DB=lendhub
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Bước 2: Khởi Động Interest Tracker

```bash
cd indexer
npm run interest-tracker
```

Service sẽ:
- ✅ Kết nối MongoDB
- ✅ Tìm tất cả users có positions
- ✅ Accrue interest trên contract
- ✅ Tính toán và lưu positions mỗi 1 phút

### Bước 3: Sử Dụng trong Frontend Components

```typescript
import { useDebtPersistence } from '@/hooks/useDebtPersistence';

function MyComponent() {
  const { account } = useAccount(); // Từ wagmi hoặc ethers
  
  const {
    positionsData,
    isLoading,
    getRealtimeSupplyBalance,
    getRealtimeDebtBalance,
    refreshPositions
  } = useDebtPersistence({
    userAddress: account?.address || null,
    refreshInterval: 60000, // Refresh từ DB mỗi 1 phút
    realtimeUpdateInterval: 1000 // Client-side update mỗi 1 giây
  });

  // Get real-time balance cho một asset
  const wethBalance = getRealtimeSupplyBalance('0x92c2...');
  const usdcDebt = getRealtimeDebtBalance('0xf708...');

  return (
    <div>
      <p>Total Collateral: ${positionsData?.totalCollateralUSD || 0}</p>
      <p>Total Debt: ${positionsData?.totalDebtUSD || 0}</p>
      <p>Health Factor: {positionsData?.healthFactor || 0}</p>
      <button onClick={refreshPositions}>Refresh</button>
    </div>
  );
}
```

---

## 🔄 Luồng Hoạt Động

### 1. **Khi User Lend/Borrow**
```
User Transaction → Contract Event → Indexer Indexes → Interest Tracker Updates
```

### 2. **Interest Accrual**
```
Every 1 minute:
  1. Interest Tracker calls accruePublic() on contract
  2. Contract updates indexes (liquidityIndex, borrowIndex)
  3. Interest Tracker calculates current balances
  4. Save snapshot to MongoDB
```

### 3. **Frontend Load**
```
On Page Load:
  1. Check localStorage cache (5 min TTL)
  2. If stale/missing, fetch from API
  3. API queries MongoDB for latest snapshot
  4. Display data + client-side simulation

Every 1 second:
  1. Estimate current index using formula
  2. Calculate balance = principal × (estIndex / snapshotIndex)
  3. Update UI smoothly
```

### 4. **Khi Tắt Tab / Reload**
```
Page Close:
  - Data cached in localStorage
  
Page Reload:
  1. Load from cache (fast)
  2. Background fetch from API (latest)
  3. Update UI when API returns
```

---

## 📊 Database Schema

### Collection: `userPositions`

```javascript
{
  user: "0x1234...", // lowercase address
  positions: [
    {
      asset: "0x92c2...",
      supply: {
        principal: "1000000000000000000", // 1e18
        snapshotIndex: "1000000000000000000000000000", // 1e27
        currentIndex: "1000500000000000000000000000", // 1e27 (with interest)
        balance: "1000005000000000000", // principal + interest (1e18)
        interest: "500000000000", // accrued interest (1e18)
        rateAPY: 5.25,
        rateRayPerSec: "166229620000000", // RAY per second
        valueUSD: 2500,
        isCollateral: true
      },
      debt: {
        principal: "500000000000000000", // 0.5e18
        snapshotIndex: "1000000000000000000000000000",
        currentIndex: "1000300000000000000000000000",
        balance: "500000150000000000",
        interest: "150000000000",
        rateAPY: 3.5,
        rateRayPerSec: "110958413000000",
        valueUSD: 1250
      },
      reserve: {
        liquidityIndex: "1000500000000000000000000000",
        borrowIndex: "1000300000000000000000000000",
        lastUpdate: "1704067200", // Unix timestamp
        utilization: 0.5
      }
    }
  ],
  totalCollateralUSD: 2500,
  totalDebtUSD: 1250,
  healthFactor: 2.0,
  updatedAt: "2024-01-01T00:00:00Z",
  lastUpdateTimestamp: 1704067200
}
```

---

## 🔧 Công Thức Tính Lãi

### Smart Contract (mỗi giây)
```solidity
// Index update
newIndex = oldIndex × (1 + ratePerSec × timeDiff)
         = oldIndex × (1e27 + rateRayPerSec × seconds) / 1e27

// Balance calculation
currentBalance = principal × (currentIndex / snapshotIndex)
```

### Client-Side Estimation
```typescript
// Estimate index since last update
const timeDiff = currentTime - lastUpdateTimestamp;
const multiplier = 1e27 + (rateRayPerSec × timeDiff);
const estimatedIndex = (lastKnownIndex × multiplier) / 1e27;

// Calculate balance
const balance = (principal × estimatedIndex) / snapshotIndex;
```

---

## ✅ Features

- ✅ **Tự động lưu trữ** debt/interest vào MongoDB
- ✅ **Tính lãi liên tục** kể cả khi tắt tab
- ✅ **Real-time display** với client-side simulation
- ✅ **Cache mechanism** để tăng tốc độ
- ✅ **Health factor tracking** tự động
- ✅ **Multi-asset support** cho tất cả positions
- ✅ **Persistent across reloads** sử dụng localStorage + DB

---

## 🐛 Troubleshooting

### Interest Tracker không chạy
```bash
# Kiểm tra MongoDB connection
cd indexer
node -e "require('dotenv').config({path:'./config.env'}); console.log(process.env.MONGODB_URI)"

# Kiểm tra contract address
echo $LENDING_POOL_ADDRESS

# Restart tracker
npm run interest-tracker
```

### Frontend không load positions
```bash
# Kiểm tra API endpoint
curl http://localhost:3000/api/positions/0xYOUR_ADDRESS

# Kiểm tra MongoDB connection trong frontend
# File: .env.local
# MONGODB_URI=...

# Check browser console for errors
```

### Balance không đúng
1. Kiểm tra Interest Tracker có đang chạy không
2. Kiểm tra contract addresses có đúng không
3. Kiểm tra RPC URL có kết nối được không
4. Xem logs của Interest Tracker để debug

---

## 📝 Notes

- Interest Tracker chạy độc lập, có thể chạy trên server riêng
- Frontend tự động fallback về cache nếu API fail
- Client-side simulation chỉ là estimate, luôn sync với DB mỗi 1 phút
- Database indexes đã được tạo tự động để optimize queries

---

## 🎉 Kết Luận

Với hệ thống này, **lãi suất sẽ được tính liên tục và lưu trữ**, đảm bảo:
- User luôn thấy balance chính xác kể cả sau reload
- Lãi tiếp tục tích lũy kể cả khi tắt tab
- Data được persist và có thể query lại bất cứ lúc nào
- Performance tốt với caching và client-side simulation

