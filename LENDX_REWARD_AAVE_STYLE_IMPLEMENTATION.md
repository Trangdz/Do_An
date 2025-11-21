# 🎯 Cơ Chế Phân Phối Reward LENDX - AAVE Style

## 📋 Tổng Quan

Đây là implementation hoàn chỉnh của cơ chế phân phối reward theo chuẩn **AAVE-style**, sử dụng **AssetIndex** và **UserIndex** để đảm bảo công bằng và hiệu quả.

## 🔑 Các Thành Phần Chính

### **1. AssetIndex (Chỉ số tài sản)**
```
AssetIndex = Tổng reward đã tích lũy / Tổng balance
```

- **SupplyIndex**: Chỉ số cho người gửi (supply)
- **BorrowIndex**: Chỉ số cho người vay (borrow)
- Tăng dần theo thời gian khi có reward mới
- Được cập nhật mỗi khi có action

### **2. UserIndex (Chỉ số người dùng)**
```
UserIndex = AssetIndex tại thời điểm user tham gia hoặc claim
```

- **SupplyIndex**: Snapshot của SupplyAssetIndex
- **BorrowIndex**: Snapshot của BorrowAssetIndex
- Được cập nhật khi user claim hoặc thực hiện action

### **3. Công Thức Tính Reward**
```
Reward = (AssetIndex_hiện_tại - UserIndex) × Balance
```

**Ví dụ:**
- AssetIndex hiện tại = 2.0
- UserIndex = 1.5
- Balance = 100
- → Reward = (2.0 - 1.5) × 100 = 50 LENDX

## 🏗️ Cấu Trúc Contract

### **AAVERewardDistributor.sol**

#### **AssetData Structure**
```solidity
struct AssetData {
    uint128 supplyIndex;        // Supply asset index (1e18 = 1.0)
    uint128 supplyLastUpdate;   // Last update timestamp
    uint128 borrowIndex;        // Borrow asset index (1e18 = 1.0)
    uint128 borrowLastUpdate;   // Last update timestamp
    uint128 emissionPerSecond;  // Emission rate per second (1e18)
    uint128 totalSupply;        // Total supply balance
    uint128 totalBorrow;        // Total borrow balance
}
```

#### **UserData Structure**
```solidity
struct UserData {
    uint128 supplyIndex;        // User's supply index snapshot
    uint128 supplyBalance;      // User's supply balance
    uint128 borrowIndex;        // User's borrow index snapshot
    uint128 borrowBalance;      // User's borrow balance
    uint256 unclaimedRewards;   // Total unclaimed rewards
    uint128 lastActionTime;     // Last action timestamp (anti-spam)
}
```

## 🔧 Các Function Chính

### **1. configureAsset() - Cấu hình Asset**
```solidity
function configureAsset(
    address asset,
    uint128 emissionPerSecond,
    uint128 supplyPercentage,
    uint128 borrowPercentage
) external onlyOwner
```

**Chức năng:**
- Cấu hình reward cho một asset
- Set emission rate per second
- Set tỷ lệ phân phối supply/borrow (mặc định 50-50)

**Ví dụ:**
```solidity
// Cấu hình USDC với 1 LENDX/giây, 50% supply, 50% borrow
rewardDistributor.configureAsset(
    usdcAddress,
    1e18,      // 1 LENDX per second
    50e17,     // 50% for supply
    50e17      // 50% for borrow
);
```

### **2. handleAction() - Xử lý Action**
```solidity
function handleAction(
    address user,
    address asset,
    uint256 supplyBalance,
    uint256 borrowBalance,
    uint256 totalSupply,
    uint256 totalBorrow
) external
```

**Chức năng:**
- Được gọi bởi LendingPool khi user thực hiện action
- Cập nhật AssetIndex
- Tính reward mới cho user
- Cập nhật UserIndex và balance

**Flow:**
1. Kiểm tra cooldown (anti-spam)
2. Cập nhật AssetIndex
3. Tính reward dựa trên index difference
4. Cập nhật UserIndex = AssetIndex hiện tại
5. Lưu balance mới

