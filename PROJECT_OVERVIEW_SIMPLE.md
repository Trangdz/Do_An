# Sơ đồ Tổng quan Dự án LendHub v2

## Sơ đồ Hệ thống Đơn giản

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                LENDHUB v2                                      │
│                           (DeFi Lending Protocol)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Next.js App   │  │   React UI      │  │   Web3 Wallet   │              │
│  │   (Giao diện)   │  │   Components    │  │   (MetaMask)    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Web3 Connection
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
│  │  │   (Pool chính)  │    │   (Oracle giá)  │    │     MODEL       │   │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘   │   │
│  │           │                       │                       │           │   │
│  │           │                       │                       │           │   │
│  │           ▼                       │                       ▼           │   │
│  │  ┌─────────────────┐              │              ┌─────────────────┐   │   │
│  │  │     TOKENS       │              │              │   LIBRARIES     │   │   │
│  │  │ (WETH/DAI/USDC)  │              │              │ (LendingMath)   │   │   │
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
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            PRICE SERVICES                               │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │   CoinGecko     │  │  Realtime Price │  │   Manual Price  │       │   │
│  │  │     API         │  │    Updater      │  │    Updates      │       │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Các Thành phần Chính

### 1. **FRONTEND** (Giao diện người dùng)
- **Next.js App**: Giao diện web chính
- **React Components**: Các component UI (buttons, forms, charts)
- **Web3 Wallet**: Kết nối với MetaMask để tương tác blockchain

### 2. **BLOCKCHAIN** (Smart Contracts)
- **LENDING POOL**: Contract chính quản lý lending/borrowing
- **PRICE ORACLE**: Cung cấp giá token cho tính toán
- **INTEREST RATE MODEL**: Tính toán lãi suất động
- **TOKENS**: WETH, DAI, USDC (các token được hỗ trợ)
- **LIBRARIES**: Các thư viện toán học hỗ trợ

### 3. **BACKEND** (Dịch vụ hỗ trợ)
- **INDEXER SERVICE**: Lắng nghe events từ blockchain và lưu vào database
- **MONGODB**: Database lưu trữ lịch sử giao dịch
- **PRICE SERVICES**: CoinGecko API và realtime price updater

## Luồng Hoạt động Chính

### **1. User muốn gửi tiền kiếm lãi:**
```
User → Frontend → MetaMask → LENDING POOL.lend() → Transfer token → Cập nhật position
```

### **2. User muốn vay tiền:**
```
User → Frontend → MetaMask → LENDING POOL.borrow() → 
  ↓
PRICE ORACLE.getAssetPrice1e18() → Tính health factor → 
  ↓
Nếu OK: Transfer token cho user
Nếu không: Revert transaction
```

### **3. Cập nhật giá realtime:**
```
CoinGecko API → Realtime Price Updater → MongoDB → 
  ↓
INDEXER → PRICE ORACLE.setAssetPrice() → Blockchain
```

### **4. Thanh lý khi cần:**
```
Liquidator → LENDING POOL.liquidationCall() → 
  ↓
PRICE ORACLE.getAssetPrice1e18() (cho cả debt và collateral) → 
  ↓
Tính toán số collateral cần thanh lý → Transfer tokens
```

## Tính năng Chính

### **1. Lending (Gửi tiền kiếm lãi)**
- User gửi token vào pool
- Nhận lãi suất động dựa trên utilization
- Có thể rút tiền bất kỳ lúc nào

### **2. Borrowing (Vay tiền)**
- User vay token dựa trên collateral
- Health factor phải > 1
- Lãi suất vay động theo utilization

### **3. Liquidation (Thanh lý)**
- Khi health factor < 1
- Liquidator có thể thanh lý để thu hồi nợ
- Nhận bonus từ việc thanh lý

### **4. Price Management (Quản lý giá)**
- Giá được cập nhật từ CoinGecko API
- Realtime updates mỗi 10 giây
- Fallback mechanisms đảm bảo tính ổn định

## Đặc điểm Kỹ thuật

### **1. Decentralized**
- Smart contracts trên blockchain
- Không có single point of failure
- Transparent và auditable

### **2. Real-time**
- Giá được cập nhật liên tục
- Events được index realtime
- UI cập nhật ngay lập tức

### **3. Secure**
- Health factor protection
- Liquidation mechanisms
- Reentrancy guards

### **4. Scalable**
- Modular architecture
- Easy to add new tokens
- Extensible design

## So sánh với Aave

| Tính năng | LendHub v2 | Aave |
|-----------|------------|------|
| **Lending** | ✅ | ✅ |
| **Borrowing** | ✅ | ✅ |
| **Liquidation** | ✅ | ✅ |
| **Interest Rate** | 2-slope model | 2-slope model |
| **Oracle** | PriceOracle + CoinGecko | Chainlink |
| **Complexity** | Đơn giản hơn | Phức tạp hơn |
| **Tokens** | WETH, DAI, USDC | 100+ tokens |

## Kết luận

**LendHub v2** là một **DeFi lending protocol** đơn giản nhưng đầy đủ tính năng, được thiết kế để:

1. **Dễ hiểu** và **dễ sử dụng**
2. **An toàn** với các cơ chế bảo vệ
3. **Realtime** với price updates liên tục
4. **Scalable** để mở rộng trong tương lai

Đây là một **demo project** hoàn chỉnh cho việc học và hiểu về DeFi lending protocols!




