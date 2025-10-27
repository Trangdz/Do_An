# Sơ đồ Tương tác Hệ thống LendHub v2 (Thực tế)

## Sơ đồ Tổng quan với Luồng Dữ liệu

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                LENDHUB v2                                      │
│                           Hệ thống Tương tác                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Next.js App   │  │   React UI      │  │   MetaMask      │              │
│  │                 │  │   Components    │  │   Wallet        │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Web3 Calls
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKCHAIN                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            SMART CONTRACTS                             │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │   │
│  │  │   LENDING POOL  │◄───┤  PRICE ORACLE   │    │ INTEREST RATE   │   │   │
│  │  │   (Pool chính)  │    │   (Simple)      │    │     MODEL       │   │   │
│  │  │                 │    │                 │    │                 │   │   │
│  │  │ lend()          │    │ getAssetPrice1e18│    │ getRates()      │   │   │
│  │  │ borrow()        │    │ setAssetPrice()  │    │                 │   │   │
│  │  │ repay()         │    │ (Manual only)   │    │                 │   │   │
│  │  │ liquidationCall │    │                 │    │                 │   │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘   │   │
│  │           │                       │                       │           │   │
│  │           │                       │                       │           │   │
│  │           ▼                       │                       ▼           │   │
│  │  ┌─────────────────┐              │              ┌─────────────────┐   │   │
│  │  │     TOKENS       │              │              │   LIBRARIES     │   │   │
│  │  │ (WETH/DAI/USDC)  │              │              │ (LendingMath)   │   │   │
│  │  │                 │              │              │                 │   │   │
│  │  │ transfer()      │              │              │ wadMul()        │   │   │
│  │  │ balanceOf()     │              │              │ rayMul()        │   │   │
│  │  └─────────────────┘              │              └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Events & Transactions
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            INDEXER SERVICE                             │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │  Event Listener │  │  Transaction    │  │   MongoDB       │       │   │
│  │  │                 │  │   Processor     │  │   Database      │       │   │
│  │  │ on('block')     │  │                 │  │                 │       │   │
│  │  │ queryFilter()   │  │ processTx()     │  │ collections:    │       │   │
│  │  └─────────────────┘  └─────────────────┘  │ - transactions  │       │   │
│  │                                             │ - users         │       │   │
│  │                                             │ - assets        │       │   │
│  │                                             │ - metadata      │       │   │
│  │                                             └─────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            PRICE SERVICES                               │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │   CoinGecko     │  │  Realtime Price │  │   Manual Price  │       │   │
│  │  │     API         │  │    Updater      │  │    Updates      │       │   │
│  │  │                 │  │                 │  │                 │       │   │
│  │  │ getPrice()      │  │ updatePrices()  │  │ setAssetPrice() │       │   │
│  │  │ (mỗi 10s)       │  │ (mỗi 10s)       │  │ (admin)         │       │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Luồng Tương tác Chi tiết

### **1. Luồng Gửi tiền (Lending)**

```
┌─────────────────┐
│      USER       │
└─────────┬───────┘
          │ 1. Click "Lend"
          ▼
┌─────────────────┐
│   Next.js App   │
└─────────┬───────┘
          │ 2. Call lend(asset, amount)
          ▼
┌─────────────────┐
│   MetaMask      │
└─────────┬───────┘
          │ 3. Sign transaction
          ▼
┌─────────────────┐
│   LENDING POOL  │
│                 │
│ lend() function │
└─────────┬───────┘
          │ 4. _accrue(asset)
          ▼
┌─────────────────┐
│ INTEREST RATE   │
│     MODEL       │
│                 │
│ getRates()      │
└─────────┬───────┘
          │ 5. Return rates
          ▼
┌─────────────────┐
│   LENDING POOL  │
│                 │
│ Transfer token  │
│ Update position │
└─────────┬───────┘
          │ 6. Emit Supplied event
          ▼
┌─────────────────┐
│  INDEXER        │
│                 │
│ Listen events   │
└─────────┬───────┘
          │ 7. Process event
          ▼
┌─────────────────┐
│    MONGODB      │
│                 │
│ Save transaction│
│ Update user stats│
└─────────────────┘
```

### **2. Luồng Vay tiền (Borrowing)**

```
┌─────────────────┐
│      USER       │
└─────────┬───────┘
          │ 1. Click "Borrow"
          ▼
┌─────────────────┐
│   Next.js App   │
└─────────┬───────┘
          │ 2. Call borrow(asset, amount)
          ▼
┌─────────────────┐
│   LENDING POOL  │
│                 │
│ borrow() function│
└─────────┬───────┘
          │ 3. _getAccountData(user)
          ▼
┌─────────────────┐
│  PRICE ORACLE   │
│                 │
│ getAssetPrice1e18│
└─────────┬───────┘
          │ 4. Return price
          ▼
┌─────────────────┐
│   LENDING POOL  │
│                 │
│ Calculate HF    │
│ Check if OK     │
└─────────┬───────┘
          │ 5. Transfer token
          ▼
┌─────────────────┐
│     TOKENS      │
│                 │
│ transfer()      │
└─────────┬───────┘
          │ 6. Emit Borrowed event
          ▼
┌─────────────────┐
│    MONGODB      │
│                 │
│ Save transaction│
│ Update debt     │
└─────────────────┘
```

### **3. Luồng Cập nhật Giá (Price Updates) - THỰC TẾ**

