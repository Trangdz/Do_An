# Giải Thích Kiến Trúc Hợp Đồng Thông Minh LendHub

## Tổng Quan

Kiến trúc hệ thống LendHub được chia thành **5 module chính**, mỗi module có vai trò và chức năng riêng biệt, nhưng tất cả đều tương tác với nhau để tạo thành một hệ thống cho vay phi tập trung hoàn chỉnh.

---

## 1. Core Module (Module Lõi)

### 1.1. LendingPool - Hợp Đồng Trung Tâm

**Vai trò:** Là trái tim của hệ thống, quản lý tất cả các hoạt động cho vay và vay.

**Chức năng chính:**
- **Supply**: Người dùng gửi tài sản vào pool để kiếm lãi
- **Withdraw**: Người dùng rút tài sản đã gửi
- **Borrow**: Người dùng vay tài sản bằng cách thế chấp
- **Repay**: Người dùng trả nợ
- **Liquidation**: Thanh lý vị thế rủi ro khi Health Factor < 1

**Tương tác:**
- Gọi `InterestRateModel` để tính lãi suất động
- Gọi `MultiPriceAggregator` để lấy giá tài sản
- Gọi `RewardAccumulator` để tích lũy phần thưởng cho người dùng
- Nhận lệnh từ `LendHubGovernor` để thay đổi tham số (LTV, liquidation threshold)
- Sử dụng `LendingMath` và `ReserveUserModels` để tính toán và lưu trữ dữ liệu

**Ví dụ hoạt động:**
```
User A gửi 1000 USDC vào pool
  → LendingPool nhận USDC
  → Gọi InterestRateModel tính lãi suất
  → Gọi RewardAccumulator tích lũy phần thưởng
  → Lưu vào ReserveUserModels
```

### 1.2. InterestRateModel - Mô Hình Tính Lãi Suất

**Vai trò:** Tính toán lãi suất động dựa trên utilization rate (tỷ lệ sử dụng vốn).

**Mô hình 2-slope (Kinked Interest Rate):**
- **Khi U ≤ U*** (utilization thấp): Lãi suất tăng chậm
  - `borrowRate = baseRate + slope1 × (U/U*)`
- **Khi U > U*** (utilization cao): Lãi suất tăng nhanh
  - `borrowRate = baseRate + slope1 + slope2 × ((U-U*)/(1-U*))`

**Lãi suất cho người gửi:**
- `supplyRate = borrowRate × (1 - reserveFactor) × U`
- Reserve factor là phần lãi dành cho treasury

**Tương tác:**
- Được gọi bởi `LendingPool` mỗi khi cần tính lãi suất mới
- Sử dụng dữ liệu từ `ReserveData` (cash, debt) để tính utilization

---

## 2. Oracle Module (Module Oracle)

### 2.1. MultiPriceAggregator - Tổng Hợp Giá

**Vai trò:** Cung cấp giá tài sản cho hệ thống từ nhiều nguồn.

**Nguồn giá:**
- **Chainlink**: Giá từ Chainlink Price Feeds (tự động)
- **Manual**: Giá được cập nhật thủ công (cho demo/testing)

**Chức năng:**
- Lưu trữ giá theo symbol (ETH, USDC, DAI, LINK, ...)
- Cung cấp giá với 8 decimals (tương thích Chainlink)
- Hỗ trợ nhiều token cùng lúc
- Có cơ chế authorization cho writer

**Tương tác:**
- Được gọi bởi `LendingPool` khi cần:
  - Tính Health Factor: `HF = (Collateral × LTV × Price) / (Debt × Price)`
  - Tính giá trị collateral và debt
  - Tính seize amount trong liquidation

**Ví dụ:**
```
LendingPool cần tính HF của user
  → Gọi MultiPriceAggregator.getAssetPrice1e18(USDC)
  → Gọi MultiPriceAggregator.getAssetPrice1e18(LINK)
  → Tính: HF = (1000 USDC × $1 × 0.75) / (500 LINK × $15)
```

---

## 3. Reward Module (Module Phần Thưởng)

### 3.1. RewardAccumulator - Tích Lũy Phần Thưởng

**Vai trò:** Tính toán và tích lũy phần thưởng cho người dùng dựa trên hoạt động của họ.

**Cơ chế:**
- **Supply Rewards**: Phần thưởng cho người gửi tiền
  - Dựa trên số dư supply và thời gian
  - Công thức: `reward = supplyBalance × rate × time`
- **Borrow Rewards**: Phần thưởng cho người vay
  - Dựa trên số dư borrow và thời gian
  - Công thức: `reward = borrowBalance × rate × time`

