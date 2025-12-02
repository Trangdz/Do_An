# 2.5.1. Cấu Trúc Hợp Đồng Thông Minh

## Tổng Quan

Hệ thống LendHub được xây dựng trên nền tảng blockchain Ethereum, sử dụng ngôn ngữ Solidity phiên bản 0.8.20. Kiến trúc hợp đồng thông minh được thiết kế theo mô hình modular, tách biệt các chức năng thành các hợp đồng độc lập để dễ bảo trì, nâng cấp và tái sử dụng.

## Kiến Trúc Tổng Thể

Hệ thống được chia thành các module chính:

1. **Core Module** - Module lõi xử lý cho vay và vay
2. **Oracle Module** - Module cung cấp giá tài sản
3. **Reward Module** - Module quản lý phần thưởng
4. **Governance Module** - Module quản trị
5. **Token Module** - Module token quản trị
6. **Supporting Module** - Các thư viện và mô hình hỗ trợ

## Các Hợp Đồng Chính

### 1. LendingPool (Core Module)

**Vị trí:** `contracts/core/LendingPool.sol`

**Chức năng:**
- Quản lý toàn bộ hoạt động cho vay và vay của hệ thống
- Xử lý các giao dịch: Supply, Withdraw, Borrow, Repay, Liquidation
- Tính toán lãi suất động theo thời gian thực
- Quản lý tài sản thế chấp và tính toán Health Factor
- Tích hợp với hệ thống phần thưởng

**Đặc điểm kỹ thuật:**
- Kế thừa `ReentrancyGuard` và `Pausable` từ OpenZeppelin
- Sử dụng `SafeERC20` để xử lý token an toàn
- Lưu trữ dữ liệu trong struct `ReserveData` và `UserReserveData`
- Sử dụng index-based interest calculation (tương tự Aave)

**Các hàm chính:**
- `supply()` - Gửi tiền vào pool
- `withdraw()` - Rút tiền từ pool
- `borrow()` - Vay tài sản
- `repay()` - Trả nợ
- `liquidationCall()` - Thanh lý vị thế rủi ro
- `getAccountData()` - Lấy thông tin tài khoản (collateral, debt, HF)

### 2. MultiPriceAggregator (Oracle Module)

**Vị trí:** `contracts/MultiPriceAggregator.sol`

**Chức năng:**
- Tổng hợp giá từ nhiều nguồn (Chainlink, manual update)
- Cung cấp giá cho LendingPool thông qua interface `IPriceOracle`
- Quản lý giá theo symbol và token address
- Hỗ trợ cập nhật giá thủ công cho mục đích demo

**Đặc điểm:**
- Lưu trữ giá với 8 decimals (tương thích Chainlink)
- Hỗ trợ nhiều token cùng lúc
- Có cơ chế authorization cho writer
- Emit event khi giá được cập nhật

### 3. InterestRateModel (Core Module)

**Vị trí:** `contracts/core/InterestRateModel.sol`

**Chức năng:**
- Tính toán lãi suất theo mô hình 2-slope (kinked interest rate model)
- Tính lãi suất cho người gửi (supply rate) và người vay (borrow rate)
- Dựa trên utilization rate (tỷ lệ sử dụng vốn)

**Công thức:**
- Khi U ≤ U*: `borrowRate = baseRate + slope1 × (U/U*)`
- Khi U > U*: `borrowRate = baseRate + slope1 + slope2 × ((U-U*)/(1-U*))`
- `supplyRate = borrowRate × (1 - reserveFactor) × U`

### 4. RewardAccumulator (Reward Module)

**Vị trí:** `contracts/rewards/RewardAccumulator.sol`

**Chức năng:**
- Tính toán và tích lũy phần thưởng cho người dùng
- Theo dõi số dư supply và borrow của từng user
- Tích hợp với RewardDistributor để phân phối token LENDX

**Đặc điểm:**
- Tính phần thưởng dựa trên thời gian và số dư
- Có cơ chế chống spam (minimum time elapsed, minimum reward amount)
- Được gọi tự động từ LendingPool khi có giao dịch

### 5. RewardDistributor (Reward Module)

**Vị trí:** `contracts/rewards/RewardDistributor.sol`

**Chức năng:**
- Phân phối token LENDX cho người dùng
- Quản lý số dư phần thưởng đã tích lũy
- Cho phép người dùng claim phần thưởng

