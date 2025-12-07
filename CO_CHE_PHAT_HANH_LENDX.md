# 📊 Cơ Chế Phát Hành LENDX Token

## 🎯 Tổng Quan

**LENDX Token** là governance token của LendHub protocol, được phát hành để:
- Thưởng cho users sử dụng protocol (supply, borrow)
- Quyền bỏ phiếu trong governance
- Phân phối công bằng và bền vững

## 📋 Thông Số Token

### Tổng Supply
- **Total Supply:** 100,000,000 LENDX (100M tokens)
- **Initial Distribution:**
  - Team: 15M (locked in vesting)
  - User Rewards: 40M (in RewardDistributor)
  - DAO Treasury: 25M
  - Marketing/Investors: 20M

### Token Features
- **ERC20Votes:** Hỗ trợ voting power cho governance
- **ERC20Permit:** Hỗ trợ permit functionality
- **Mintable:** Chỉ owner có thể mint (cho emergency)

## 🔄 Cơ Chế Phát Hành

### 1. Initial Distribution

**LENDXToken.sol:**
```solidity
constructor(address initialOwner) {
    // Mint all 100M tokens to deployer
    _mint(initialOwner, TOTAL_SUPPLY);
}
```

- Tất cả 100M tokens được mint cho deployer
- Deployer sẽ phân phối cho các contracts:
  - RewardDistributor: 40M (cho user rewards)
  - DAO Treasury: 25M
  - Team: 15M (vesting)
  - Marketing/Investors: 20M

### 2. Daily Emission (Sustainable Emission)

**RewardDistributor.sol:**
```solidity
uint256 public dailyEmissionRate; // Default: 100,000 LENDX/day
uint256 public lastEmissionDay;
address public emissionSource; // Treasury or mint
bool public emissionActive;
```

**Cơ chế:**
- **Daily Emission Rate:** 100,000 LENDX/ngày (~36.5M/năm)
- **Emission Source:** 
  - Từ treasury (nếu có)
  - Hoặc mint trực tiếp (nếu owner của LENDXToken)
- **Process:** Gọi `processDailyEmission()` mỗi ngày để bổ sung pool

**Công thức:**
```solidity
uint256 daysToProcess = currentDay - lastEmissionDay;
uint256 emissionAmount = dailyEmissionRate * daysToProcess;
```

### 3. Reward Accumulation (Tính Toán Rewards)

**RewardAccumulator.sol:**

#### 3.1. Supply Rewards

**Công thức:**
```
Supply Reward = Supply Balance × Supply Rate × Time Elapsed
```

**Tham số:**
- **Supply Rate:** `1e15` = 0.001 LENDX per 1e18 token per second
- **Ví dụ:** 
  - Supply 1000 USDC (1e21) trong 1 ngày (86400 seconds)
  - Reward = 1e21 × 1e15 × 86400 / 1e18 = 86.4 LENDX

**Code:**
```solidity
uint256 supplyReward = (lastSupply * supplyRewardRatePerTokenPerSecond * timeElapsed) / 1e18;
```

#### 3.2. Borrow Rewards

**Công thức:**
```
Borrow Reward = Borrow Balance × Borrow Rate × Time Elapsed
```

**Tham số:**
- **Borrow Rate:** `2e15` = 0.002 LENDX per 1e18 token per second (2x supply rate)
- **Ví dụ:**
  - Borrow 1000 USDC (1e21) trong 1 ngày (86400 seconds)
  - Reward = 1e21 × 2e15 × 86400 / 1e18 = 172.8 LENDX

**Code:**
```solidity
uint256 borrowReward = (lastBorrow * borrowRewardRatePerTokenPerSecond * timeElapsed) / 1e18;
```

### 4. Dynamic Rate Adjustment

**Cơ chế điều chỉnh rate dựa trên pool balance:**

```solidity
if (poolBalance >= minPoolBalanceThreshold) {
    // Pool healthy: Use full base rates
    supplyRewardRatePerTokenPerSecond = baseSupplyRate;
    borrowRewardRatePerTokenPerSecond = baseBorrowRate;
} else {
    // Pool low: Reduce rates proportionally
    rateMultiplier = (poolBalance * 1e18) / minPoolBalanceThreshold;
    // Minimum 10% of base rate
    supplyRewardRatePerTokenPerSecond = (baseSupplyRate * rateMultiplier) / 1e18;
    borrowRewardRatePerTokenPerSecond = (baseBorrowRate * rateMultiplier) / 1e18;
}
```

**Tham số:**
- **Min Pool Balance:** 10M LENDX
- **Target Pool Balance:** 50M LENDX
- **Min Rate:** 10% của base rate

### 5. Anti-Spam Protection

**Tham số:**
- **Minimum Time Elapsed:** 60 seconds (1 phút)
- **Minimum Reward Amount:** 0.01 LENDX (1e16)