```
┌─────────────────┐
│   COINGECKO      │
│     API          │
└─────────┬───────┘
          │ 1. Get price every 10s
          ▼
┌─────────────────┐
│Realtime Price   │
│Updater          │
└─────────┬───────┘
          │ 2. Update MongoDB ONLY
          ▼
┌─────────────────┐
│    MONGODB      │
│                 │
│ Update price    │
│ in assets coll  │
└─────────────────┘

⚠️  LƯU Ý: PriceOracle KHÔNG được cập nhật tự động!
   Chỉ có MongoDB được cập nhật từ CoinGecko API.
   PriceOracle cần admin cập nhật thủ công.
```

## Contract Calls Chi tiết

### **LendingPool Contract:**

```solidity
// Các function chính
function lend(address asset, uint256 amount) external
function borrow(address asset, uint256 amount) external  
function repay(address asset, uint256 amount, address onBehalfOf) external
function liquidationCall(address debtAsset, address collateralAsset, address user, uint256 repayRequested) external

// Các function internal
function _accrue(address asset) internal
function _getAccountData(address user) internal view returns (uint256, uint256, uint256)
```

### **PriceOracle Contract (Simple - Manual Only):**

```solidity
// Các function chính
function getAssetPrice1e18(address token) external view returns (uint256)
function setAssetPrice(address token, uint256 price) external // ← CHỈ ADMIN CÓ THỂ GỌI

⚠️  LƯU Ý: PriceOracle là SIMPLE oracle, KHÔNG có Chainlink integration!
   - Chỉ lưu trữ giá thủ công
   - Admin phải setAssetPrice() thủ công
   - KHÔNG có realtime updates từ external sources
```

### **InterestRateModel Contract:**

```solidity
// Function chính
function getRates(uint256 cash, uint256 debtNow, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external pure returns (uint64, uint64)
```

## Dữ liệu lưu trữ trong MongoDB

### **1. Collection: transactions**
```javascript
{
  _id: ObjectId,
  hash: "0x123...",
  user: "0xabc...",
  type: "Supply" | "Borrow" | "Repay" | "Liquidate",
  asset: "0xdef...",
  amount: "1000000000000000000",
  usdValue: 1000.50,
  timestamp: ISODate,
  blockNumber: 12345
}
```

### **2. Collection: users**
```javascript
{
  _id: ObjectId,
  address: "0xabc...",
  totalSupplied: 5000.25,
  totalBorrowed: 2000.75,
  healthFactor: 2.5,
  lastActivity: ISODate,
  transactionCount: 15
}
```

### **3. Collection: assets**
```javascript
{
  _id: ObjectId,
  address: "0xdef...",
  symbol: "USDC",
  name: "USD Coin",
  currentPrice: 1.0,
  totalSupplied: 1000000.0,
  totalBorrowed: 500000.0,
  utilizationRate: 0.5,
  supplyRate: 0.05,
  borrowRate: 0.07,
  lastUpdated: ISODate
}
```

### **4. Collection: metadata**
```javascript
{
  _id: ObjectId,
  key: "lastIndexedBlock",
  value: 12345,
  updatedAt: ISODate
}
```

## Luồng Dữ liệu Tổng thể - THỰC TẾ

```
┌─────────────────┐
│   COINGECKO     │ ← Giá realtime
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│Realtime Updater │ ← Cập nhật MongoDB ONLY
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│    MONGODB      │ ← Lưu trữ dữ liệu + giá từ CoinGecko
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  INDEXER        │ ← Đọc và xử lý (KHÔNG cập nhật PriceOracle)
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  PRICE ORACLE   │ ← CHỈ admin cập nhật thủ công
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│   LENDING POOL  │ ← Sử dụng giá từ PriceOracle (có thể cũ)
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│   FRONTEND      │ ← Hiển thị dữ liệu từ MongoDB (realtime)
└─────────────────┘

⚠️  VẤN ĐỀ: Có disconnect giữa MongoDB (realtime) và PriceOracle (manual)!
```

## Tóm tắt Tương tác

### **1. User Actions:**
- **Frontend** → **MetaMask** → **Smart Contracts**
- **Smart Contracts** → **Events** → **Indexer** → **MongoDB**

### **2. Price Updates - THỰC TẾ:**
- **CoinGecko** → **Realtime Updater** → **MongoDB ONLY**
- **PriceOracle** KHÔNG được cập nhật tự động!
- **Admin** phải cập nhật PriceOracle thủ công

### **3. Data Flow - THỰC TẾ:**
- **MongoDB** lưu trữ tất cả dữ liệu + giá từ CoinGecko
- **Indexer** đọc blockchain và cập nhật MongoDB
- **Frontend** đọc từ MongoDB để hiển thị (realtime)
- **PriceOracle** chỉ có giá cũ (manual updates)

### **4. Contract Interactions:**
- **LendingPool** gọi **PriceOracle** để lấy giá (có thể cũ)
- **LendingPool** gọi **InterestRateModel** để tính lãi suất
- **LendingPool** tương tác với **Token contracts** để transfer

## Vấn đề Hiện tại

### **1. Price Disconnect:**
- **MongoDB**: Giá realtime từ CoinGecko
- **PriceOracle**: Giá cũ (manual updates)
- **LendingPool**: Sử dụng giá cũ từ PriceOracle

### **2. Không có Chainlink:**
- **KHÔNG có** ChainlinkPriceOracle
- **KHÔNG có** MockV3Aggregator trong production
- **CHỈ có** PriceOracle đơn giản

### **3. Manual Price Updates:**
- Admin phải cập nhật PriceOracle thủ công
- Không có automation giữa CoinGecko và PriceOracle

**Kết luận**: Hệ thống hiện tại có **disconnect** giữa price sources. MongoDB có giá realtime nhưng PriceOracle (được LendingPool sử dụng) chỉ có giá manual!
