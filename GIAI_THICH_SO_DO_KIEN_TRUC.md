# GIẢI THÍCH SƠ ĐỒ KIẾN TRÚC HỆ THỐNG LENDHUB

## 1. TỔNG QUAN SƠ ĐỒ

Sơ đồ mô tả kiến trúc tổng thể của hệ thống LendHub - một nền tảng lending/borrowing phi tập trung, bao gồm các thành phần chính và luồng tương tác giữa chúng.

---

## 2. CÁC THÀNH PHẦN CHÍNH

### 2.1. Lending Pool (Hợp đồng chính - Màu vàng)

**Vai trò:** Đây là **trái tim của hệ thống**, quản lý tất cả các hoạt động lending và borrowing.

**Chức năng:**
- Nhận tiền gửi (Supply/Lend) từ người dùng
- Cho phép người dùng rút tiền (Withdraw)
- Xử lý các khoản vay (Borrow)
- Xử lý việc trả nợ (Repay)
- Quản lý thanh khoản (liquidity) của pool

**Trong code:**
- File: `contracts/core/LendingPool.sol`
- Contract chính kế thừa `ReentrancyGuard`, `Pausable`
- Quản lý `reserves` (mapping asset => ReserveData)
- Quản lý `userReserves` (mapping user => asset => UserReserveData)

**Tương tác:**
- Nhận yêu cầu từ **User** (Lend, Withdraw, Borrow, Repay)
- Sử dụng **Reserves Balance** để quản lý thanh khoản
- Nhận hỗ trợ từ **Lending Helper** cho các tính toán phức tạp
- Được cấu hình bởi **Lending Config** (quản lý assets và tham số)

### 2.2. Liquidation Manager (Bên trong Lending Pool - Màu đỏ)

**Vai trò:** Quản lý quá trình thanh lý (liquidation) khi người dùng không còn khả năng trả nợ.

**Chức năng:**
- Kiểm tra Health Factor của người dùng
- Thực hiện thanh lý khi Health Factor < 1.0
- Tính toán lượng collateral bị tịch thu (với liquidation bonus)
- Chuyển collateral cho liquidator

**Trong code:**
- Function: `liquidationCall()` trong `LendingPool.sol` (dòng 664-747)
- Kiểm tra: `require(hf < 1e18, "HF>=1")`
- Tính toán: Sử dụng `closeFactor`, `liqBonusBps`
- Sử dụng giá từ **Price Oracle** để tính toán USD value

**Tương tác:**
- Nhận thông tin token mapping từ **AddressToTokenMap**
- Nhận giá tài sản từ **Price Oracle**
- Thực hiện thanh lý thông qua Lending Pool

### 2.3. User (Người dùng - Icon xanh dương)

**Vai trò:** Người dùng cuối của hệ thống, thực hiện các giao dịch.

**Các hành động:**
1. **Lend (Gửi tiền):**
   - Chuyển token vào Lending Pool
   - Nhận aTokens (tăng liquidity index)
   - Tăng thanh khoản của pool

2. **Withdraw (Rút tiền):**
   - Rút token đã gửi (nếu không còn ràng buộc nợ)
   - Giảm aTokens
   - Giảm thanh khoản của pool

3. **Borrow (Vay):**
   - Vay token dựa trên tài sản thế chấp
   - Phải đảm bảo Health Factor > 1.0
   - Tăng debt và giảm thanh khoản

4. **Repay (Trả nợ):**
   - Trả lại token đã vay
   - Giảm debt
   - Tăng Health Factor

**Trong code:**
- Functions: `lend()`, `withdraw()`, `borrow()`, `repay()` trong `LendingPool.sol`
- Mỗi function emit event: `Supplied`, `Withdrawn`, `Borrowed`, `Repaid`

### 2.4. Owner (Quản trị viên - Icon đen)

**Vai trò:** Người quản trị hệ thống, có quyền cấu hình.

**Hành động:**
- **Add Token & Price feed addresses**: Thêm token mới và địa chỉ price feed tương ứng

**Trong code:**
- Function: `initReserve()` trong `LendingPool.sol` (dòng 544)
- Function: `setTokenSymbol()` trong `MultiPriceAggregator.sol` (dòng 76)
- Owner có thể:
  - Thêm token mới vào hệ thống
  - Cấu hình tham số (LTV, liquidation threshold, reserve factor, etc.)
  - Set price feed address cho mỗi token

**Tương tác:**
- Cấu hình **AddressToTokenMap** để map token addresses với price feeds

### 2.5. AddressToTokenMap (Màu tím)

**Vai trò:** Lưu trữ mapping giữa địa chỉ token và price feed tương ứng.

**Chức năng:**
- Map token address → price feed address
- Map token address → token symbol (WETH, DAI, USDC, LINK)
- Cung cấp thông tin mapping cho Liquidation Manager

**Trong code:**
- File: `contracts/MultiPriceAggregator.sol`
- Mapping: `mapping(address => string) public tokenSymbols` (dòng 18)
- Function: `setTokenSymbol()` để set mapping (dòng 76-84)
- Function: `getAssetPrice1e18()` để lấy giá dựa trên token address (dòng 89-101)

