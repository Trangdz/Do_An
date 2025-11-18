# Cơ chế Phân phối Reward Công bằng

## Vấn đề hiện tại

**Tình huống:**
- RewardDistributor có 80M LENDX
- User đầu tiên vào sớm, supply nhiều, claim hết rewards
- User vào sau không có reward để claim

**Nguyên nhân:**
1. Không có giới hạn reward per user
2. Không có cơ chế phân phối theo thời gian
3. Rewards được accumulate không giới hạn
4. Không có reserve pool cho user mới

## Cơ chế hiện tại

### 1. **Reward Accumulation**
```
Reward = Balance × Rate × Time Elapsed
- Balance: Số token user supply/borrow
- Rate: 0.001 LENDX per token per second (supply)
- Time: Thời gian từ lần update trước
```

### 2. **Reward Distribution**
```
User claim → RewardDistributor transfer LENDX
- Không có giới hạn
- Không có rate limiting
- Không có time-based caps
```

## Giải pháp đề xuất

### **Giải pháp 1: Rate Limiting per User (Đề xuất)**

**Cơ chế:**
- Giới hạn reward mỗi user có thể claim trong một khoảng thời gian
- Ví dụ: Tối đa 10,000 LENDX/user/tháng

**Ưu điểm:**
- Đảm bảo công bằng
- User mới vẫn có cơ hội
- Dễ implement

**Nhược điểm:**
- User lớn có thể không claim hết
- Cần quản lý time windows

### **Giải pháp 2: Proportional Distribution (Theo tỷ lệ)**

**Cơ chế:**
- Phân phối reward theo tỷ lệ tổng supply/borrow của tất cả users
- Ví dụ: User có 10% tổng supply → nhận 10% reward pool

**Ưu điểm:**
- Công bằng theo contribution
- Tự động điều chỉnh

**Nhược điểm:**
- Phức tạp hơn
- Cần tính toán tổng supply/borrow

### **Giải pháp 3: Time-based Vesting (Phân phối dần)**

**Cơ chế:**
- Reward được unlock dần theo thời gian
- Ví dụ: 20% unlock ngay, 80% unlock trong 4 tháng

**Ưu điểm:**
- Đảm bảo reward pool tồn tại lâu dài
- Khuyến khích long-term participation

**Nhược điểm:**
- User phải đợi để claim đầy đủ
- Phức tạp hơn

### **Giải pháp 4: Reserve Pool + Daily Limits**

**Cơ chế:**
- Dành 20% reward pool cho user mới (reserve)
- Giới hạn daily claim per user
- Ví dụ: 1,000 LENDX/user/day

**Ưu điểm:**
- Đảm bảo user mới có reward
- Phân phối đều theo thời gian

**Nhược điểm:**
- Cần quản lý reserve pool
- Cần tracking daily limits

## Giải pháp Hybrid (Đề xuất triển khai)

Kết hợp nhiều cơ chế:

### **1. Daily Claim Limit**
```solidity
mapping(address => mapping(uint256 => uint256)) public dailyClaimed; // user => day => amount
uint256 public dailyClaimLimit = 1000e18; // 1,000 LENDX per day per user
```

### **2. Reserve Pool**
```solidity
uint256 public reservePoolPercentage = 20e18; // 20% (using 1e18 as 100%)
uint256 public reservePoolAmount; // Calculated dynamically: currentBalance * 20% / 100e18
bool public reservePoolActive = true;
```

### **3. Proportional Cap**
```solidity
uint256 public maxRewardPerUser = 10e24; // 10M LENDX max per user
```

### **4. Daily Emission (Đã implement)**
```solidity
uint256 public dailyEmissionRate = 100000e18; // 100,000 LENDX per day
uint256 public lastEmissionDay; // Last day when emission was processed
address public emissionSource; // Treasury or mint address
bool public emissionActive = true;
```

## Cơ chế đề xuất chi tiết

### **Cơ chế 1: Daily Claim Limit + Reserve Pool**

**Implementation:**
1. **Daily Limit**: Mỗi user chỉ claim tối đa 1,000 LENDX/ngày
2. **Reserve Pool**: 20% của pool balance hiện tại dành cho user mới (tính động)
3. **Main Pool**: 80% còn lại cho user hiện tại
4. **Daily Emission**: 100,000 LENDX/ngày tự động bổ sung pool

**Flow:**
```
User claim:
1. Check daily limit (1,000 LENDX/day)
2. Check reserve eligibility (nếu là user mới)
3. Claim từ main pool hoặc reserve pool
4. Update daily claimed
```

### **Cơ chế 2: Proportional Distribution với Cap**

**Implementation:**
1. Tính tổng supply/borrow của tất cả users
2. Tính tỷ lệ của user
3. Reward = min(userReward, maxRewardPerUser)
4. Phân phối theo tỷ lệ từ pool

**Flow:**
```
Calculate reward:
1. TotalSupply = sum(all users' supply)
2. UserRatio = userSupply / TotalSupply
3. UserReward = min(UserRatio * Pool, maxRewardPerUser)
4. Distribute UserReward
```

### **Cơ chế 3: Time-based Vesting**

**Implementation:**
1. Reward được accumulate vào vesting schedule
2. 20% unlock ngay
3. 80% unlock trong 4 tháng (linear)

**Flow:**
```
User claim:
1. Calculate vested amount
2. Claim vested portion
3. Remaining stays in vesting
```

## So sánh các giải pháp

| Giải pháp | Độ công bằng | Độ phức tạp | Hiệu quả | Khuyến khích long-term |
|-----------|-------------|-------------|----------|----------------------|
| Daily Limit + Reserve | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Proportional | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Vesting | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Hybrid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Khuyến nghị

**Cho Demo/Testing:**
- **Daily Claim Limit**: 1,000 LENDX/user/day ✅ (đã implement)
- **Reserve Pool**: 20% (tính động từ pool balance) ✅ (đã implement)
- **Daily Emission**: 100,000 LENDX/day ✅ (đã implement)
- Đơn giản, dễ test

**Cho Production:**
- **Hybrid Approach** (có thể điều chỉnh):
  - Daily Limit: 500 LENDX/user/day (có thể giảm từ 1,000)
  - Reserve Pool: 20% (giữ nguyên)
  - Max Reward per User: 5M LENDX (có thể giảm từ 10M)
  - Daily Emission: 50,000 LENDX/day (có thể giảm nếu cần)
  - Time-based vesting: Có thể implement thêm nếu cần

## Implementation Priority

1. ✅ **Daily Claim Limit** (Dễ, hiệu quả) - ✅ Đã implement
2. ✅ **Reserve Pool** (Quan trọng cho user mới) - ✅ Đã implement
3. ✅ **Daily Emission** (Bền vững) - ✅ Đã implement
4. ✅ **Dynamic Rate Adjustment** (Tự điều chỉnh) - ✅ Đã implement
5. ⚠️ **Proportional Cap** (Nếu cần công bằng hơn)
6. ⚠️ **Vesting** (Nếu cần long-term incentive)

## Cơ chế Bền vững (Đã implement)

Xem file `SUSTAINABLE_REWARD_MECHANISM.md` để biết chi tiết về:
- Daily Emission: 100,000 LENDX/ngày
- Dynamic Rate: Tự động điều chỉnh khi pool cạn
- Auto-replenish: Pool được bổ sung mỗi ngày