**Tính năng:**
- Tự động tích lũy khi có giao dịch (supply, borrow, withdraw, repay)
- Có cơ chế chống spam (minimum time elapsed, minimum reward amount)
- Lưu trữ snapshot của balance và thời gian

**Tương tác:**
- Được gọi bởi `LendingPool` sau mỗi giao dịch
- Gọi `RewardDistributor` để tích lũy phần thưởng vào tài khoản user

### 3.2. RewardDistributor - Phân Phối Phần Thưởng

**Vai trò:** Quản lý và phân phối token LENDX cho người dùng.

**Chức năng:**
- Lưu trữ số dư phần thưởng đã tích lũy của mỗi user
- Cho phép user claim phần thưởng
- Quản lý token LENDX trong contract

**Tương tác:**
- Nhận lệnh từ `RewardAccumulator` để tích lũy phần thưởng
- User có thể gọi `claimRewards()` để nhận LENDX token

**Ví dụ:**
```
User A supply 1000 USDC trong 30 ngày
  → RewardAccumulator tính: 1000 × 0.001 LENDX/ngày × 30 = 30 LENDX
  → Gọi RewardDistributor.accumulateReward(userA, 30 LENDX)
  → User A có thể claim 30 LENDX bất cứ lúc nào
```

---

## 4. Governance Module (Module Quản Trị)

### 4.1. LendHubGovernor - Quản Trị DAO

**Vai trò:** Cho phép cộng đồng quản trị protocol thông qua đề xuất và bỏ phiếu.

**Quy trình:**
1. **Tạo Proposal**: Người có ≥ 10,000 LENDX có thể tạo proposal
2. **Bỏ Phiếu**: Người có LENDX token có thể bỏ phiếu (for/against)
3. **Quorum**: Cần ≥ 1,000 LENDX votes để proposal hợp lệ
4. **Thực Thi**: Nếu votesFor > votesAgainst, proposal được thực thi

**Quyền hạn:**
- Thay đổi LTV (Loan-to-Value) của các tài sản
- Thay đổi liquidation threshold
- Các thay đổi khác về tham số protocol

**Tương tác:**
- Sử dụng `LENDXToken` để xác định quyền bỏ phiếu
- Gọi `LendingPool.updateLTV()` và `LendingPool.updateLiquidationThreshold()` để thực thi proposal

**Ví dụ:**
```
Proposal: "Tăng LTV của WETH từ 75% lên 80%"
  → Cộng đồng bỏ phiếu bằng LENDX token
  → Nếu thông qua: Governor gọi LendingPool.updateLTV(WETH, 8000)
  → LendingPool cập nhật reserves[WETH].ltvBps = 8000
```

### 4.2. LENDXToken - Token Quản Trị

**Vai trò:** Token quản trị của protocol, dùng để bỏ phiếu và tạo proposal.

**Đặc điểm:**
- Kế thừa ERC20, ERC20Permit, ERC20Votes
- Hỗ trợ delegation (ủy quyền bỏ phiếu)
- Số dư token = quyền bỏ phiếu

**Tương tác:**
- Được sử dụng bởi `LendHubGovernor` để:
  - Kiểm tra quyền tạo proposal (≥ 10,000 LENDX)
  - Tính quyền bỏ phiếu (balance = voting power)
  - Kiểm tra quorum (≥ 1,000 LENDX votes)

---

## 5. Supporting Module (Module Hỗ Trợ)

### 5.1. LendingMath - Thư Viện Toán Học

**Vai trò:** Cung cấp các hàm toán học cho tính toán lãi suất và compound interest.

**Chức năng:**
- Chuyển đổi giữa WAD (1e18) và RAY (1e27)
- Tính toán compound interest
- Tính toán index (liquidity index, borrow index)
- Các phép toán an toàn với overflow protection

**Tương tác:**
- Được sử dụng bởi `LendingPool` và `InterestRateModel`
- Cung cấp các hàm helper cho tính toán phức tạp

### 5.2. ReserveUserModels - Cấu Trúc Dữ Liệu

**Vai trò:** Định nghĩa các struct để lưu trữ dữ liệu của reserve và user.

**Cấu trúc chính:**

**ReserveData** - Thông tin của mỗi reserve:
```solidity
struct ReserveData {
    uint128 reserveCash;           // Tiền mặt sẵn có
    uint128 totalDebtPrincipal;    // Tổng nợ gốc
    uint128 liquidityIndex;        // Index cho người gửi
    uint128 variableBorrowIndex;  // Index cho người vay
    uint16 ltvBps;                 // Loan-to-Value
    uint16 liqThresholdBps;        // Ngưỡng thanh lý
    // ... các tham số khác
}
```