### **3. claimRewards() - Claim Reward**
```solidity
function claimRewards() external nonReentrant
```

**Chức năng:**
- Claim tất cả unclaimed rewards từ tất cả assets
- Transfer LENDX token về user

**Flow:**
1. Update tất cả AssetIndex
2. Tính pending rewards cho tất cả assets
3. Cộng tất cả unclaimed rewards
4. Reset unclaimed rewards về 0
5. Update UserIndex = AssetIndex hiện tại
6. Transfer LENDX

### **4. _updateAssetIndex() - Cập nhật Asset Index**
```solidity
function _updateAssetIndex(address asset) internal
```

**Công thức:**
```
deltaTime = block.timestamp - lastUpdate
totalEmission = emissionPerSecond × deltaTime

supplyReward = totalEmission × supplyPercentage / 1e18
borrowReward = totalEmission × borrowPercentage / 1e18

deltaSupplyIndex = supplyReward × 1e18 / totalSupply
deltaBorrowIndex = borrowReward × 1e18 / totalBorrow

newSupplyIndex = oldSupplyIndex + deltaSupplyIndex
newBorrowIndex = oldBorrowIndex + deltaBorrowIndex
```

### **5. _updateUserReward() - Cập nhật User Reward**
```solidity
function _updateUserReward(
    address user,
    address asset,
    uint256 newSupplyBalance,
    uint256 newBorrowBalance
) internal
```

**Công thức:**
```
deltaSupplyIndex = currentSupplyIndex - userSupplyIndex
supplyReward = userSupplyBalance × deltaSupplyIndex / 1e18

deltaBorrowIndex = currentBorrowIndex - userBorrowIndex
borrowReward = userBorrowBalance × deltaBorrowIndex / 1e18

totalReward = supplyReward + borrowReward
unclaimedRewards += totalReward
```

## 🛡️ Bảo Mật và Chống Spam

### **1. Chống Sybil Attack**
```solidity
uint256 public minDepositForReward = 1e15; // 0.001 tokens
```

- Chỉ tính reward nếu balance >= minDeposit
- Ví nhỏ không thể farm được nhiều

### **2. Chống Spam Actions**
```solidity
uint256 public actionCooldown = 60; // 60 seconds
```

- Mỗi user chỉ có thể thực hiện action sau cooldown
- Tránh spam gọi handleAction()

### **3. Chống Dust Rewards**
```solidity
uint256 public minRewardAmount = 1e15; // 0.001 LENDX
```

- Chỉ accumulate reward nếu >= minRewardAmount
- Tránh tích lũy reward quá nhỏ

### **4. Chống Multicall/Flashloan**
- `handleAction()` chỉ được gọi bởi LendingPool
- `claimRewards()` có `nonReentrant` modifier
- Không cho phép claim + deposit + withdraw trong cùng TX

### **5. Distribution End**
```solidity
uint256 public distributionEnd; // 0 = unlimited
```

- Có thể set thời điểm kết thúc phân phối
- Sau distributionEnd, không còn reward mới

## 📊 Ví Dụ Mô Phỏng

### **Scenario: Alice, Bob, Charlie**

**Thông số:**
- Emission: 1 LENDX/giây
- Asset: USDC
- Supply/Borrow split: 50-50

**Timeline:**

#### **Block 0-100 (100 giây)**
- Alice supply: 100 USDC
- Total supply: 100, Total borrow: 0
- Reward: 100 LENDX (100% cho supply vì không có borrow)
- SupplyIndex: 0 → 1.0
- Alice.reward = (1.0 - 0) × 100 = 100 LENDX

#### **Block 100-200 (100 giây)**
- Alice supply: 100 USDC (tiếp tục)
- Bob borrow: 100 USDC
- Total supply: 100, Total borrow: 100
- Reward: 100 LENDX (50 supply, 50 borrow)
- SupplyIndex: 1.0 → 1.5
- BorrowIndex: 0 → 0.5
- Alice.reward = (1.5 - 1.0) × 100 = 50 LENDX
- Bob.reward = (0.5 - 0) × 100 = 50 LENDX

