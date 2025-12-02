# Giải Thích Sơ Đồ Kiến Trúc Hợp Đồng Thông Minh LendHub

## Tổng Quan

Sơ đồ mô tả kiến trúc hệ thống LendHub với **5 module chính**, mỗi module có vai trò riêng và tương tác với nhau để tạo thành một hệ thống cho vay phi tập trung hoàn chỉnh.

---

## 1. Governance Module (Module Quản Trị)

### LendHubGovernor
- **Vai trò**: Quản trị phi tập trung (DAO) cho phép cộng đồng quản lý protocol
- **Chức năng**: 
  - Tạo proposal (đề xuất thay đổi)
  - Bỏ phiếu cho các proposal
  - Thực thi proposal đã được thông qua

### LENDXToken
- **Vai trò**: Token quản trị của protocol
- **Chức năng**: 
  - Dùng để bỏ phiếu (số dư = quyền bỏ phiếu)
  - Cần ≥ 10,000 LENDX để tạo proposal
  - Cần ≥ 1,000 LENDX votes để proposal hợp lệ

**Mối quan hệ:**
- `GOV → LENDX`: Governance sử dụng LENDX token để xác định quyền bỏ phiếu
- `GOV → LP`: **Quan trọng nhất** - Governance thực thi proposal để thay đổi thông số trong LendingPool

**Ví dụ:**
```
1. Cộng đồng tạo proposal: "Tăng LTV của WETH từ 75% lên 80%"
2. Cộng đồng bỏ phiếu bằng LENDX token
3. Nếu thông qua: Governor gọi LP.updateLTV(WETH, 8000)
4. LendingPool cập nhật reserves[WETH].ltvBps = 8000
```

---

## 2. Core Module (Module Lõi)

### LendingPool
- **Vai trò**: **Trái tim của hệ thống**, quản lý tất cả hoạt động cho vay/vay
- **Chức năng chính**:
  - **Supply**: Người dùng gửi tài sản vào pool
  - **Withdraw**: Người dùng rút tài sản
  - **Borrow**: Người dùng vay tài sản (thế chấp)
  - **Repay**: Người dùng trả nợ
  - **Liquidation**: Thanh lý vị thế rủi ro (HF < 1)

**Mối quan hệ:**
- `LP → IRM`: Gọi InterestRateModel để tính lãi suất động
- `LP → MPA`: Gọi MultiPriceAggregator để lấy giá tài sản
- `LP → RA`: Gọi RewardAccumulator để tích lũy phần thưởng
- `LP → LM`: Sử dụng LendingMath cho tính toán
- `LP → RUM`: Sử dụng ReserveUserModels để lưu trữ dữ liệu
- `LP ← GOV`: Nhận lệnh từ Governance để thay đổi thông số

**Ví dụ hoạt động:**
```
User A gửi 1000 USDC:
1. LP nhận USDC từ user
2. LP gọi IRM tính lãi suất
3. LP gọi MPA lấy giá USDC
4. LP gọi RA tích lũy phần thưởng
5. LP lưu vào RUM
```

### InterestRateModel
- **Vai trò**: Tính toán lãi suất động dựa trên utilization rate
- **Mô hình**: 2-slope (kinked interest rate)
  - Khi utilization thấp: Lãi suất tăng chậm
  - Khi utilization cao: Lãi suất tăng nhanh

**Mối quan hệ:**
- `LP → IRM`: LendingPool gọi để tính lãi suất mới

---

## 3. Oracle Module (Module Oracle)

### MultiPriceAggregator
- **Vai trò**: Cung cấp giá tài sản cho hệ thống
- **Nguồn giá**:
  - Chainlink Price Feeds (tự động)
  - Manual update (cho demo/testing)

**Mối quan hệ:**
- `LP → MPA`: LendingPool gọi để lấy giá khi cần:
  - Tính Health Factor
  - Tính giá trị collateral và debt
  - Tính seize amount trong liquidation

**Ví dụ:**
```
LP cần tính HF của user:
1. Gọi MPA.getAssetPrice1e18(USDC) → $1.00
2. Gọi MPA.getAssetPrice1e18(LINK) → $15.00
3. Tính: HF = (1000 USDC × $1 × 0.75) / (500 LINK × $15) = 0.1
```

---

## 4. Reward Module (Module Phần Thưởng)

### RewardAccumulator
- **Vai trò**: Tính toán và tích lũy phần thưởng cho người dùng
- **Cơ chế**:
  - **Supply Rewards**: Phần thưởng cho người gửi tiền
  - **Borrow Rewards**: Phần thưởng cho người vay
  - Tự động tích lũy khi có giao dịch