**Logic:**
```solidity
// Chỉ accumulate nếu:
// 1. Đủ thời gian (>= 60s), HOẶC
// 2. Reward đủ lớn (>= 0.01 LENDX)
if (timeElapsed >= minimumTimeElapsed || reward >= minimumRewardAmount) {
    rewardDistributor.accumulateReward(user, reward);
}
```

### 6. Fair Distribution Mechanism

**RewardDistributor.sol:**

#### 6.1. Daily Claim Limit
- **Default:** 1,000 LENDX/ngày/user
- **Mục đích:** Ngăn early users claim hết rewards

#### 6.2. Reserve Pool
- **Percentage:** 20% của total pool
- **Mục đích:** Dành cho new users

#### 6.3. Max Reward Per User
- **Default:** 10M LENDX/user
- **Mục đích:** Đảm bảo phân phối công bằng

## 📊 Flow Phát Hành

### Flow 1: User Supply/Borrow

```
1. User supply/borrow
   ↓
2. LendingPool._updateSupplyReward() / _updateBorrowReward()
   ↓
3. RewardAccumulator.updateSupplyBalance() / updateBorrowBalance()
   ↓
4. Tính reward: Balance × Rate × Time
   ↓
5. RewardDistributor.accumulateReward()
   ↓
6. Rewards[user] += amount
```

### Flow 2: User Claim

```
1. User gọi claimReward()
   ↓
2. Check daily limit (1,000 LENDX/day)
   ↓
3. Check max reward per user (10M LENDX)
   ↓
4. Transfer LENDX từ RewardDistributor → User
   ↓
5. Update rewards[user] -= claimAmount
```

### Flow 3: Daily Emission

```
1. Anyone gọi processDailyEmission()
   ↓
2. Calculate days since last emission
   ↓
3. Calculate emissionAmount = dailyEmissionRate × days
   ↓
4. Transfer từ emissionSource → RewardDistributor
   (hoặc mint nếu emissionSource = address(0))
   ↓
5. Update reserve pool amount
```

## 🧮 Công Thức Tính Reward

### Công Thức Tổng Quát

```
Total Reward = Supply Reward + Borrow Reward

Supply Reward = Σ(Supply_i × Supply Rate × Time_i)
Borrow Reward = Σ(Borrow_i × Borrow Rate × Time_i)
```

### Ví Dụ Cụ Thể

**Scenario:**
- Supply: 10,000 USDC (1e22) trong 7 ngày
- Borrow: 5,000 USDC (5e21) trong 7 ngày
- Time: 7 days = 604,800 seconds

**Tính toán:**
```
Supply Reward = 1e22 × 1e15 × 604800 / 1e18
              = 1e22 × 1e15 × 604800 / 1e18
              = 6,048 LENDX

Borrow Reward = 5e21 × 2e15 × 604800 / 1e18
              = 6,048 LENDX

Total Reward = 6,048 + 6,048 = 12,096 LENDX
```

## 📈 Tỷ Lệ Phát Hành

### Base Rates (Default)

- **Supply Rate:** 0.001 LENDX per 1e18 token per second
- **Borrow Rate:** 0.002 LENDX per 1e18 token per second (2x supply)

### Tính Theo Ngày

- **Supply:** 0.001 × 86400 = **86.4 LENDX per 1e18 token per day**
- **Borrow:** 0.002 × 86400 = **172.8 LENDX per 1e18 token per day**

### Tính Theo Năm

- **Supply:** 86.4 × 365 = **31,536 LENDX per 1e18 token per year**
- **Borrow:** 172.8 × 365 = **63,072 LENDX per 1e18 token per year**

## 🔒 Bảo Vệ và Giới Hạn

### 1. Daily Claim Limit
- **Limit:** 1,000 LENDX/ngày/user
- **Mục đích:** Ngăn early users claim hết pool

### 2. Reserve Pool
- **Percentage:** 20% của total pool
- **Mục đích:** Dành cho new users

### 3. Max Reward Per User
- **Limit:** 10M LENDX/user
- **Mục đích:** Đảm bảo phân phối công bằng

### 4. Dynamic Rate Adjustment
- **Min Pool Balance:** 10M LENDX
- **Rate Reduction:** Tỷ lệ với pool balance
- **Min Rate:** 10% của base rate

### 5. Anti-Spam
- **Min Time:** 60 seconds
- **Min Reward:** 0.01 LENDX

## 📝 Tóm Tắt

1. **Initial:** 100M tokens mint cho deployer
2. **Daily Emission:** 100K LENDX/ngày từ treasury hoặc mint
3. **Reward Calculation:** 
   - Supply: Balance × 0.001 LENDX/sec
   - Borrow: Balance × 0.002 LENDX/sec
4. **Fair Distribution:**
   - Daily limit: 1K LENDX/user/day
   - Reserve pool: 20%
   - Max per user: 10M LENDX
5. **Dynamic Adjustment:** Rate giảm nếu pool balance < 10M LENDX

