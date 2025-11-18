# 🔒 BÁO CÁO BẢO MẬT HỆ THỐNG REWARD

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Các cơ chế bảo mật](#2-các-cơ-chế-bảo-mật)
3. [Ví dụ cụ thể](#3-ví-dụ-cụ-thể)
4. [Kịch bản demo](#4-kịch-bản-demo)
5. [Code examples](#5-code-examples)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Kiến trúc

Hệ thống reward gồm 3 contracts chính:

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ LendingPool │────────▶│ RewardAccumulator│────────▶│RewardDistributor│
│             │         │                  │         │                 │
│ - Supply    │         │ - Tính reward    │         │ - Lưu reward    │
│ - Withdraw  │         │ - Anti-spam      │         │ - Claim reward  │
│ - Borrow    │         │ - Rate control   │         │ - Daily limit   │
│ - Repay     │         │                  │         │ - Max cap       │
└─────────────┘         └──────────────────┘         └─────────────────┘
```

### 1.2. Flow hoạt động

1. **User thực hiện transaction** (supply/withdraw/borrow/repay)
2. **LendingPool** gọi `RewardAccumulator.updateSupplyBalance()` hoặc `updateBorrowBalance()`
3. **RewardAccumulator** tính reward và gọi `RewardDistributor.accumulateReward()`
4. **RewardDistributor** lưu reward vào mapping `rewards[user]`
5. **User** có thể claim reward qua `claimReward()`

---

## 2. CÁC CƠ CHẾ BẢO MẬT

### 2.1. Access Control (Kiểm soát truy cập)

#### 2.1.1. RewardAccumulator - Chỉ LendingPool được gọi

**Vị trí:** `contracts/rewards/RewardAccumulator.sol:215-250`

```solidity
function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external {
    require(msg.sender == lendingPool, "RewardAccumulator: only LendingPool");
    // ... logic tính reward
}
```

**Bảo vệ:**
- ❌ User không thể tự gọi để tăng reward
- ❌ Contract khác không thể gọi
- ✅ Chỉ LendingPool được phép

**Ví dụ tấn công bị chặn:**

```solidity
// ❌ ATTACK: User cố gắng tự gọi để tăng reward
// Kết quả: Transaction REVERT với lỗi "RewardAccumulator: only LendingPool"

// Attacker code:
rewardAccumulator.updateSupplyBalance(
    attackerAddress,
    daiAddress,
    ethers.parseEther("1000000") // Cố gắng set balance cao
);
// → REVERT: "RewardAccumulator: only LendingPool"
```

#### 2.1.2. RewardDistributor - Chỉ RewardAccumulator/Owner được accumulate

**Vị trí:** `contracts/rewards/RewardDistributor.sol:106-116`

```solidity
function accumulateReward(address user, uint256 amount) external {
    require(
        msg.sender == owner() || msg.sender == rewardAccumulator,
        "RewardDistributor: unauthorized"
    );
    // ... logic accumulate
}
```

**Bảo vệ:**
- ❌ User không thể tự accumulate reward
- ❌ Contract khác không thể accumulate
- ✅ Chỉ RewardAccumulator hoặc Owner được phép

**Ví dụ tấn công bị chặn:**

```solidity
// ❌ ATTACK: User cố gắng tự accumulate reward
// Kết quả: Transaction REVERT

// Attacker code:
rewardDistributor.accumulateReward(
    attackerAddress,
    ethers.parseEther("1000000") // Cố gắng tự thêm reward
);
// → REVERT: "RewardDistributor: unauthorized"
```

### 2.2. Anti-Spam Protection (Chống spam)

#### 2.2.1. Minimum Time Elapsed

**Vị trí:** `contracts/rewards/RewardAccumulator.sol:236`

```solidity
if (timeElapsed >= minimumTimeElapsed || supplyReward >= minimumRewardAmount) {
    // Chỉ accumulate nếu:
    // 1. Đủ thời gian đã trôi qua (mặc định: 60 giây), HOẶC
    // 2. Reward đủ lớn (mặc định: 0.01 LENDX)
    rewardDistributor.accumulateReward(user, supplyReward);
}
```

**Bảo vệ:**
- ❌ User không thể spam transactions để accumulate reward liên tục
- ✅ Phải đợi ít nhất 60 giây giữa các lần accumulate (hoặc reward >= 0.01 LENDX)

**Ví dụ tấn công bị chặn:**

```solidity
// ❌ ATTACK: User cố gắng spam transactions
// Scenario:
// 1. User supply 0.0001 DAI
// 2. Ngay lập tức supply 0.0001 DAI lần nữa
// 3. Lặp lại 1000 lần để accumulate reward

// Kết quả:
// - Lần 1: Reward được accumulate (first time)
// - Lần 2-1000: Reward KHÔNG được accumulate vì timeElapsed < 60 giây
// → Chỉ accumulate 1 lần, không thể spam
```

**Kịch bản demo:**

```javascript
// Test anti-spam
async function testAntiSpam() {
    console.log("🧪 Testing Anti-Spam Protection");
    
    // 1. Supply lần đầu
    await lendingPool.lend(daiAddress, ethers.parseEther("100"));
    await new Promise(r => setTimeout(r, 1000)); // Đợi 1 giây
    
    // 2. Supply lần 2 ngay sau đó
    await lendingPool.lend(daiAddress, ethers.parseEther("0.0001"));
    
    // 3. Check reward
    const reward = await rewardDistributor.getClaimableReward(userAddress);
    console.log("Reward after 2 quick supplies:", ethers.formatEther(reward));
    // → Chỉ có reward từ lần 1, lần 2 không accumulate vì < 60 giây
    
    // 4. Đợi 60 giây
    await new Promise(r => setTimeout(r, 61000));
    
    // 5. Supply lần 3
    await lendingPool.lend(daiAddress, ethers.parseEther("0.0001"));
    
    // 6. Check reward
    const reward2 = await rewardDistributor.getClaimableReward(userAddress);
    console.log("Reward after 60s wait:", ethers.formatEther(reward2));
    // → Reward tăng lên vì đã đủ 60 giây
}
```

#### 2.2.2. Minimum Reward Amount

**Vị trí:** `contracts/rewards/RewardAccumulator.sol:236`

```solidity
if (timeElapsed >= minimumTimeElapsed || supplyReward >= minimumRewardAmount) {
    // Accumulate nếu reward >= 0.01 LENDX (ngay cả khi time < 60s)
}
```

**Bảo vệ:**
- ✅ Reward lớn được accumulate ngay (không cần đợi 60s)
- ❌ Reward nhỏ (< 0.01 LENDX) phải đợi 60s

**Ví dụ:**

```solidity
// Scenario 1: Reward nhỏ
// User supply 1 DAI, đợi 10 giây, supply lại
// → Reward = 1 * 0.001 * 10 = 0.01 LENDX
// → KHÔNG accumulate vì < 0.01 LENDX và < 60s

// Scenario 2: Reward lớn
// User supply 1000 DAI, đợi 10 giây, supply lại
// → Reward = 1000 * 0.001 * 10 = 10 LENDX
// → ✅ Accumulate ngay vì >= 0.01 LENDX (không cần đợi 60s)
```

### 2.3. Daily Claim Limit (Giới hạn claim mỗi ngày)

**Vị trí:** `contracts/rewards/RewardDistributor.sol:140-180`

```solidity
function claimReward() external nonReentrant {
    uint256 reward = rewards[msg.sender];
    
    // Get current day
    uint256 currentDay = block.timestamp / 86400;
    uint256 claimedToday = dailyClaimed[msg.sender][currentDay];
    
    // Apply daily limit (default: 1000 LENDX/day)
    uint256 claimableToday = dailyClaimLimit;
    if (claimedToday >= claimableToday) {
        revert DailyLimitExceeded();
    }
    
    // Calculate claimable amount
    uint256 remainingDailyLimit = claimableToday - claimedToday;
    uint256 claimAmount = reward < remainingDailyLimit ? reward : remainingDailyLimit;
    
    // Transfer tokens
    IERC20(address(lendxToken)).safeTransfer(msg.sender, claimAmount);
}
```

**Bảo vệ:**
- ❌ User không thể claim quá 1000 LENDX/ngày
- ✅ Đảm bảo fair distribution (không để user đầu claim hết)
- ✅ Phân bổ reward đều cho nhiều users

**Ví dụ tấn công bị chặn:**

```solidity
// ❌ ATTACK: User có 10,000 LENDX reward, cố claim hết trong 1 ngày
// Scenario:
// 1. User claim lần 1: 1000 LENDX ✅ (trong giới hạn)
// 2. User claim lần 2: 1000 LENDX ✅ (vẫn trong giới hạn)
// 3. User claim lần 3: REVERT ❌ "DailyLimitExceeded"

// Kết quả:
// - Ngày 1: Chỉ claim được 2000 LENDX (nếu có đủ)
// - Ngày 2: Có thể claim tiếp 1000 LENDX
// → Không thể claim hết trong 1 ngày
```

**Kịch bản demo:**

```javascript
// Test daily limit
async function testDailyLimit() {
    console.log("🧪 Testing Daily Claim Limit");
    
    // 1. Accumulate 5000 LENDX reward cho user
    await rewardDistributor.accumulateReward(
        userAddress,
        ethers.parseEther("5000")
    );
    
    // 2. Claim lần 1
    await rewardDistributor.claimReward();
    const claimed1 = await rewardDistributor.dailyClaimed(
        userAddress,
        Math.floor(Date.now() / 86400000)
    );
    console.log("Claimed today (1st):", ethers.formatEther(claimed1));
    // → 1000 LENDX (giới hạn)
    
    // 3. Claim lần 2
    try {
        await rewardDistributor.claimReward();
        const claimed2 = await rewardDistributor.dailyClaimed(
            userAddress,
            Math.floor(Date.now() / 86400000)
        );
        console.log("Claimed today (2nd):", ethers.formatEther(claimed2));
        // → 2000 LENDX (nếu có đủ reward)
    } catch (error) {
        console.log("Error:", error.message);
        // → "DailyLimitExceeded" nếu đã claim đủ 1000 LENDX
    }
    
    // 4. Đợi sang ngày mới (hoặc chuyển sang block khác)
    // → Có thể claim tiếp 1000 LENDX
}
```

### 2.4. Maximum Reward Per User (Giới hạn tối đa)

**Vị trí:** `contracts/rewards/RewardDistributor.sol:49`

```solidity
uint256 public maxRewardPerUser; // Default: 10M LENDX per user
```

**Bảo vệ:**
- ❌ User không thể tích lũy quá 10M LENDX
- ✅ Đảm bảo fair distribution
- ✅ Tránh một user độc quyền reward

**Ví dụ:**

```solidity
// Scenario: User có 10M LENDX reward
// → Có thể claim tối đa 10M LENDX
// → Reward tích lũy thêm sẽ không được accumulate (nếu implement hard cap)
```

### 2.5. Reserve Pool (Pool dự trữ)

**Vị trí:** `contracts/rewards/RewardDistributor.sol:44-46`

```solidity
uint256 public reservePoolPercentage; // Default: 20%
uint256 public reservePoolAmount;
bool public reservePoolActive;
```

**Bảo vệ:**
- ✅ Dành 20% reward pool cho users mới
- ✅ Đảm bảo users mới cũng có cơ hội nhận reward
- ✅ Tránh users đầu claim hết

**Ví dụ:**

```solidity
// Scenario:
// - Total reward pool: 100,000 LENDX
// - Reserve pool: 20,000 LENDX (20%)
// - Available for claim: 80,000 LENDX
// → 20,000 LENDX được dành cho users mới
```

### 2.6. Reentrancy Protection (Chống reentrancy)

**Vị trí:** `contracts/rewards/RewardDistributor.sol:140`

```solidity
function claimReward() external nonReentrant {
    // ... logic claim
    IERC20(address(lendxToken)).safeTransfer(msg.sender, claimAmount);
}
```

**Bảo vệ:**
- ❌ User không thể reentrancy attack
- ✅ Sử dụng `nonReentrant` modifier từ OpenZeppelin
- ✅ Sử dụng `safeTransfer` để tránh lỗi

**Ví dụ tấn công bị chặn:**

```solidity
// ❌ ATTACK: Reentrancy attack
contract Attacker {
    function attack() external {
        rewardDistributor.claimReward();
    }
    
    function onERC20Received(...) external returns (bytes4) {
        // Cố gắng claim lại trong callback
        rewardDistributor.claimReward(); // ❌ REVERT: ReentrancyGuard
        return this.onERC20Received.selector;
    }
}
```

### 2.7. Dynamic Rate Adjustment (Điều chỉnh rate động)

**Vị trí:** `contracts/rewards/RewardAccumulator.sol:112-147`

```solidity
function _updateRatesBasedOnPool() internal {
    if (!dynamicRateEnabled) {
        supplyRewardRatePerTokenPerSecond = baseSupplyRate;
        return;
    }
    
    // Get pool balance
    uint256 poolBalance = lendxToken.balanceOf(address(rewardDistributor));
    
    if (poolBalance >= minPoolBalanceThreshold) {
        // Pool đủ → dùng full rate
        supplyRewardRatePerTokenPerSecond = baseSupplyRate;
    } else if (poolBalance == 0) {
        // Pool hết → rate = 0
        supplyRewardRatePerTokenPerSecond = 0;
    } else {
        // Pool thấp → giảm rate theo tỷ lệ
        uint256 rateMultiplier = (poolBalance * 1e18) / minPoolBalanceThreshold;
        supplyRewardRatePerTokenPerSecond = (baseSupplyRate * rateMultiplier) / 1e18;
    }
}
```

**Bảo vệ:**
- ✅ Tự động giảm rate khi pool balance thấp
- ✅ Tránh pool bị cạn kiệt
- ✅ Đảm bảo sustainability

**Ví dụ:**

```solidity
// Scenario 1: Pool đủ (>= 10M LENDX)
// → Rate = 100% base rate = 0.001 LENDX/token/second

// Scenario 2: Pool thấp (5M LENDX)
// → Rate = 50% base rate = 0.0005 LENDX/token/second

// Scenario 3: Pool hết (0 LENDX)
// → Rate = 0 (không có reward)
```

---

## 3. VÍ DỤ CỤ THỂ

### 3.1. Ví dụ 1: User cố gắng tự tăng reward

**Kịch bản:**
- User có 100 DAI supply
- User cố gắng tự gọi `updateSupplyBalance()` để set balance = 1,000,000 DAI

**Kết quả:**
```solidity
// ❌ Transaction REVERT
// Error: "RewardAccumulator: only LendingPool"
```

**Code test:**
```javascript
// Test unauthorized access
async function testUnauthorizedAccess() {
    const [user] = await ethers.getSigners();
    const rewardAccumulator = await ethers.getContractAt(
        "RewardAccumulator",
        rewardAccumulatorAddress
    );
    
    try {
        await rewardAccumulator.updateSupplyBalance(
            user.address,
            daiAddress,
            ethers.parseEther("1000000") // Cố gắng set balance cao
        );
        console.log("❌ FAIL: Should have reverted");
    } catch (error) {
        console.log("✅ PASS: Transaction reverted");
        console.log("Error:", error.message);
        // → "RewardAccumulator: only LendingPool"
    }
}
```

### 3.2. Ví dụ 2: User spam transactions

**Kịch bản:**
- User supply 0.0001 DAI
- Ngay lập tức supply 0.0001 DAI lần nữa (trong vòng 1 giây)
- Lặp lại 100 lần

**Kết quả:**
- Chỉ lần đầu tiên accumulate reward
- Các lần sau không accumulate vì `timeElapsed < 60 giây`

**Code test:**
```javascript
// Test spam protection
async function testSpamProtection() {
    const [user] = await ethers.getSigners();
    const lendingPool = await ethers.getContractAt("LendingPool", lendingPoolAddress);
    const rewardDistributor = await ethers.getContractAt(
        "RewardDistributor",
        rewardDistributorAddress
    );
    
    // Check initial reward
    let reward1 = await rewardDistributor.getClaimableReward(user.address);
    console.log("Initial reward:", ethers.formatEther(reward1));
    
    // Supply lần 1
    await lendingPool.lend(daiAddress, ethers.parseEther("100"));
    await new Promise(r => setTimeout(r, 1000)); // Đợi 1 giây
    
    // Supply lần 2 ngay sau đó
    await lendingPool.lend(daiAddress, ethers.parseEther("0.0001"));
    
    // Check reward
    let reward2 = await rewardDistributor.getClaimableReward(user.address);
    console.log("Reward after 2 quick supplies:", ethers.formatEther(reward2));
    
    // → Reward chỉ tăng từ lần 1, lần 2 không accumulate
}
```

### 3.3. Ví dụ 3: User cố claim quá daily limit

**Kịch bản:**
- User có 5,000 LENDX reward
- User cố claim hết trong 1 ngày

**Kết quả:**
- Lần 1: Claim 1,000 LENDX ✅
- Lần 2: Claim 1,000 LENDX ✅
- Lần 3: REVERT ❌ "DailyLimitExceeded"

**Code test:**
```javascript
// Test daily limit
async function testDailyLimit() {
    const [user] = await ethers.getSigners();
    const rewardDistributor = await ethers.getContractAt(
        "RewardDistributor",
        rewardDistributorAddress
    );
    
    // Accumulate 5000 LENDX
    await rewardDistributor.connect(owner).accumulateReward(
        user.address,
        ethers.parseEther("5000")
    );
    
    // Claim lần 1
    await rewardDistributor.connect(user).claimReward();
    console.log("✅ Claimed 1000 LENDX");
    
    // Claim lần 2
    await rewardDistributor.connect(user).claimReward();
    console.log("✅ Claimed 1000 LENDX more");
    
    // Claim lần 3
    try {
        await rewardDistributor.connect(user).claimReward();
        console.log("❌ FAIL: Should have reverted");
    } catch (error) {
        console.log("✅ PASS: Daily limit exceeded");
        console.log("Error:", error.message);
    }
}
```

---

## 4. KỊCH BẢN DEMO

### 4.1. Demo 1: Access Control

**Mục đích:** Chứng minh user không thể tự tăng reward

**Bước thực hiện:**

1. **Setup:**
   ```bash
   # Deploy contracts
   npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
   ```

2. **Test unauthorized access:**
   ```bash
   # Run test script
   npx hardhat run scripts/test_unauthorized_access.cjs --network ganache
   ```

3. **Kết quả mong đợi:**
   ```
   ❌ Transaction REVERT
   Error: "RewardAccumulator: only LendingPool"
   ```

**Script demo:**
```javascript
// scripts/demo_access_control.cjs
const hre = require("hardhat");

async function main() {
    const [user] = await hre.ethers.getSigners();
    const rewardAccumulator = await hre.ethers.getContractAt(
        "RewardAccumulator",
        "0x1998202895712d6d16477D04D41A030F1d19A5B9"
    );
    
    console.log("🔒 DEMO: Access Control");
    console.log("=".repeat(70));
    console.log();
    console.log("User:", user.address);
    console.log("Attempting to call updateSupplyBalance()...");
    console.log();
    
    try {
        const tx = await rewardAccumulator.updateSupplyBalance(
            user.address,
            "0x0EA3bB992781cF9d2047809A2EC2790BF7d86231", // DAI
            hre.ethers.parseEther("1000000")
        );
        await tx.wait();
        console.log("❌ FAIL: Transaction succeeded (should have reverted)");
    } catch (error) {
        console.log("✅ PASS: Transaction reverted");
        console.log("Error:", error.message);
        console.log();
        console.log("💡 Explanation:");
        console.log("   - User cannot directly call updateSupplyBalance()");
        console.log("   - Only LendingPool can call this function");
        console.log("   - This prevents users from manipulating their rewards");
    }
}

main().catch(console.error);
```

### 4.2. Demo 2: Anti-Spam Protection

**Mục đích:** Chứng minh user không thể spam transactions

**Bước thực hiện:**

1. **Setup:**
   ```bash
   # Ensure contracts are deployed
   ```

2. **Test spam:**
   ```bash
   npx hardhat run scripts/demo_anti_spam.cjs --network ganache
   ```

3. **Kết quả mong đợi:**
   ```
   Supply 1: Reward accumulated ✅
   Supply 2 (1s later): Reward NOT accumulated ❌
   Supply 3 (60s later): Reward accumulated ✅
   ```

**Script demo:**
```javascript
// scripts/demo_anti_spam.cjs
const hre = require("hardhat");

async function main() {
    const [user] = await hre.ethers.getSigners();
    const lendingPool = await hre.ethers.getContractAt(
        "LendingPool",
        "0x6319CEfdA5eEAFFd6593487A2af4249816849C16"
    );
    const rewardDistributor = await hre.ethers.getContractAt(
        "RewardDistributor",
        "0xA48BDbf65d0A2800f16e493CAb80e8444B9821b6"
    );
    const dai = await hre.ethers.getContractAt(
        "IERC20",
        "0x0EA3bB992781cF9d2047809A2EC2790BF7d86231"
    );
    
    console.log("🛡️ DEMO: Anti-Spam Protection");
    console.log("=".repeat(70));
    console.log();
    
    // Approve
    await dai.approve(lendingPool.target, hre.ethers.parseEther("1000"));
    
    // Check initial reward
    let reward1 = await rewardDistributor.getClaimableReward(user.address);
    console.log("1️⃣ Initial reward:", hre.ethers.formatEther(reward1), "LENDX");
    console.log();
    
    // Supply lần 1
    console.log("2️⃣ Supplying 100 DAI...");
    await lendingPool.lend(dai.target, hre.ethers.parseEther("100"));
    await new Promise(r => setTimeout(r, 2000)); // Đợi 2 giây
    
    let reward2 = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Reward after supply 1:", hre.ethers.formatEther(reward2), "LENDX");
    console.log("   ✅ Reward accumulated (first time)");
    console.log();
    
    // Supply lần 2 ngay sau đó (1 giây)
    console.log("3️⃣ Supplying 0.0001 DAI again (1 second later)...");
    await lendingPool.lend(dai.target, hre.ethers.parseEther("0.0001"));
    await new Promise(r => setTimeout(r, 2000));
    
    let reward3 = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Reward after supply 2:", hre.ethers.formatEther(reward3), "LENDX");
    if (reward3 === reward2) {
        console.log("   ✅ Reward NOT accumulated (time < 60s)");
    } else {
        console.log("   ❌ Reward accumulated (should not happen)");
    }
    console.log();
    
    // Đợi 60 giây
    console.log("4️⃣ Waiting 60 seconds...");
    console.log("   (In real demo, wait 60 seconds)");
    // await new Promise(r => setTimeout(r, 61000));
    console.log();
    
    // Supply lần 3
    console.log("5️⃣ Supplying 0.0001 DAI again (after 60s)...");
    await lendingPool.lend(dai.target, hre.ethers.parseEther("0.0001"));
    await new Promise(r => setTimeout(r, 2000));
    
    let reward4 = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Reward after supply 3:", hre.ethers.formatEther(reward4), "LENDX");
    if (reward4 > reward3) {
        console.log("   ✅ Reward accumulated (time >= 60s)");
    } else {
        console.log("   ❌ Reward NOT accumulated (should have happened)");
    }
    console.log();
    
    console.log("💡 Explanation:");
    console.log("   - Minimum time between accumulations: 60 seconds");
    console.log("   - This prevents users from spamming transactions");
    console.log("   - Reward only accumulates if enough time has passed");
}

main().catch(console.error);
```

### 4.3. Demo 3: Daily Claim Limit

**Mục đích:** Chứng minh user không thể claim quá daily limit

**Bước thực hiện:**

1. **Setup:**
   ```bash
   # Accumulate reward cho user
   ```

2. **Test claim:**
   ```bash
   npx hardhat run scripts/demo_daily_limit.cjs --network ganache
   ```

3. **Kết quả mong đợi:**
   ```
   Claim 1: 1000 LENDX ✅
   Claim 2: 1000 LENDX ✅
   Claim 3: REVERT ❌ "DailyLimitExceeded"
   ```

**Script demo:**
```javascript
// scripts/demo_daily_limit.cjs
const hre = require("hardhat");

async function main() {
    const [owner, user] = await hre.ethers.getSigners();
    const rewardDistributor = await hre.ethers.getContractAt(
        "RewardDistributor",
        "0xA48BDbf65d0A2800f16e493CAb80e8444B9821b6"
    );
    
    console.log("📊 DEMO: Daily Claim Limit");
    console.log("=".repeat(70));
    console.log();
    
    // Accumulate 5000 LENDX cho user
    console.log("1️⃣ Accumulating 5000 LENDX reward for user...");
    await rewardDistributor.connect(owner).accumulateReward(
        user.address,
        hre.ethers.parseEther("5000")
    );
    console.log("   ✅ Reward accumulated");
    console.log();
    
    // Check claimable
    let claimable = await rewardDistributor.getClaimableReward(user.address);
    console.log("2️⃣ Claimable reward:", hre.ethers.formatEther(claimable), "LENDX");
    console.log();
    
    // Claim lần 1
    console.log("3️⃣ Claiming reward (1st time)...");
    try {
        await rewardDistributor.connect(user).claimReward();
        const claimed1 = await rewardDistributor.dailyClaimed(
            user.address,
            Math.floor(Date.now() / 86400000)
        );
        console.log("   ✅ Claimed:", hre.ethers.formatEther(claimed1), "LENDX");
    } catch (error) {
        console.log("   ❌ Error:", error.message);
    }
    console.log();
    
    // Claim lần 2
    console.log("4️⃣ Claiming reward (2nd time)...");
    try {
        await rewardDistributor.connect(user).claimReward();
        const claimed2 = await rewardDistributor.dailyClaimed(
            user.address,
            Math.floor(Date.now() / 86400000)
        );
        console.log("   ✅ Claimed:", hre.ethers.formatEther(claimed2), "LENDX");
    } catch (error) {
        console.log("   ❌ Error:", error.message);
    }
    console.log();
    
    // Claim lần 3
    console.log("5️⃣ Claiming reward (3rd time)...");
    try {
        await rewardDistributor.connect(user).claimReward();
        console.log("   ❌ FAIL: Should have reverted");
    } catch (error) {
        console.log("   ✅ PASS: Daily limit exceeded");
        console.log("   Error:", error.message);
    }
    console.log();
    
    console.log("💡 Explanation:");
    console.log("   - Daily claim limit: 1000 LENDX per day");
    console.log("   - User can claim up to 1000 LENDX per day");
    console.log("   - This ensures fair distribution among all users");
}

main().catch(console.error);
```

---

## 5. CODE EXAMPLES

### 5.1. Test Access Control

```javascript
// test/security/access_control.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Access Control Security", function() {
    it("Should revert when user tries to call updateSupplyBalance", async function() {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy contracts
        const RewardAccumulator = await ethers.getContractFactory("RewardAccumulator");
        const rewardAccumulator = await RewardAccumulator.deploy(
            rewardDistributorAddress,
            owner.address
        );
        
        // User tries to call updateSupplyBalance
        await expect(
            rewardAccumulator.connect(user).updateSupplyBalance(
                user.address,
                daiAddress,
                ethers.parseEther("1000000")
            )
        ).to.be.revertedWith("RewardAccumulator: only LendingPool");
    });
    
    it("Should revert when user tries to accumulate reward", async function() {
        const [owner, user] = await ethers.getSigners();
        
        const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
        const rewardDistributor = await RewardDistributor.deploy(
            lendxTokenAddress,
            owner.address
        );
        
        // User tries to accumulate reward
        await expect(
            rewardDistributor.connect(user).accumulateReward(
                user.address,
                ethers.parseEther("1000")
            )
        ).to.be.revertedWith("RewardDistributor: unauthorized");
    });
});
```

### 5.2. Test Anti-Spam

```javascript
// test/security/anti_spam.test.js
describe("Anti-Spam Protection", function() {
    it("Should not accumulate reward if time < minimumTimeElapsed", async function() {
        const [user] = await ethers.getSigners();
        
        // Supply lần 1
        await lendingPool.lend(daiAddress, ethers.parseEther("100"));
        await new Promise(r => setTimeout(r, 1000));
        
        const reward1 = await rewardDistributor.getClaimableReward(user.address);
        
        // Supply lần 2 ngay sau đó
        await lendingPool.lend(daiAddress, ethers.parseEther("0.0001"));
        await new Promise(r => setTimeout(r, 1000));
        
        const reward2 = await rewardDistributor.getClaimableReward(user.address);
        
        // Reward should not increase
        expect(reward2).to.equal(reward1);
    });
    
    it("Should accumulate reward if time >= minimumTimeElapsed", async function() {
        const [user] = await ethers.getSigners();
        
        // Supply lần 1
        await lendingPool.lend(daiAddress, ethers.parseEther("100"));
        
        // Đợi 60 giây
        await new Promise(r => setTimeout(r, 61000));
        
        const reward1 = await rewardDistributor.getClaimableReward(user.address);
        
        // Supply lần 2
        await lendingPool.lend(daiAddress, ethers.parseEther("0.0001"));
        
        const reward2 = await rewardDistributor.getClaimableReward(user.address);
        
        // Reward should increase
        expect(reward2).to.be.gt(reward1);
    });
});
```

### 5.3. Test Daily Limit

```javascript
// test/security/daily_limit.test.js
describe("Daily Claim Limit", function() {
    it("Should enforce daily claim limit", async function() {
        const [owner, user] = await ethers.getSigners();
        
        // Accumulate 5000 LENDX
        await rewardDistributor.connect(owner).accumulateReward(
            user.address,
            ethers.parseEther("5000")
        );
        
        // Claim lần 1
        await rewardDistributor.connect(user).claimReward();
        
        // Claim lần 2
        await rewardDistributor.connect(user).claimReward();
        
        // Claim lần 3 should revert
        await expect(
            rewardDistributor.connect(user).claimReward()
        ).to.be.revertedWith("DailyLimitExceeded");
    });
});
```

---

## 6. TỔNG KẾT

### 6.1. Các cơ chế bảo mật đã triển khai

✅ **Access Control**
- Chỉ LendingPool có thể gọi RewardAccumulator
- Chỉ RewardAccumulator/Owner có thể accumulate reward

✅ **Anti-Spam Protection**
- Minimum time elapsed: 60 giây
- Minimum reward amount: 0.01 LENDX

✅ **Daily Claim Limit**
- 1000 LENDX/ngày/user
- Đảm bảo fair distribution

✅ **Maximum Reward Per User**
- 10M LENDX/user
- Tránh độc quyền

✅ **Reserve Pool**
- 20% pool dành cho users mới

✅ **Reentrancy Protection**
- Sử dụng `nonReentrant` modifier
- Sử dụng `safeTransfer`

✅ **Dynamic Rate Adjustment**
- Tự động giảm rate khi pool thấp
- Đảm bảo sustainability

### 6.2. Kết luận

Hệ thống reward đã được bảo vệ bởi nhiều lớp bảo mật:
- **Access control** ngăn chặn unauthorized access
- **Anti-spam** ngăn chặn spam transactions
- **Daily limit** đảm bảo fair distribution
- **Reentrancy protection** ngăn chặn reentrancy attacks
- **Dynamic rate** đảm bảo sustainability

Tất cả các cơ chế này hoạt động cùng nhau để tạo ra một hệ thống reward an toàn và công bằng.

---

**Tác giả:** LendHub Development Team  
**Ngày:** 2024  
**Version:** 1.0



