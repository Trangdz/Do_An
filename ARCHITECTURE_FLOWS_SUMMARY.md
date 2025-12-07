# Mô Tả Ngắn Gọn Các Luồng Hệ Thống

## 📊 Tổng Quan

Hệ thống có 3 phần chính:
- **Client**: Frontend + Wallet (MetaMask)
- **Off-chain**: Backend + MongoDB + Chainlink Node
- **On-chain**: RPC Node + Smart Contracts

## 🔄 Các Luồng Chính

### **1. Luồng Đọc Dữ Liệu (Read Data)**

```
User → Frontend
  ↓
Frontend → Backend: "REST/JSON" hoặc "Get data on-chain"
  ↓
Backend → RPC Node: "read RPC"
  ↓
RPC Node → Smart Contracts: Query data
  ↓
Backend → MongoDB: "store parsed on-chain data" (cache)
  ↓
Backend → Frontend: Trả về data
```

**Ví dụ:**
- User xem reserve data → Frontend gọi Backend → Backend đọc từ RPC → Trả về cho user

### **2. Luồng Giao Dịch (Transactions)**

```
User → Frontend: Click "Lend" / "Borrow" / "Repay" / "Withdraw"
  ↓
Frontend → Wallet (MetaMask): Yêu cầu ký transaction
  ↓
Wallet → RPC Node: "signed tx: deposit/borrow/repay/withdraw"
  ↓
RPC Node → LendingPool: Execute transaction
  ↓
LendingPool → ERC20 Tokens: Transfer tokens
  ↓
Transaction được ghi vào blockchain
```

**Ví dụ:**
- User click "Lend 100 DAI" → MetaMask ký → Gửi transaction → LendingPool nhận → Transfer tokens

### **3. Luồng Cập Nhật Giá (Price Updates)**

```
Chainlink Node (Off-chain)
  ↓ Fetch giá từ Binance API
  ↓ Process data
  ↓ Ký transaction
  ↓
Chainlink Node → Oracle (MultiPriceAggregator): "update prices"
  ↓
Oracle lưu giá vào blockchain storage
  ↓
LendingPool → Oracle: "Get prices" (khi cần)
```

**Ví dụ:**
- Chainlink Node fetch giá ETH từ Binance → Update vào MultiPriceAggregator → LendingPool đọc giá khi cần

### **4. Luồng Tính Lãi Suất (Interest Rate)**

```
LendingPool cần tính lãi suất
  ↓
LendingPool → InterestRateModel: "Get rates"
  ↓
InterestRateModel tính toán dựa trên utilization
  ↓
Trả về lãi suất cho LendingPool
  ↓
LendingPool áp dụng lãi suất
```

**Ví dụ:**
- User borrow → LendingPool tính lãi suất → Gọi InterestRateModel → Áp dụng lãi suất

## 📋 Tóm Tắt Các Luồng

| Luồng | Từ | Đến | Mục Đích |
|-------|-----|-----|----------|
| **Đọc Data** | Frontend → Backend → RPC | Smart Contracts | Hiển thị thông tin cho user |
| **Giao Dịch** | Frontend → MetaMask → RPC | LendingPool | User thực hiện lend/borrow/repay/withdraw |
| **Cập Nhật Giá** | Chainlink Node → RPC | Oracle | Update giá từ external APIs |
| **Tính Lãi Suất** | LendingPool | InterestRateModel | Tính lãi suất dựa trên utilization |
| **Cache Data** | Backend → MongoDB | - | Lưu data để truy vấn nhanh hơn |

## 🎯 Luồng Chi Tiết Theo Từng Hành Động

### **User Xem Thông Tin (Read)**

```
1. User mở trang web
2. Frontend gọi Backend API: GET /api/reserve/0x...
3. Backend đọc từ MongoDB (cache) hoặc RPC Node
4. Backend trả về data cho Frontend
5. Frontend hiển thị cho user
```

### **User Lend (Supply)**

```
1. User click "Lend 100 DAI"
2. Frontend gọi MetaMask để ký transaction
3. MetaMask hiển thị popup, user approve
4. MetaMask ký transaction và gửi đến RPC Node
5. RPC Node gửi transaction đến LendingPool contract
6. LendingPool:
   - Gọi Oracle để lấy giá DAI
   - Transfer DAI từ user đến contract
   - Update user supply balance
7. Transaction được ghi vào blockchain
8. Indexer lắng nghe event và lưu vào MongoDB
```

### **User Borrow**

```
1. User click "Borrow 50 USDC"
2. Frontend → MetaMask → RPC Node → LendingPool
3. LendingPool:
   - Gọi Oracle để lấy giá collateral và debt
   - Tính health factor
   - Kiểm tra health factor > threshold
   - Gọi InterestRateModel để tính lãi suất
   - Transfer USDC từ contract đến user
   - Update user borrow balance
4. Transaction được ghi vào blockchain
```

### **Chainlink Update Giá**

```
1. Chainlink Node job chạy mỗi 3 phút
2. Fetch giá từ Binance API (OFF-CHAIN)
3. Process và encode transaction
4. Ký transaction bằng private key của node
5. Gửi transaction đến MultiPriceAggregator (ON-CHAIN)
6. MultiPriceAggregator verify: msg.sender == writer?
7. Nếu đúng → Lưu giá vào storage
8. LendingPool có thể đọc giá mới từ Oracle
```

## 🔑 Điểm Quan Trọng

### **Read Operations:**
- ✅ Frontend → Backend → RPC (qua API routes)
- ✅ Backend cache vào MongoDB
- ✅ Nhanh hơn, không tốn gas

### **Write Operations (Transactions):**
- ✅ Frontend → MetaMask → RPC (trực tiếp)
- ✅ User phải approve trong MetaMask
- ✅ Tốn gas phí

### **Price Updates:**
- ✅ Chainlink Node (OFF-CHAIN) → Oracle (ON-CHAIN)
- ✅ Tự động chạy theo lịch
- ✅ Cần private key để ký transaction

**Tóm lại: Hệ thống có 4 luồng chính: Đọc data, Giao dịch, Cập nhật giá, và Tính lãi suất. Mỗi luồng có mục đích và cách hoạt động riêng.**