**Mối quan hệ:**
- `LP → RA`: LendingPool gọi sau mỗi giao dịch
- `RA → RD`: Gọi RewardDistributor để tích lũy phần thưởng
- `RA → RUM`: Sử dụng ReserveUserModels để lấy dữ liệu

**Ví dụ:**
```
User A supply 1000 USDC trong 30 ngày:
1. LP gọi RA.accumulateRewards(userA)
2. RA tính: 1000 × 0.001 LENDX/ngày × 30 = 30 LENDX
3. RA gọi RD.accumulateReward(userA, 30 LENDX)
4. User A có thể claim 30 LENDX bất cứ lúc nào
```

### RewardDistributor
- **Vai trò**: Phân phối token LENDX cho người dùng
- **Chức năng**:
  - Lưu trữ số dư phần thưởng đã tích lũy
  - Cho phép user claim phần thưởng

**Mối quan hệ:**
- `RA → RD`: RewardAccumulator gọi để tích lũy phần thưởng

---

## 5. Supporting Module (Module Hỗ Trợ)

### LendingMath
- **Vai trò**: Thư viện toán học cho tính toán lãi suất
- **Chức năng**:
  - Chuyển đổi WAD (1e18) và RAY (1e27)
  - Tính compound interest
  - Tính toán index

**Mối quan hệ:**
- `LP → LM`: LendingPool sử dụng cho các tính toán phức tạp

### ReserveUserModels
- **Vai trò**: Định nghĩa cấu trúc dữ liệu
- **Cấu trúc chính**:
  - `ReserveData`: Thông tin của mỗi reserve (cash, debt, index, LTV, ...)
  - `UserReserveData`: Vị thế của từng user (supply, borrow, collateral)

**Mối quan hệ:**
- `LP → RUM`: LendingPool lưu trữ và truy cập dữ liệu
- `RA → RUM`: RewardAccumulator sử dụng để lấy dữ liệu user

---

## Luồng Tương Tác Chính

### Luồng 1: User Supply Tài Sản
```
User → LP.supply(USDC, 1000)
  ↓
LP → IRM (tính lãi suất)
LP → MPA (lấy giá)
LP → RA (tích lũy phần thưởng)
  ↓
RA → RD (phân phối)
LP → RUM (lưu trữ)
```

### Luồng 2: Governance Thay Đổi Thông Số
```
Cộng đồng → GOV.createProposal()
  ↓
Cộng đồng → GOV.castVote() (bằng LENDX)
  ↓
GOV.executeProposal()
  ↓
GOV → LP.updateLTV(asset, newLtvBps)
  ↓
LP cập nhật ReserveData
```

### Luồng 3: User Borrow Tài Sản
```
User → LP.borrow(LINK, 500)
  ↓
LP → MPA (lấy giá USDC và LINK)
LP tính HF = (Collateral × LTV × Price) / (Debt × Price)
  ↓
Nếu HF >= 1:
  LP → IRM (tính lãi suất)
  LP → RA (tích lũy phần thưởng)
  LP → RUM (lưu trữ)
  LP chuyển LINK cho user
```

### Luồng 4: Liquidation
```
Liquidator → LP.liquidationCall(USDC, LINK, borrower, 1000)
  ↓
LP → MPA (lấy giá USDC và LINK)
LP tính seize amount với bonus
  ↓
LP cập nhật vị thế borrower
LP chuyển collateral cho liquidator
LP emit event Liquidated
```

---

## Đặc Điểm Kiến Trúc

### 1. Modularity (Tính Mô-đun)
- Mỗi module có trách nhiệm riêng biệt
- Dễ dàng nâng cấp hoặc thay thế từng module

### 2. Centralized Core (Lõi Tập Trung)
- **LendingPool** là trung tâm, tất cả hoạt động đều qua đây
- Các module khác cung cấp dịch vụ cho LendingPool

### 3. Decentralized Governance (Quản Trị Phi Tập Trung)
- Cộng đồng có thể quản lý protocol thông qua Governance
- Không có single point of failure

### 4. Security (Bảo Mật)
- Sử dụng OpenZeppelin contracts
- Access control rõ ràng (onlyOwner, onlyOwnerOrGovernor)
- Input validation đầy đủ

### 5. Scalability (Khả Năng Mở Rộng)
- Có thể thêm token mới dễ dàng
- Có thể thay đổi mô hình lãi suất
- Có thể thêm oracle mới

---

## Kết Luận

Sơ đồ thể hiện:
- **LendingPool** là trung tâm, quản lý tất cả hoạt động
- **Governance** có thể tác động lên LendingPool để thay đổi thông số
- **Các module khác** cung cấp dịch vụ cho LendingPool
- **Supporting modules** cung cấp nền tảng cho toàn hệ thống

Kiến trúc này đảm bảo hệ thống hoạt động ổn định, an toàn, có thể mở rộng và phi tập trung.