**UserReserveData** - Vị thế của từng user:
```solidity
struct UserReserveData {
    Position supply;          // Số tiền đã gửi
    Position borrow;          // Số tiền đã vay
    bool useAsCollateral;     // Có dùng làm tài sản thế chấp
}
```

**Tương tác:**
- Được sử dụng bởi tất cả các module để lưu trữ và truy cập dữ liệu
- Cung cấp cấu trúc dữ liệu chuẩn cho toàn hệ thống

---

## Luồng Tương Tác Tổng Thể

### Luồng 1: User Supply Tài Sản

```
1. User gọi LendingPool.supply(USDC, 1000)
2. LendingPool:
   - Nhận USDC từ user
   - Gọi InterestRateModel để tính lãi suất mới
   - Gọi MultiPriceAggregator để lấy giá (nếu cần)
   - Cập nhật ReserveData và UserReserveData
   - Gọi RewardAccumulator để tích lũy phần thưởng
3. RewardAccumulator:
   - Tính phần thưởng dựa trên balance và thời gian
   - Gọi RewardDistributor để tích lũy vào tài khoản user
```

### Luồng 2: User Borrow Tài Sản

```
1. User gọi LendingPool.borrow(LINK, 500)
2. LendingPool:
   - Kiểm tra Health Factor (phải >= 1)
   - Gọi MultiPriceAggregator để lấy giá USDC và LINK
   - Tính: HF = (Collateral × LTV × Price) / (Debt × Price)
   - Nếu HF >= 1: Cho vay
   - Gọi InterestRateModel để tính lãi suất
   - Cập nhật ReserveData và UserReserveData
   - Gọi RewardAccumulator để tích lũy phần thưởng
3. Chuyển LINK cho user
```

### Luồng 3: Liquidation

```
1. Liquidator phát hiện user có HF < 1
2. Liquidator gọi LendingPool.liquidationCall(USDC, LINK, borrower, 1000)
3. LendingPool:
   - Gọi MultiPriceAggregator để lấy giá USDC và LINK
   - Tính seize amount với bonus
   - Kiểm tra điều kiện (HF < 1, đủ collateral, ...)
   - Cập nhật vị thế borrower (giảm debt và collateral)
   - Chuyển collateral cho liquidator
   - Emit event Liquidated
```

### Luồng 4: Governance Proposal

```
1. User có ≥ 10,000 LENDX tạo proposal trong LendHubGovernor
2. Cộng đồng bỏ phiếu bằng LENDX token
3. Nếu proposal thông qua (quorum ≥ 1,000, votesFor > votesAgainst):
4. Governor thực thi proposal:
   - Gọi LendingPool.updateLTV(asset, newLtvBps)
   - Hoặc LendingPool.updateLiquidationThreshold(asset, newThreshold)
5. LendingPool cập nhật ReserveData
```

---

## Đặc Điểm Kiến Trúc

### 1. Modularity (Tính Mô-đun)
- Mỗi module có trách nhiệm riêng biệt
- Dễ dàng nâng cấp hoặc thay thế từng module
- Giảm thiểu rủi ro khi thay đổi

### 2. Separation of Concerns (Tách Biệt Mối Quan Tâm)
- Core logic tách biệt với Oracle
- Reward logic tách biệt với Core
- Governance tách biệt nhưng có thể can thiệp

### 3. Security (Bảo Mật)
- Sử dụng OpenZeppelin contracts (ReentrancyGuard, Pausable, SafeERC20)
- Access control rõ ràng (onlyOwner, onlyOwnerOrGovernor)
- Input validation đầy đủ

### 4. Scalability (Khả Năng Mở Rộng)
- Có thể thêm token mới dễ dàng
- Có thể thay đổi mô hình lãi suất
- Có thể thêm oracle mới

### 5. Decentralization (Phi Tập Trung)
- Governance cho phép cộng đồng quản trị
- Không có single point of failure
- Transparent và verifiable

---

## Kết Luận

Kiến trúc LendHub được thiết kế với nguyên tắc:
- **LendingPool** là trung tâm, quản lý tất cả hoạt động
- **Các module khác** cung cấp dịch vụ cho LendingPool
- **Governance** cho phép cộng đồng quản trị protocol
- **Supporting modules** cung cấp nền tảng cho toàn hệ thống

Kiến trúc này đảm bảo hệ thống hoạt động ổn định, an toàn, có thể mở rộng và phi tập trung.