### 6. LendHubGovernor (Governance Module)

**Vị trí:** `contracts/governance/LendHubGovernor.sol`

**Chức năng:**
- Quản trị phi tập trung (DAO)
- Cho phép đề xuất và bỏ phiếu các thay đổi
- Thực thi các proposal đã được thông qua
- **Tương tác với LendingPool**: Có thể thay đổi các tham số như LTV, liquidation threshold thông qua proposal

**Tương tác với LendingPool:**
- Governor có thể gọi `lendingPool.updateLTV()` để thay đổi Loan-to-Value
- Governor có thể gọi `lendingPool.updateLiquidationThreshold()` để thay đổi ngưỡng thanh lý
- LendingPool sử dụng modifier `onlyOwnerOrGovernor` để cho phép cả owner và governor thực hiện các thay đổi quan trọng

### 7. LENDXToken (Token Module)

**Vị trí:** `contracts/tokens/LENDXToken.sol`

**Chức năng:**
- Token quản trị của hệ thống
- Kế thừa ERC20, ERC20Permit, ERC20Votes
- Hỗ trợ voting và delegation

## Cấu Trúc Dữ Liệu

### ReserveData
Lưu trữ thông tin của mỗi reserve (tài sản):

```solidity
struct ReserveData {
    uint128 reserveCash;              // Tiền mặt sẵn có
    uint128 totalDebtPrincipal;       // Tổng nợ gốc
    uint128 liquidityIndex;           // Index cho người gửi
    uint128 variableBorrowIndex;     // Index cho người vay
    uint64 liquidityRateRayPerSec;   // Lãi suất gửi (RAY/second)
    uint64 variableBorrowRateRayPerSec; // Lãi suất vay
    uint16 reserveFactorBps;         // % lãi về treasury
    uint16 ltvBps;                    // Loan-to-Value
    uint16 liqThresholdBps;           // Ngưỡng thanh lý
    uint16 liqBonusBps;              // Bonus thanh lý
    uint16 closeFactorBps;           // % nợ tối đa thanh lý/lần
    uint8 decimals;                   // Số decimals của token
    bool isBorrowable;               // Có cho vay không
    // ... các tham số lãi suất
}
```

### UserReserveData
Lưu trữ vị thế của từng user:

```solidity
struct UserReserveData {
    Position supply;          // Số tiền đã gửi
    Position borrow;          // Số tiền đã vay
    bool useAsCollateral;     // Có dùng làm tài sản thế chấp
}

struct Position {
    uint128 principal;        // Số gốc (1e18)
    uint128 index;            // Snapshot index (RAY)
}
```

## Mối Quan Hệ Giữa Các Hợp Đồng

```
┌─────────────────┐
│  LendingPool    │◄─────┐
│  (Core)         │      │
└────────┬────────┘      │
         │                │
         ├─► InterestRateModel (tính lãi)
         ├─► MultiPriceAggregator (lấy giá)
         ├─► RewardAccumulator (tích lũy phần thưởng)
         │   └─► RewardDistributor (phân phối)
         │
         ◄─► LendHubGovernor (quản trị)
             └─► LENDXToken (token quản trị)
```

**Mô tả:**
- **LendingPool** là hợp đồng trung tâm, tích hợp với tất cả các module khác
- **InterestRateModel** được gọi để tính lãi suất
- **MultiPriceAggregator** cung cấp giá cho tính toán collateral và debt
- **RewardAccumulator** tích lũy phần thưởng, gọi **RewardDistributor** để phân phối
- **LendHubGovernor** tương tác hai chiều với **LendingPool**:
  - **LendingPool** cho phép **Governor** thực hiện các thay đổi thông qua modifier `onlyOwnerOrGovernor`
  - **Governor** có thể thực thi proposal để gọi các hàm như `updateLTV()`, `updateLiquidationThreshold()`
- **LENDXToken** cung cấp quyền bỏ phiếu cho **LendHubGovernor**

## Các Tính Năng Bảo Mật

### 1. ReentrancyGuard
- Tất cả các hàm quan trọng được bảo vệ khỏi reentrancy attack
- Sử dụng modifier `nonReentrant` từ OpenZeppelin