**Tương tác:**
- Nhận cấu hình từ **Owner**
- Cung cấp thông tin cho **Liquidation Manager** (thông qua Price Oracle)

### 2.6. Price Oracle (Màu cam)

**Vai trò:** Cung cấp giá tài sản cho hệ thống.

**Chức năng:**
- Lưu trữ giá từ Chainlink Oracle
- Cung cấp giá cho Liquidation Manager để tính toán
- Cung cấp giá cho Lending Pool để tính Health Factor

**Trong code:**
- File: `contracts/MultiPriceAggregator.sol`
- Interface: `contracts/interfaces/IPriceOracle.sol`
- Function: `getAssetPrice1e18(address token)` trả về giá với precision 1e18
- Giá được cập nhật bởi Chainlink node (writer) qua function `updatePrice()`

**Tương tác:**
- Nhận giá từ Chainlink node (external)
- Cung cấp giá cho **Liquidation Manager** để tính toán liquidation
- Cung cấp giá cho **Lending Pool** để tính Health Factor và LTV

### 2.7. Reserves Balance (Icon hình trụ xanh)

**Vai trò:** Lưu trữ thanh khoản (liquidity) của pool.

**Chức năng:**
- Lưu trữ token đã được gửi vào pool
- Cung cấp thanh khoản cho các khoản vay
- Quản lý số dư của từng asset

**Trong code:**
- Trong `LendingPool.sol`:
  - `ReserveData.reserveCash` (dòng 38): Số tiền mặt trong pool
  - `ReserveData.totalDebtPrincipal` (dòng 38): Tổng nợ
  - `ReserveData.liquidityIndex` (dòng 38): Index tính lãi cho supply

**Tương tác:**
- Cung cấp thanh khoản cho **Lending Pool**
- Khi user supply → `reserveCash` tăng
- Khi user borrow → `reserveCash` giảm, `totalDebtPrincipal` tăng

### 2.8. Lending Helper (Màu xanh lá)

**Vai trò:** Cung cấp các hàm tiện ích và tính toán hỗ trợ cho Lending Pool.

**Chức năng:**
- Tính toán Health Factor
- Tính toán LTV (Loan-to-Value)
- Tính toán utilization rate
- Các hàm toán học phức tạp (RayMath, LendingMath)

**Trong code:**
- File: `contracts/libraries/LendingMath.sol`
- Library: `RayMath` trong `LendingPool.sol` (dòng 16-26)
- Functions:
  - `_getAccountData()`: Tính Health Factor
  - `_accrue()`: Cập nhật index và rates
  - `_currentDebt()`: Tính debt hiện tại
  - `_currentSupply()`: Tính supply hiện tại

**Tương tác:**
- Được gọi bởi **Lending Pool** để thực hiện các tính toán

### 2.9. Lending Config (Màu xám)

**Vai trò:** Quản lý cấu hình và tham số của các assets.

**Chức năng:**
- Quản lý danh sách assets được hỗ trợ
- Cấu hình tham số cho mỗi asset:
  - LTV (Loan-to-Value)
  - Liquidation threshold
  - Reserve factor
  - Liquidation bonus
  - Close factor
  - Interest rate parameters (baseRate, slope1, slope2)

**Trong code:**
- Function: `initReserve()` trong `LendingPool.sol` (dòng 544)
- Parameters:
  ```solidity
  function initReserve(
      address asset,
      uint8 decimals,
      uint16 reserveFactorBps,    // 10% = 1000 bps
      uint16 ltvBps,               // 75% = 7500 bps
      uint16 liqThresholdBps,      // 80% = 8000 bps
      uint16 liqBonusBps,           // 5% = 500 bps
      uint16 closeFactorBps,        // 50% = 5000 bps
      bool isBorrowable,
      uint16 optimalUBps,           // 80% = 8000 bps
      uint64 baseRate,
      uint64 slope1,
      uint64 slope2
  )
  ```

**Tương tác:**
- Được cấu hình bởi **Owner**
- Cung cấp cấu hình cho **Lending Pool** để quản lý assets

---

## 3. LUỒNG TƯƠNG TÁC CHI TIẾT

### 3.1. Luồng Supply (Gửi tiền)

```
User → Lending Pool → Reserves Balance
                      ↓
                  Lending Helper (tính index)
                      ↓
                  Lending Config (kiểm tra asset)
```

**Chi tiết:**
1. User gọi `lend(asset, amount)`
2. Lending Pool kiểm tra asset có trong Lending Config không
3. Lending Pool gọi `_accrue(asset)` để cập nhật index
4. Lending Pool chuyển token từ user vào pool
5. Reserves Balance: `reserveCash` tăng
6. UserReserves: `supply.principal` tăng

### 3.2. Luồng Borrow (Vay)

```
User → Lending Pool → Price Oracle (lấy giá)
                      ↓
                  Lending Helper (tính HF, LTV)
                      ↓
                  Reserves Balance (kiểm tra thanh khoản)
                      ↓
                  Lending Config (kiểm tra tham số)
```

