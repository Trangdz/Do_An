# Thông số Reward System - Quick Reference

## 📊 Bảng tóm tắt nhanh

| Thông số | Giá trị | Mô tả |
|----------|---------|-------|
| **Daily Claim Limit** | 1,000 LENDX/user/day | Giới hạn claim mỗi ngày |
| **Reserve Pool** | 20% | Phần dành cho user mới |
| **Max Reward Per User** | 10M LENDX | Tổng reward tối đa/user |
| **Daily Emission** | 100,000 LENDX/day | Phát hành hàng ngày |
| **Base Supply Rate** | 0.001 LENDX/token/sec | Rate cho supply |
| **Base Borrow Rate** | 0.002 LENDX/token/sec | Rate cho borrow (2x supply) |
| **Min Pool Balance** | 10M LENDX | Ngưỡng tối thiểu |
| **Target Pool Balance** | 50M LENDX | Mục tiêu pool |
| **Min Time Elapsed** | 60 seconds | Thời gian tối thiểu giữa các lần tính |
| **Min Reward Amount** | 0.01 LENDX | Reward tối thiểu để accumulate |

## 🔧 Các hàm thay đổi thông số

### RewardDistributor
```solidity
setDailyClaimLimit(uint256)           // Thay đổi daily limit
setReservePool(uint256, bool)          // Thay đổi reserve pool %
setMaxRewardPerUser(uint256)           // Thay đổi max reward/user
setEmissionParams(uint256, address, bool) // Thay đổi emission rate
setPoolBalanceTargets(uint256, uint256)   // Thay đổi pool thresholds
```

### RewardAccumulator
```solidity
setRewardRates(uint256, uint256)              // Thay đổi supply/borrow rates
setDynamicRateParams(uint256, bool)           // Thay đổi dynamic rate
setAntiSpamParams(uint256, uint256)           // Thay đổi anti-spam params
```

## 📈 Tính toán ví dụ

### Supply Reward
```
1000 tokens × 0.001 LENDX/token/sec × 60 seconds = 60 LENDX
```

### Borrow Reward
```
1000 tokens × 0.002 LENDX/token/sec × 60 seconds = 120 LENDX
```

### Daily Emission vs Claims
```
100 users × 1,000 LENDX = 100,000 LENDX/day (cân bằng với emission)
```

## 📁 File liên quan

- `REWARD_PARAMETERS_STANDARD.md` - Tài liệu chi tiết đầy đủ
- `REWARD_DISTRIBUTION_MECHANISM.md` - Cơ chế phân phối
- `SUSTAINABLE_REWARD_MECHANISM.md` - Cơ chế bền vững
- `contracts/rewards/RewardDistributor.sol` - Contract chính
- `contracts/rewards/RewardAccumulator.sol` - Contract tính toán