### 2. Pausable
- Hợp đồng có thể tạm dừng trong trường hợp khẩn cấp
- Chỉ owner/governor mới có quyền pause/unpause

### 3. SafeERC20
- Sử dụng `SafeERC20` để xử lý token an toàn
- Hỗ trợ token có fee-on-transfer (FoT)

### 4. Access Control
- Sử dụng `Ownable` cho quyền quản trị
- Có thể chuyển sang `Governor` cho quản trị phi tập trung

### 5. Input Validation
- Kiểm tra điều kiện tiên quyết (require statements)
- Validate số liệu trước khi thực hiện giao dịch

### 6. Overflow Protection
- Sử dụng Solidity 0.8.20 (có built-in overflow protection)
- Sử dụng SafeMath thông qua thư viện LendingMath

## Thư Viện Hỗ Trợ

### LendingMath
**Vị trí:** `contracts/libraries/LendingMath.sol`

- Các hàm toán học cho tính toán lãi suất
- Xử lý chuyển đổi giữa WAD (1e18) và RAY (1e27)
- Tính toán index và compound interest

### ReserveUserModels
**Vị trí:** `contracts/models/ReserveUserModels.sol`

- Định nghĩa các struct dữ liệu
- Cung cấp các hàm helper cho xử lý dữ liệu

## Interfaces

### IPriceOracle
**Vị trí:** `contracts/interfaces/IPriceOracle.sol`

- Interface chuẩn cho oracle giá
- Đảm bảo tính tương thích với các oracle khác nhau

### IInterestRateModel
**Vị trí:** `contracts/interfaces/IInterestRateModel.sol`

- Interface cho mô hình tính lãi suất
- Cho phép thay thế mô hình lãi suất dễ dàng

## Tương Tác Giữa Các Module

### Governance ↔ LendingPool

**Luồng tương tác:**
1. **LendHubGovernor** được set làm governor trong **LendingPool** thông qua `setGovernor()`
2. Người dùng tạo proposal trong **LendHubGovernor** (cần có ít nhất 10,000 LENDX)
3. Cộng đồng bỏ phiếu bằng LENDX token
4. Khi proposal được thông qua (quorum ≥ 1,000 LENDX, votesFor > votesAgainst)
5. **LendHubGovernor** thực thi proposal bằng cách gọi các hàm trong **LendingPool**:
   - `updateLTV(asset, newLtvBps)` - Thay đổi Loan-to-Value
   - `updateLiquidationThreshold(asset, newLiqThresholdBps)` - Thay đổi ngưỡng thanh lý

**Ví dụ:**
- Proposal: "Thay đổi LTV của WETH từ 75% lên 80%"
- Sau khi proposal được thông qua, Governor gọi `lendingPool.updateLTV(WETH, 8000)`
- LendingPool cập nhật `reserves[WETH].ltvBps = 8000`

### Reward Module ↔ LendingPool

**Luồng tương tác:**
1. **LendingPool** gọi `RewardAccumulator.accumulateRewards(user)` sau mỗi giao dịch
2. **RewardAccumulator** tính toán phần thưởng dựa trên:
   - Supply balance và thời gian
   - Borrow balance và thời gian
3. **RewardAccumulator** gọi `RewardDistributor.accumulateReward()` để tích lũy
4. Người dùng có thể claim phần thưởng từ **RewardDistributor**

### Oracle ↔ LendingPool

**Luồng tương tác:**
1. **LendingPool** gọi `MultiPriceAggregator.getAssetPrice1e18(asset)` khi cần giá
2. Sử dụng cho:
   - Tính toán Health Factor
   - Tính toán collateral value
   - Tính toán debt value
   - Tính toán seize amount trong liquidation

## Kết Luận

Cấu trúc hợp đồng thông minh của LendHub được thiết kế theo nguyên tắc:
- **Modularity**: Tách biệt chức năng thành các module độc lập
- **Security**: Áp dụng các best practices từ OpenZeppelin
- **Scalability**: Dễ dàng mở rộng và nâng cấp
- **Maintainability**: Code rõ ràng, có comment đầy đủ
- **Gas Efficiency**: Tối ưu hóa gas thông qua cấu trúc dữ liệu và thuật toán

Kiến trúc này đảm bảo hệ thống hoạt động ổn định, an toàn và có thể mở rộng trong tương lai.