**Chi tiết:**
1. User gọi `borrow(asset, amount)`
2. Lending Pool gọi `_accrue()` cho cả collateral và debt asset
3. Lending Pool gọi Price Oracle để lấy giá
4. Lending Helper tính Health Factor
5. Kiểm tra HF > 1.0 và LTV < liquidation threshold
6. Reserves Balance: `reserveCash` giảm, `totalDebtPrincipal` tăng
7. UserReserves: `borrow.principal` tăng

### 3.3. Luồng Liquidation (Thanh lý)

```
Liquidator → Lending Pool → Liquidation Manager
                              ↓
                          Price Oracle (lấy giá)
                              ↓
                          AddressToTokenMap (map token)
                              ↓
                          Lending Helper (tính toán)
                              ↓
                          Reserves Balance (tịch thu collateral)
```

**Chi tiết:**
1. Liquidator gọi `liquidationCall(debtAsset, collateralAsset, user, repayAmount)`
2. Liquidation Manager kiểm tra HF(user) < 1.0
3. Liquidation Manager gọi Price Oracle để lấy giá cả 2 assets
4. Liquidation Manager sử dụng AddressToTokenMap để map token → symbol
5. Lending Helper tính toán:
   - Repay USD value
   - Seize USD value (với bonus)
   - Seize collateral amount
6. Reserves Balance:
   - `debtAsset.reserveCash` tăng (nhận repay)
   - `collateralAsset.reserveCash` giảm (tịch thu)
7. Chuyển collateral cho liquidator

### 3.4. Luồng Cấu Hình (Owner Setup)

```
Owner → AddressToTokenMap (set token symbol)
     ↓
Owner → Lending Pool → Lending Config (initReserve)
                     ↓
                 Price Oracle (set price feed)
```

**Chi tiết:**
1. Owner gọi `setTokenSymbol(token, symbol)` trong MultiPriceAggregator
2. Owner gọi `initReserve()` trong Lending Pool với các tham số:
   - Asset address
   - Decimals
   - Risk parameters (LTV, liquidation threshold, etc.)
   - Interest rate parameters
3. Lending Config lưu cấu hình vào `reserves[asset]`
4. Price Oracle được cấu hình để map token → price feed

---

## 4. MỐI QUAN HỆ GIỮA CÁC THÀNH PHẦN

### 4.1. Lending Pool là Trung Tâm

- **Nhận input từ:** User, Owner
- **Sử dụng:** Reserves Balance, Lending Helper, Lending Config, Price Oracle
- **Chứa:** Liquidation Manager (bên trong)

### 4.2. Liquidation Manager Phụ Thuộc

- **Nhận input từ:** AddressToTokenMap, Price Oracle
- **Hoạt động trong:** Lending Pool
- **Sử dụng:** Lending Helper để tính toán

### 4.3. Price Oracle Độc Lập

- **Nhận input từ:** Chainlink node (external)
- **Cung cấp cho:** Liquidation Manager, Lending Pool
- **Lưu trữ mapping:** AddressToTokenMap (bên trong MultiPriceAggregator)

### 4.4. Owner Quản Trị

- **Cấu hình:** AddressToTokenMap, Lending Config
- **Không trực tiếp:** Tương tác với User hoặc Reserves Balance

---

## 5. ĐIỂM QUAN TRỌNG TRONG THIẾT KẾ

### 5.1. Tách Biệt Trách Nhiệm

- **Lending Pool**: Quản lý giao dịch
- **Liquidation Manager**: Xử lý thanh lý
- **Price Oracle**: Cung cấp giá
- **Lending Helper**: Tính toán
- **Lending Config**: Cấu hình

### 5.2. Bảo Mật

- **Owner-only**: Chỉ owner mới có thể cấu hình
- **ReentrancyGuard**: Bảo vệ khỏi reentrancy attacks
- **Pausable**: Có thể pause hệ thống trong trường hợp khẩn cấp
- **SafeERC20**: Xử lý an toàn với các token không chuẩn

### 5.3. Mở Rộng

- **Modular design**: Các thành phần độc lập, dễ thay thế
- **Interface-based**: Sử dụng interface để dễ tích hợp
- **Configurable**: Tham số có thể thay đổi qua `initReserve()`

---

## 6. KẾT LUẬN

Sơ đồ kiến trúc mô tả một hệ thống **modular, an toàn và có thể mở rộng**. Lending Pool là trung tâm, kết nối tất cả các thành phần lại với nhau. Liquidation Manager xử lý các trường hợp đặc biệt (thanh lý), trong khi Price Oracle đảm bảo tính chính xác của giá tài sản. Owner có quyền cấu hình hệ thống, nhưng không can thiệp trực tiếp vào giao dịch của người dùng.

**Ưu điểm:**
- ✅ Tách biệt trách nhiệm rõ ràng
- ✅ Dễ bảo trì và mở rộng
- ✅ Bảo mật tốt với access control
- ✅ Tích hợp Oracle để đảm bảo tính chính xác

**Hạn chế:**
- ⚠️ Owner có quyền tuyệt đối (cần multi-sig)
- ⚠️ Phụ thuộc vào Price Oracle (cần backup oracle)

---













