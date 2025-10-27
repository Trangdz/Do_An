# Kiến trúc Contract trong LendHub v2

## Tổng quan
LendHub v2 là một giao thức lending/borrowing phi tập trung (DeFi) được xây dựng trên Ethereum, tương tự như Aave. Hệ thống bao gồm nhiều contract tương tác với nhau để cung cấp các chức năng cho vay, vay mượn, và quản lý tài sản thế chấp.

## Các Contract chính

### 1. Core Contracts (Hợp đồng cốt lõi)

#### LendingPool.sol
- **Vai trò**: Contract chính của hệ thống, quản lý tất cả các hoạt động lending/borrowing
- **Chức năng chính**:
  - `lend()`: Cho phép user gửi token để kiếm lãi
  - `withdraw()`: Rút token đã gửi
  - `borrow()`: Vay token dựa trên tài sản thế chấp
  - `repay()`: Trả nợ
  - `liquidationCall()`: Thanh lý tài sản khi health factor < 1
  - `setUserUseReserveAsCollateral()`: Bật/tắt sử dụng tài sản làm thế chấp
- **Tương tác**: Sử dụng InterestRateModel và PriceOracle để tính toán lãi suất và giá

#### InterestRateModel.sol
- **Vai trò**: Tính toán lãi suất động dựa trên utilization rate
- **Chức năng**: 
  - `getRates()`: Trả về borrow rate và supply rate dựa trên công thức 2-slope
  - Sử dụng công thức: `rb = base + s1 * (U/U*) + s2 * ((U-U*)/(1-U*))`
- **Tương tác**: Được gọi bởi LendingPool trong hàm `_accrue()`

#### PriceOracle.sol (Simple Oracle)
- **Vai trò**: Cung cấp giá token đơn giản (cho testnet)
- **Chức năng**:
  - `setAssetPrice()`: Set giá thủ công
  - `getAssetPrice1e18()`: Trả về giá token theo USD (1e18 precision)
- **Tương tác**: Được sử dụng bởi LendingPool để tính toán collateral value

#### ChainlinkPriceOracle.sol (Production Oracle)
- **Vai trò**: Oracle sản xuất sử dụng Chainlink Price Feeds
- **Chức năng**:
  - `setPriceFeed()`: Kết nối với Chainlink aggregator
  - `setManualPrice()`: Set giá thủ công làm fallback
  - `getAssetPrice1e18()`: Lấy giá từ Chainlink hoặc manual price
- **Tương tác**: Thay thế PriceOracle trong môi trường production

### 2. Token Contracts

#### TokenWithWithdraw.sol
- **Vai trò**: ERC20 token với chức năng wrap/unwrap ETH
- **Chức năng**:
  - `deposit()`: Gửi ETH để nhận token
  - `withdraw()`: Burn token để nhận ETH
  - `mint()`: Mint token mới (chỉ owner)
- **Sử dụng**: WETH, DAI, USDC, LINK trong hệ thống

#### ERC20Mock.sol
- **Vai trò**: Mock ERC20 token cho testing
- **Chức năng**: Các chức năng cơ bản của ERC20 + mint function

### 3. Oracle Contracts

#### MockV3Aggregator.sol
- **Vai trò**: Mock Chainlink Price Feed cho testing
- **Chức năng**:
  - `latestRoundData()`: Trả về dữ liệu giá giả
  - `updateAnswer()`: Cập nhật giá thủ công
- **Tương tác**: Được sử dụng bởi ChainlinkPriceOracle

### 4. Library Contracts

#### LendingMath.sol
- **Vai trò**: Thư viện toán học cho các phép tính lending
- **Chức năng**:
  - `wadMul()`, `wadDiv()`: Phép nhân/chia với WAD (1e18)
  - `rayMul()`, `rayDiv()`: Phép nhân/chia với RAY (1e27)
  - `accrueIndex()`: Tính lãi kép theo index
  - `utilization()`: Tính utilization rate
  - `valueByIndex()`: Tính giá trị hiện tại dựa trên index

#### ReserveUserModels.sol
- **Vai trò**: Định nghĩa các struct dữ liệu
- **Structs**:
  - `Position`: Lưu principal và index snapshot
  - `UserReserveData`: Dữ liệu user cho mỗi asset
  - `ReserveData`: Dữ liệu reserve cho mỗi asset

### 5. Interface Contracts

#### IPriceOracle.sol
- **Vai trò**: Interface cho price oracle
- **Chức năng**: `getAssetPrice1e18()` - chuẩn hóa interface

#### IInterestRateModel.sol
- **Vai trò**: Interface cho interest rate model
- **Chức năng**: `getRates()` - chuẩn hóa interface

## Luồng tương tác chính

### 1. Khởi tạo hệ thống
```
1. Deploy InterestRateModel
2. Deploy PriceOracle (hoặc ChainlinkPriceOracle)
3. Deploy LendingPool với địa chỉ của IRM và Oracle
4. Deploy các token (WETH, DAI, USDC, LINK)
5. Init reserves cho từng token
```

### 2. Lending Flow
```
User → LendingPool.lend() → 
  - _accrue() → InterestRateModel.getRates()
  - Transfer token từ user
  - Cập nhật user position
  - Cập nhật reserve data
```

### 3. Borrowing Flow
```
User → LendingPool.borrow() →
  - _accrue() → InterestRateModel.getRates()
  - _getAccountData() → PriceOracle.getAssetPrice1e18()
  - Kiểm tra health factor
  - Transfer token cho user
  - Cập nhật user debt position
```

### 4. Liquidation Flow
```
Liquidator → LendingPool.liquidationCall() →
  - _accrue() cho cả debt và collateral asset
  - _getAccountData() → PriceOracle.getAssetPrice1e18()
  - Kiểm tra health factor < 1
  - Transfer debt token từ liquidator
  - Transfer collateral token cho liquidator
  - Cập nhật positions
```

## Địa chỉ Contract (Ganache)

- **LendingPool**: `0xC4eb1226248928Da7D0Ed4b38b8B9934e1822767`
- **ETH Address**: `0x0000000000000000000000000000000000000000`
- **WETH, DAI, USDC, LINK**: Được deploy động trong scripts

## Tính năng bảo mật

1. **ReentrancyGuard**: Bảo vệ khỏi reentrancy attacks
2. **Pausable**: Cho phép pause/unpause hệ thống
3. **Health Factor**: Kiểm tra tình trạng tài chính của user
4. **Liquidation**: Thanh lý tự động khi health factor < 1
5. **Dust Protection**: Xử lý các khoản nợ nhỏ

## Mô hình lãi suất

Sử dụng mô hình 2-slope:
- **Slope 1**: Lãi suất tăng tuyến tính từ 0% đến U* (optimal utilization)
- **Slope 2**: Lãi suất tăng mạnh khi U > U*
- **Supply Rate**: `borrow_rate * U * (1 - reserve_factor)`

## Oracle System

- **Testnet**: Sử dụng PriceOracle với giá thủ công
- **Production**: Sử dụng ChainlinkPriceOracle với real price feeds
- **Fallback**: Manual prices khi Chainlink không khả dụng




