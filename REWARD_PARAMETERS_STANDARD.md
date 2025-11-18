# Thông số Reward System - Chuẩn hóa

## Tổng quan

Tài liệu này tổng hợp tất cả các thông số reward system đã được chuẩn hóa trong dự án LendHub v2.

---

## 1. Reward Distribution Parameters (RewardDistributor.sol)

### 1.1. Daily Claim Limit
- **Thông số:** `dailyClaimLimit`
- **Giá trị mặc định:** `1000e18` = **1,000 LENDX/user/day**
- **Mục đích:** Giới hạn số lượng reward mỗi user có thể claim trong một ngày
- **Vị trí:** `contracts/rewards/RewardDistributor.sol:76`
- **Có thể thay đổi:** ✅ Có (qua `setDailyClaimLimit()`)

### 1.2. Reserve Pool
- **Thông số:** `reservePoolPercentage`
- **Giá trị mặc định:** `20e18` = **20%** (sử dụng 1e18 = 100%)
- **Mục đích:** Dành một phần reward pool cho user mới
- **Vị trí:** `contracts/rewards/RewardDistributor.sol:77`
- **Có thể thay đổi:** ✅ Có (qua `setReservePool()`)
- **Lưu ý:** `reservePoolAmount` được tính tự động từ `currentBalance * reservePoolPercentage / 100e18`

### 1.3. Maximum Reward Per User
- **Thông số:** `maxRewardPerUser`
- **Giá trị mặc định:** `10e24` = **10,000,000 LENDX (10M LENDX)**
- **Mục đích:** Giới hạn tổng reward tối đa mỗi user có thể claim
- **Vị trí:** `contracts/rewards/RewardDistributor.sol:79`
- **Có thể thay đổi:** ✅ Có (qua `setMaxRewardPerUser()`)

### 1.4. Daily Emission Rate
- **Thông số:** `dailyEmissionRate`
- **Giá trị mặc định:** `100000e18` = **100,000 LENDX/day**
- **Tính toán năm:** ~36.5M LENDX/năm (100,000 × 365)
- **Mục đích:** Số lượng LENDX được phát hành mỗi ngày để bổ sung reward pool
- **Vị trí:** `contracts/rewards/RewardDistributor.sol:82`
- **Có thể thay đổi:** ✅ Có (qua `setEmissionParams()`)

### 1.5. Pool Balance Thresholds
- **Min Pool Balance:** `minPoolBalance`
  - **Giá trị mặc định:** `10e24` = **10,000,000 LENDX (10M LENDX)**
  - **Mục đích:** Ngưỡng tối thiểu để duy trì full reward rate
  - **Vị trí:** `contracts/rewards/RewardDistributor.sol:85`

- **Target Pool Balance:** `targetPoolBalance`
  - **Giá trị mặc định:** `50e24` = **50,000,000 LENDX (50M LENDX)**
  - **Mục đích:** Mục tiêu pool balance lý tưởng
  - **Vị trí:** `contracts/rewards/RewardDistributor.sol:86`

- **Có thể thay đổi:** ✅ Có (qua `setPoolBalanceTargets()`)

---

## 2. Reward Accumulation Parameters (RewardAccumulator.sol)

### 2.1. Base Reward Rates
- **Supply Rate:** `baseSupplyRate`
  - **Giá trị mặc định:** `1e15` = **0.001 LENDX/token/second**
  - **Công thức:** `reward = balance × 0.001 × time_elapsed`
  - **Ví dụ:** 1000 tokens trong 60 giây = 1000 × 0.001 × 60 = **60 LENDX**
  - **Vị trí:** `contracts/rewards/RewardAccumulator.sol:62`

- **Borrow Rate:** `baseBorrowRate`
  - **Giá trị mặc định:** `2e15` = **0.002 LENDX/token/second**
  - **Công thức:** `reward = balance × 0.002 × time_elapsed`
  - **Ví dụ:** 1000 tokens trong 60 giây = 1000 × 0.002 × 60 = **120 LENDX**
  - **Lưu ý:** Borrow rate cao gấp 2 lần supply rate để khuyến khích borrowing
  - **Vị trí:** `contracts/rewards/RewardAccumulator.sol:63`

- **Có thể thay đổi:** ✅ Có (qua `setRewardRates()`)

