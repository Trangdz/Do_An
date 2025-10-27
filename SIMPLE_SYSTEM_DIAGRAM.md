# Sơ đồ Đơn giản - LendHub v2 (Đúng Logic Thực tế)

## Sơ đồ Tổng quan Hệ thống

```
                    ┌─────────────────┐
                    │      USER       │
                    │   (Người dùng)  │
                    └─────────┬───────┘
                              │
                    ┌─────────┴───────┐
                    │                 │
                    │   LENDING POOL  │
                    │   (Pool chính)  │
                    │                 │
                    │  ┌─────────────┐│
                    │  │LIQUIDATION  ││
                    │  │  CALL       ││
                    │  └─────────────┘│
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PRICE     │    │  RESERVE    │    │ INTEREST    │
│   ORACLE    │    │    DATA     │    │   RATE      │
│ (Oracle giá)│    │(Dữ liệu dự trữ)│    │   MODEL    │
└─────────────┘    └─────────────┘    └─────────────┘
        │
        ▼
┌─────────────┐
│   TOKENS    │
│ (WETH/DAI/  │
│ USDC/LINK)  │
└─────────────┘
        ▲
        │
┌─────────────┐
│    OWNER    │
│ (Chủ sở hữu)│
└─────────────┘
```

## Các Thành phần Chính (Đúng Logic Thực tế)

### 1. **USER** (Người dùng)
- **Chức năng**: Thực hiện 4 hành động chính
  - **lend()**: Gửi token vào pool để kiếm lãi
  - **withdraw()**: Rút token đã gửi
  - **borrow()**: Vay token từ pool (cần collateral)
  - **repay()**: Trả nợ token đã vay

### 2. **LENDING POOL** (Pool chính)
- **Vai trò**: Contract trung tâm của hệ thống
- **Chức năng**: 
  - Quản lý tất cả giao dịch lending/borrowing
  - Tính toán health factor
  - Cập nhật lãi suất qua `_accrue()`
  - Xử lý thanh lý qua `liquidationCall()`

### 3. **LIQUIDATION CALL** (Thanh lý)
- **Vị trí**: Function trong Lending Pool
- **Chức năng**: 
  - Kiểm tra health factor < 1
  - Tính toán collateral cần thanh lý
  - Transfer tokens giữa liquidator và user

### 4. **PRICE ORACLE** (Oracle giá)
- **Chức năng**: Cung cấp giá token theo USD (1e18 precision)
- **Tương tác**: Được gọi bởi `_getAccountData()` để tính health factor
- **Implementation**: PriceOracle (testnet) hoặc ChainlinkPriceOracle (production)

### 5. **RESERVE DATA** (Dữ liệu dự trữ)
- **Chức năng**: Lưu trữ thông tin cho mỗi token
- **Dữ liệu**: 
  - `reserveCash`: Số dư có sẵn
  - `totalDebtPrincipal`: Tổng nợ
  - `liquidityIndex`, `borrowIndex`: Chỉ số lãi kép
  - `ltvBps`, `liqThresholdBps`: Thông số rủi ro

### 6. **INTEREST RATE MODEL** (Mô hình lãi suất)
- **Chức năng**: Tính toán lãi suất động dựa trên utilization
- **Công thức**: 2-slope model (base + slope1 + slope2)
- **Tương tác**: Được gọi bởi `_accrue()` trong Lending Pool

### 7. **TOKENS** (Token contracts)
- **Chức năng**: ERC20 tokens được hỗ trợ
- **Tokens**: WETH, DAI, USDC, LINK (TokenWithWithdraw)
- **Tương tác**: Transfer tokens giữa user và pool

### 8. **OWNER** (Chủ sở hữu)
- **Chức năng**: 
  - `initReserve()`: Khởi tạo token mới
  - Cấu hình thông số rủi ro (LTV, liquidation threshold)
  - Quản lý hệ thống

## Luồng Hoạt động (Đúng Logic Thực tế)

### **Luồng Lending (Gửi tiền)**
```
USER.lend() → LENDING POOL → 
  ↓
_accrue() → INTEREST RATE MODEL.getRates() → 
  ↓
Transfer token từ USER → 
  ↓
Cập nhật RESERVE DATA (reserveCash, liquidityIndex)
```

### **Luồng Borrowing (Vay tiền)**
```
USER.borrow() → LENDING POOL → 
  ↓
_accrue() → INTEREST RATE MODEL.getRates() → 
  ↓
_getAccountData() → PRICE ORACLE.getAssetPrice1e18() → 
  ↓
Kiểm tra Health Factor → 
  ↓
Transfer token cho USER → 
  ↓
Cập nhật RESERVE DATA (reserveCash, totalDebtPrincipal)
```

### **Luồng Liquidation (Thanh lý)**
```
LIQUIDATOR.liquidationCall() → LENDING POOL → 
  ↓
_accrue() cho cả debt và collateral asset → 
  ↓
_getAccountData() → PRICE ORACLE.getAssetPrice1e18() → 
  ↓
Kiểm tra Health Factor < 1 → 
  ↓
Tính toán collateral cần thanh lý → 
  ↓
Transfer tokens giữa LIQUIDATOR và USER
```

### **Luồng Cấu hình**
```
OWNER.initReserve() → LENDING POOL → 
  ↓
Cập nhật RESERVE DATA với thông số mới → 
  ↓
Thêm token vào _allAssets array
```

## Đặc điểm Quan trọng (Đúng Logic Thực tế)

1. **LENDING POOL là trung tâm**: Tất cả giao dịch đều đi qua contract này
2. **`_accrue()` được gọi đầu tiên**: Cập nhật lãi suất trước mọi giao dịch
3. **Health Factor bảo vệ**: Kiểm tra trước khi cho vay và thanh lý
4. **PRICE ORACLE cung cấp giá**: Được gọi bởi `_getAccountData()` để tính health factor
5. **INTEREST RATE MODEL**: Tính lãi suất động dựa trên utilization rate
6. **RESERVE DATA**: Lưu trữ tất cả thông tin quan trọng cho mỗi token
7. **OWNER quản lý**: Chỉ có thể `initReserve()` để thêm token mới

## So sánh với Aave

| Thành phần | LendHub v2 | Aave |
|------------|------------|------|
| **Pool chính** | LendingPool | LendingPool |
| **Oracle** | PriceOracle/ChainlinkPriceOracle | Chainlink Oracle |
| **Liquidation** | liquidationCall() | liquidationCall() |
| **Reserves** | ReserveData mapping | ReserveData struct |
| **Interest Rate** | InterestRateModel | InterestRateStrategy |
| **Health Factor** | _getAccountData() | getAccountHealthFactor() |

## Điểm Khác biệt Chính

1. **Đơn giản hóa**: LendHub v2 có ít contract hơn Aave
2. **Tích hợp**: Liquidation logic nằm trong LendingPool thay vì contract riêng
3. **Oracle**: Hỗ trợ cả manual và Chainlink oracle
4. **Token**: Sử dụng TokenWithWithdraw thay vì aToken

Sơ đồ này phản ánh đúng logic thực tế của dự án LendHub v2, dựa trên code thực tế trong contracts.
