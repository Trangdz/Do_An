# Cơ chế Reward Bền vững (Sustainable Reward Mechanism)

## Vấn đề

**Tình huống:**
- RewardDistributor có 80M LENDX ban đầu
- User đầu claim hết → Pool cạn
- User mới không có reward

**Nguyên nhân:**
- Pool có hạn (80M LENDX)
- Không có cơ chế bổ sung
- Reward rate không điều chỉnh

## Giải pháp: 3 lớp bảo vệ

### **Lớp 1: Daily Claim Limit**
- Mỗi user chỉ claim tối đa 1,000 LENDX/ngày
- Kéo dài thời gian pool tồn tại
- Đảm bảo công bằng

### **Lớp 2: Daily Emission (Phát hành hàng ngày)**
- **Mặc định: 100,000 LENDX/ngày** (~36.5M/năm)
- Tự động bổ sung pool mỗi ngày
- Có thể từ treasury hoặc mint

**Cơ chế:**
```
Mỗi ngày:
1. processDailyEmission() được gọi (bất kỳ ai cũng có thể gọi)
2. 100,000 LENDX được transfer/mint vào RewardDistributor
3. Pool được bổ sung
4. User mới vẫn có reward
```

### **Lớp 3: Dynamic Rate Adjustment (Điều chỉnh rate động)**
- Rate tự động giảm khi pool cạn
- Đảm bảo pool không bao giờ hết hoàn toàn
- Tự động phục hồi khi pool được bổ sung

**Cơ chế:**
```
Pool Balance >= 10M LENDX:
  → Rate = 100% base rate (0.001 LENDX/token/sec)

Pool Balance < 10M LENDX:
  → Rate = (poolBalance / 10M) * baseRate
  → Minimum: 10% base rate

Pool Balance = 0:
  → Rate = 0 (tạm thời, chờ emission bổ sung)
```

## Cách hoạt động tổng thể

### **Scenario 1: Pool đầy đủ**
```
Day 1:
- Pool: 80M LENDX
- Emission: +100K LENDX
- User A claim: 1,000 LENDX
- Pool: 80.1M LENDX (tăng!)
- Rate: 100% (full rate)

Day 2:
- Emission: +100K LENDX
- User A claim: 1,000 LENDX
- User B claim: 1,000 LENDX
- Pool: 80.2M LENDX (vẫn tăng!)
```

### **Scenario 2: Pool cạn dần (nếu không có emission)**
```
Day 1:
- Pool: 80M LENDX
- 100 users claim: 100K LENDX
- Pool: 79.9M LENDX
- Rate: 100%

Day 100:
- Pool: 70M LENDX
- Rate: 100% (vẫn đủ)

Day 200:
- Pool: 60M LENDX
- Rate: 100% (vẫn đủ)

Day 500:
- Pool: 30M LENDX
- Rate: 100% (vẫn đủ)

Day 700:
- Pool: 10M LENDX
- Rate: 100% (đúng threshold)

Day 800:
- Pool: 0M LENDX
- Rate: 0% (tạm thời)
- Chờ emission bổ sung
```

### **Scenario 3: Với Daily Emission (Bền vững)**
```
Day 1:
- Pool: 80M LENDX
- Emission: +100K
- Claims: -100K
- Pool: 80M LENDX (cân bằng!)

Day 100:
- Pool: 80M LENDX (vẫn ổn định!)
- Rate: 100%

Day 1000:
- Pool: 80M LENDX (vẫn ổn định!)
- Rate: 100%
- ✅ Bền vững!
```

## Tính toán bền vững

### **Daily Emission Rate: 100,000 LENDX/ngày**

**Nếu tất cả users claim hết daily limit:**
- 100 users × 1,000 LENDX = 100,000 LENDX/ngày
- Emission: 100,000 LENDX/ngày
- **Cân bằng!** ✅

**Nếu ít users claim:**
- 10 users × 1,000 LENDX = 10,000 LENDX/ngày
- Emission: 100,000 LENDX/ngày
- Pool tăng: +90,000 LENDX/ngày
- **Pool tăng!** ✅

**Nếu nhiều users claim:**
- 200 users × 1,000 LENDX = 200,000 LENDX/ngày
- Emission: 100,000 LENDX/ngày
- Pool giảm: -100,000 LENDX/ngày
- Rate tự động giảm khi pool < 10M
- **Tự điều chỉnh!** ✅

## Cấu hình

### **Emission Source Options:**

**Option 1: Treasury (Đề xuất)**
```solidity
// Set treasury as emission source
rewardDistributor.setEmissionParams(
    100000e18,  // 100K LENDX/day
    treasuryAddress,  // Treasury address
    true  // Active
);

// Treasury cần approve RewardDistributor để transfer
lendxToken.approve(rewardDistributorAddress, type(uint256).max);
```

**Option 2: Mint (Nếu cần)**
```solidity
// Set mint as emission source (owner mints)
rewardDistributor.setEmissionParams(
    100000e18,  // 100K LENDX/day
    address(0),  // No source = mint directly
    true  // Active
);
// Owner cần có quyền mint
```

### **Auto-process Emission:**

Có thể setup một keeper bot hoặc cron job để gọi `processDailyEmission()` mỗi ngày:

```javascript
// Script để process emission
async function processEmission() {
  await rewardDistributor.processDailyEmission();
}
// Chạy mỗi ngày lúc 00:00 UTC
```

## Kết quả

### ✅ **Bền vững:**
- Pool không bao giờ hết hoàn toàn
- Daily emission đảm bảo pool luôn được bổ sung
- Rate tự động điều chỉnh

### ✅ **Công bằng:**
- Daily limit đảm bảo mọi user có cơ hội
- Reserve pool cho user mới
- Dynamic rate đảm bảo pool không cạn

### ✅ **Tự động:**
- Rate tự động điều chỉnh
- Emission có thể tự động (nếu có keeper)
- Không cần can thiệp thủ công

## Monitoring

Có thể check pool status:

```solidity
(balance, daysSinceLastEmission, pendingEmission) = rewardDistributor.getPoolStatus();
```

**Nếu `daysSinceLastEmission > 1`:**
- Cần gọi `processDailyEmission()` để bổ sung pool

**Nếu `balance < minPoolBalance`:**
- Rate sẽ tự động giảm
- Cần tăng emission rate hoặc bổ sung thủ công