### 2.2. Dynamic Rate Adjustment
- **Min Pool Balance Threshold:** `minPoolBalanceThreshold`
  - **Giá trị mặc định:** `10e24` = **10,000,000 LENDX (10M LENDX)**
  - **Mục đích:** Ngưỡng tối thiểu để duy trì full reward rate
  - **Cơ chế:**
    - Pool >= 10M: Rate = 100% base rate
    - Pool < 10M: Rate = baseRate × (poolBalance / 10M)
    - Pool = 0: Rate = 0 (tạm thời)
    - Minimum rate: 10% base rate
  - **Vị trí:** `contracts/rewards/RewardAccumulator.sol:72`
  - **Có thể thay đổi:** ✅ Có (qua `setDynamicRateParams()`)

### 2.3. Anti-Spam Protection
- **Minimum Time Elapsed:** `minimumTimeElapsed`
  - **Giá trị mặc định:** `60` = **60 seconds (1 minute)**
  - **Mục đích:** Thời gian tối thiểu giữa các lần tính reward để tránh spam
  - **Vị trí:** `contracts/rewards/RewardAccumulator.sol:68`
  - **Có thể thay đổi:** ✅ Có (qua `setAntiSpamParams()`)

- **Minimum Reward Amount:** `minimumRewardAmount`
  - **Giá trị mặc định:** `1e16` = **0.01 LENDX**
  - **Mục đích:** Số lượng reward tối thiểu để accumulate (tránh dust rewards)
  - **Vị trí:** `contracts/rewards/RewardAccumulator.sol:69`
  - **Có thể thay đổi:** ✅ Có (qua `setAntiSpamParams()`)

---

## 3. Tổng hợp các thông số

| Thông số | Giá trị | Đơn vị | File | Dòng |
|----------|---------|--------|------|------|
| **Daily Claim Limit** | 1,000 | LENDX/user/day | RewardDistributor.sol | 76 |
| **Reserve Pool %** | 20 | % | RewardDistributor.sol | 77 |
| **Max Reward Per User** | 10,000,000 | LENDX | RewardDistributor.sol | 79 |
| **Daily Emission Rate** | 100,000 | LENDX/day | RewardDistributor.sol | 82 |
| **Min Pool Balance** | 10,000,000 | LENDX | RewardDistributor.sol | 85 |
| **Target Pool Balance** | 50,000,000 | LENDX | RewardDistributor.sol | 86 |
| **Base Supply Rate** | 0.001 | LENDX/token/sec | RewardAccumulator.sol | 62 |
| **Base Borrow Rate** | 0.002 | LENDX/token/sec | RewardAccumulator.sol | 63 |
| **Min Pool Threshold** | 10,000,000 | LENDX | RewardAccumulator.sol | 72 |
| **Min Time Elapsed** | 60 | seconds | RewardAccumulator.sol | 68 |
| **Min Reward Amount** | 0.01 | LENDX | RewardAccumulator.sol | 69 |

---

## 4. Cơ chế hoạt động

### 4.1. Reward Calculation Flow
```
1. User supply/borrow → LendingPool gọi RewardAccumulator
2. RewardAccumulator tính reward:
   - Supply: balance × 0.001 × time_elapsed
   - Borrow: balance × 0.002 × time_elapsed
3. Kiểm tra anti-spam:
   - time_elapsed >= 60 seconds
   - reward >= 0.01 LENDX
4. Nếu đủ điều kiện → accumulate vào RewardDistributor
5. User claim → RewardDistributor kiểm tra:
   - dailyClaimLimit: tối đa 1,000 LENDX/day
   - maxRewardPerUser: tối đa 10M LENDX
   - reservePool: 20% dành cho user mới
```

### 4.2. Dynamic Rate Adjustment
```
Pool Balance >= 10M LENDX:
  → Rate = 100% base rate (0.001 supply, 0.002 borrow)

Pool Balance < 10M LENDX:
  → Rate = baseRate × (poolBalance / 10M)
  → Minimum: 10% base rate

Pool Balance = 0:
  → Rate = 0 (chờ emission bổ sung)
```

### 4.3. Daily Emission
```
Mỗi ngày:
1. processDailyEmission() được gọi
2. 100,000 LENDX được transfer/mint vào RewardDistributor
3. Pool được bổ sung
4. Reserve pool được tính lại (20% của pool mới)
```

