# 🔬 ROOT CAUSE ANALYSIS - Reward System

## Vấn Đề

User đã supply nhiều lần nhưng vẫn không thấy reward accumulate.

## Phân Tích Sâu

### ✅ Đã Kiểm Tra và Đúng:

1. **Configuration**:
   - LendingPool.rewardAccumulator → RewardAccumulator ✅
   - RewardAccumulator.lendingPool → LendingPool ✅
   - RewardAccumulator.rewardDistributor → RewardDistributor ✅
   - RewardDistributor.rewardAccumulator → RewardAccumulator ✅

2. **Code Logic**:
   - LendingPool.lend() gọi _updateSupplyReward() ✅
   - _updateSupplyReward() gọi RewardAccumulator.updateSupplyBalance() ✅
   - updateSupplyBalance() tính reward và gọi RewardDistributor.accumulateReward() ✅
   - accumulateReward() accumulate vào rewards mapping ✅

3. **Authorization**:
   - RewardAccumulator có thể gọi RewardDistributor.accumulateReward() ✅

### 🔴 Vấn Đề Phát Hiện:

1. **Gas Limit Quá Thấp**:
   - Low-level call chỉ có 100000 gas (hoặc không có gas limit)
   - updateSupplyBalance() cần:
     - Read state: ~21000
     - Calculate: ~5000
     - Call RewardDistributor.accumulateReward(): ~50000
     - Update state: ~20000
     - Total: ~96000
   - Nếu không đủ gas, call sẽ fail

2. **LendingPool Trên Chain Có Thể Chưa Có Code Mới**:
   - Nếu LendingPool được deploy trước khi thêm _updateSupplyReward
   - Function sẽ không tồn tại
   - Low-level call sẽ fail

3. **Silent Failure**:
   - Low-level call fail nhưng không revert transaction
   - Chỉ return false
   - Nếu không có event RewardUpdateFailed, không biết được

## Giải Pháp

### 1. Tăng Gas Limit
- Thay đổi từ không có gas limit → `call{gas: 200000}`
- Đảm bảo đủ gas cho cả updateSupplyBalance và accumulateReward

### 2. Redeploy LendingPool
- Deploy lại với code mới có gas limit
- Đảm bảo có function _updateSupplyReward

### 3. Thêm Event Logging
- Emit RewardUpdateFailed khi call fail
- Giúp debug dễ dàng hơn

## Files Cần Sửa

1. `contracts/core/LendingPool.sol`:
   - Thêm gas limit cho low-level call
   - Thêm event RewardUpdateFailed

2. Redeploy LendingPool với code mới

## Test Sau Khi Fix

1. Supply tokens
2. Check transaction receipt cho RewardsAccumulated event
3. Check transaction receipt cho RewardUpdateFailed event (nếu có)
4. Verify claimable reward