#### **Block 200-300 (100 giây)**
- Alice supply: 100 USDC
- Bob borrow: 100 USDC
- Charlie supply: 300 USDC
- Total supply: 400, Total borrow: 100
- Reward: 100 LENDX (50 supply, 50 borrow)
- SupplyIndex: 1.5 → 1.625
- BorrowIndex: 0.5 → 1.0
- Alice.reward = (1.625 - 1.5) × 100 = 12.5 LENDX
- Bob.reward = (1.0 - 0.5) × 100 = 50 LENDX
- Charlie.reward = (1.625 - 1.5) × 300 = 37.5 LENDX

**Tổng kết:**
- Alice: 100 + 50 + 12.5 = 162.5 LENDX
- Bob: 50 + 50 = 100 LENDX
- Charlie: 37.5 LENDX
- **Tổng: 300 LENDX = 1 LENDX/s × 300s** ✅

## 🔄 Tích Hợp Với LendingPool

### **1. Update LendingPool**

Thêm vào LendingPool:

```solidity
import "./rewards/IAAVERewardDistributor.sol";

IAAVERewardDistributor public rewardDistributor;

function setRewardDistributor(address _rewardDistributor) external onlyOwner {
    rewardDistributor = IAAVERewardDistributor(_rewardDistributor);
}

// Trong function supply()
function supply(address asset, uint256 amount) external {
    // ... existing code ...
    
    // Update reward
    if (address(rewardDistributor) != address(0)) {
        rewardDistributor.handleAction(
            msg.sender,
            asset,
            userReserves[msg.sender][asset].supplyBalance,
            userReserves[msg.sender][asset].borrowBalance,
            reserves[asset].totalSupply,
            reserves[asset].totalBorrow
        );
    }
}

// Tương tự cho withdraw(), borrow(), repay()
```

### **2. Deploy và Setup**

```solidity
// 1. Deploy AAVERewardDistributor
AAVERewardDistributor distributor = new AAVERewardDistributor(
    lendxTokenAddress,
    ownerAddress
);

// 2. Set LendingPool
distributor.setLendingPool(lendingPoolAddress);

// 3. Configure assets
distributor.configureAsset(
    usdcAddress,
    1e18,      // 1 LENDX per second
    50e17,     // 50% supply
    50e17      // 50% borrow
);

// 4. Fund contract với LENDX tokens
lendxToken.transfer(address(distributor), 1000000e18); // 1M LENDX

// 5. Set LendingPool's rewardDistributor
lendingPool.setRewardDistributor(address(distributor));
```

## ✅ Ưu Điểm Cơ Chế Này

| Ưu điểm | Mô tả |
|---------|-------|
| **Công bằng** | Reward chia theo tỷ lệ balance và thời gian |
| **Hiệu quả** | Chỉ cập nhật khi có action, không loop toàn user |
| **An toàn** | Chống spam, chống farm, chống multicall |
| **Linh hoạt** | Có thể cấu hình emission, split, distribution end |
| **Mở rộng** | Dễ thêm asset mới, dễ điều chỉnh parameters |
| **Test được** | Có thể test local với Hardhat/Foundry |

## 📝 Checklist Triển Khai

- [x] Tạo contract AAVERewardDistributor.sol
- [x] Implement AssetIndex và UserIndex
- [x] Implement handleAction()
- [x] Implement claimRewards()
- [x] Thêm cơ chế chống spam
- [x] Thêm distribution end
- [x] Tạo interface IAAVERewardDistributor.sol
- [ ] Tích hợp vào LendingPool
- [ ] Viết tests
- [ ] Deploy và test trên testnet
- [ ] Audit (nếu cần)

## 🚀 Next Steps

1. **Tích hợp vào LendingPool**: Update LendingPool để gọi `handleAction()`
2. **Viết Tests**: Test các scenarios với Hardhat
3. **Deploy**: Deploy lên testnet và test thực tế
4. **Monitor**: Theo dõi reward distribution và điều chỉnh nếu cần

---

**Tài liệu này mô tả implementation hoàn chỉnh của cơ chế phân phối reward theo chuẩn AAVE-style.**