---

## 5. Tính toán bền vững

### 5.1. Daily Emission vs Daily Claims
- **Daily Emission:** 100,000 LENDX/day
- **Daily Claim Limit:** 1,000 LENDX/user/day
- **Số user tối đa claim hết:** 100 users/day
- **Kết luận:** Nếu ≤ 100 users claim/ngày → Pool tăng hoặc ổn định

### 5.2. Pool Balance Projection
```
Scenario 1: 50 users claim/ngày
- Claims: 50 × 1,000 = 50,000 LENDX/day
- Emission: 100,000 LENDX/day
- Net: +50,000 LENDX/day → Pool tăng ✅

Scenario 2: 100 users claim/ngày
- Claims: 100 × 1,000 = 100,000 LENDX/day
- Emission: 100,000 LENDX/day
- Net: 0 LENDX/day → Pool ổn định ✅

Scenario 3: 150 users claim/ngày
- Claims: 150 × 1,000 = 150,000 LENDX/day
- Emission: 100,000 LENDX/day
- Net: -50,000 LENDX/day → Pool giảm
- Rate tự động giảm khi pool < 10M ✅
```

---

## 6. Khuyến nghị cho Production

### 6.1. Demo/Testing
- **Daily Claim Limit:** 1,000 LENDX/user/day ✅ (hiện tại)
- **Reserve Pool:** 20% ✅ (hiện tại)
- **Daily Emission:** 100,000 LENDX/day ✅ (hiện tại)

### 6.2. Production (nếu cần điều chỉnh)
- **Daily Claim Limit:** 500 LENDX/user/day (giảm để bền vững hơn)
- **Reserve Pool:** 20% (giữ nguyên)
- **Max Reward Per User:** 5M LENDX (giảm từ 10M)
- **Daily Emission:** 50,000 LENDX/day (giảm nếu cần)
- **Time-based Distribution:** 2 years (nếu implement vesting)

---

## 7. Functions để thay đổi thông số

### RewardDistributor
- `setDailyClaimLimit(uint256 _dailyClaimLimit)`
- `setReservePool(uint256 _percentage, bool _active)`
- `setMaxRewardPerUser(uint256 _maxRewardPerUser)`
- `setEmissionParams(uint256 _dailyEmissionRate, address _emissionSource, bool _active)`
- `setPoolBalanceTargets(uint256 _minPoolBalance, uint256 _targetPoolBalance)`

### RewardAccumulator
- `setRewardRates(uint256 _supplyRate, uint256 _borrowRate)`
- `setDynamicRateParams(uint256 _minPoolBalanceThreshold, bool _enabled)`
- `setAntiSpamParams(uint256 _minimumTimeElapsed, uint256 _minimumRewardAmount)`

---

## 8. Monitoring

### Check Pool Status
```solidity
(balance, daysSinceLastEmission, pendingEmission) = rewardDistributor.getPoolStatus();
```

### Check User Claimable
```solidity
claimable = rewardDistributor.getClaimableReward(user);
remainingToday = rewardDistributor.getRemainingDailyLimit(user);
```

### Check Current Rates
```solidity
supplyRate = rewardAccumulator.supplyRewardRatePerTokenPerSecond();
borrowRate = rewardAccumulator.borrowRewardRatePerTokenPerSecond();
```

---

## 9. Lưu ý quan trọng

1. **Tất cả các thông số đều có thể thay đổi** bởi owner qua các setter functions
2. **Dynamic rate adjustment** tự động điều chỉnh khi pool cạn
3. **Daily emission** cần được gọi mỗi ngày (có thể setup keeper bot)
4. **Reserve pool** được tính lại tự động sau mỗi emission
5. **Anti-spam protection** ngăn chặn spam transactions và dust rewards

---

## 10. Changelog

- **2024:** Initial standardization
  - Daily Claim Limit: 1,000 LENDX/user/day
  - Reserve Pool: 20%
  - Daily Emission: 100,000 LENDX/day
  - Base Supply Rate: 0.001 LENDX/token/sec
  - Base Borrow Rate: 0.002 LENDX/token/sec

---

**Tài liệu này được tạo để đảm bảo tính nhất quán và dễ dàng tham khảo cho tất cả các thông số reward system.**

