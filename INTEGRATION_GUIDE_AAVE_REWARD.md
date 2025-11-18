# 🔗 Hướng Dẫn Tích Hợp AAVE Reward Distributor

## 📋 Tổng Quan

Hướng dẫn này sẽ giúp bạn tích hợp `AAVERewardDistributor` vào `LendingPool` để tự động phân phối reward khi user thực hiện các action.

## 🔧 Bước 1: Update LendingPool Contract

### **Thêm Import và State Variables**

```solidity
// contracts/core/LendingPool.sol

import "../rewards/IAAVERewardDistributor.sol";

contract LendingPool is ReentrancyGuard, Pausable {
    // ... existing code ...
    
    // Reward distributor (optional - can be zero address)
    IAAVERewardDistributor public rewardDistributor;
    
    // ... existing code ...
}
```

### **Thêm Function Set Reward Distributor**

```solidity
/**
 * @notice Set reward distributor address (only owner)
 */
function setRewardDistributor(address _rewardDistributor) external {
    require(msg.sender == owner, "LendingPool: only owner");
    rewardDistributor = IAAVERewardDistributor(_rewardDistributor);
}
```

### **Thêm Helper Function để Update Reward**

```solidity
/**
 * @notice Update user reward (internal helper)
 * @dev Called after supply, withdraw, borrow, repay actions
 */
function _updateUserReward(address user, address asset) internal {
    if (address(rewardDistributor) == address(0)) return;
    
    ReserveUserModels.UserReserveData storage userReserve = userReserves[user][asset];
    ReserveUserModels.ReserveData storage reserve = reserves[asset];
    
    rewardDistributor.handleAction(
        user,
        asset,
        userReserve.supplyBalance,
        userReserve.borrowBalance,
        reserve.totalSupply,
        reserve.totalBorrow
    );
}
```

### **Update Function supply()**

```solidity
function supply(address asset, uint256 amount) external nonReentrant whenNotPaused {
    // ... existing supply logic ...
    
    // Update reward AFTER updating balances
    _updateUserReward(msg.sender, asset);
    
    // ... rest of function ...
}
```

### **Update Function withdraw()**

```solidity
function withdraw(address asset, uint256 amount) external nonReentrant whenNotPaused {
    // ... existing withdraw logic ...
    
    // Update reward AFTER updating balances
    _updateUserReward(msg.sender, asset);
    
    // ... rest of function ...
}
```

### **Update Function borrow()**

```solidity
function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
    // ... existing borrow logic ...
    
    // Update reward AFTER updating balances
    _updateUserReward(msg.sender, asset);
    
    // ... rest of function ...
}
```

### **Update Function repay()**

```solidity
function repay(address asset, uint256 amount) external nonReentrant whenNotPaused {
    // ... existing repay logic ...
    
    // Update reward AFTER updating balances
    _updateUserReward(msg.sender, asset);
    
    // ... rest of function ...
}
```

## 🚀 Bước 2: Deploy và Setup

### **1. Deploy AAVERewardDistributor**

```javascript
// scripts/deploy_aave_reward.js

const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying AAVERewardDistributor...");
    
    const LENDXToken = await ethers.getContractFactory("LENDXToken");
    const lendxToken = await LENDXToken.deploy();
    await lendxToken.waitForDeployment();
    
    const AAVERewardDistributor = await ethers.getContractFactory("AAVERewardDistributor");
    const rewardDistributor = await AAVERewardDistributor.deploy(
        await lendxToken.getAddress(),
        deployer.address
    );
    await rewardDistributor.waitForDeployment();
    
    console.log("AAVERewardDistributor deployed to:", await rewardDistributor.getAddress());
    console.log("LENDXToken deployed to:", await lendxToken.getAddress());
    
    return {
        rewardDistributor: await rewardDistributor.getAddress(),
        lendxToken: await lendxToken.getAddress()
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### **2. Setup Reward Distributor**

```javascript
// scripts/setup_aave_reward.js

const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Get contracts
    const rewardDistributor = await ethers.getContractAt(
        "AAVERewardDistributor",
        "0x...RewardDistributorAddress"
    );
    const lendingPool = await ethers.getContractAt(
        "LendingPool",
        "0x...LendingPoolAddress"
    );
    const lendxToken = await ethers.getContractAt(
        "LENDXToken",
        "0x...LENDXTokenAddress"
    );
    const usdc = await ethers.getContractAt(
        "ERC20",
        "0x...USDCAddress"
    );
    
    console.log("Setting up reward distributor...");
    
    // 1. Set LendingPool in RewardDistributor
    await rewardDistributor.setLendingPool(await lendingPool.getAddress());
    console.log("✅ Set LendingPool");
    
    // 2. Configure USDC asset
    // 1 LENDX per second, 50% supply, 50% borrow
    await rewardDistributor.configureAsset(
        await usdc.getAddress(),
        ethers.parseEther("1"),      // 1 LENDX per second
        ethers.parseEther("0.5"),    // 50% for supply
        ethers.parseEther("0.5")     // 50% for borrow
    );
    console.log("✅ Configured USDC asset");
    
    // 3. Fund RewardDistributor với LENDX tokens
    const fundAmount = ethers.parseEther("1000000"); // 1M LENDX
    await lendxToken.transfer(await rewardDistributor.getAddress(), fundAmount);
    console.log("✅ Funded RewardDistributor with", ethers.formatEther(fundAmount), "LENDX");
    
    // 4. Set RewardDistributor in LendingPool
    await lendingPool.setRewardDistributor(await rewardDistributor.getAddress());
    console.log("✅ Set RewardDistributor in LendingPool");
    
    console.log("\n✅ Setup complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 🧪 Bước 3: Test

### **Test Script**

```javascript
// scripts/test_aave_reward.js

const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const [deployer, alice, bob] = await ethers.getSigners();
    
    // Get contracts
    const rewardDistributor = await ethers.getContractAt(
        "AAVERewardDistributor",
        "0x...RewardDistributorAddress"
    );
    const lendingPool = await ethers.getContractAt(
        "LendingPool",
        "0x...LendingPoolAddress"
    );
    const usdc = await ethers.getContractAt(
        "ERC20",
        "0x...USDCAddress"
    );
    
    console.log("Testing AAVE Reward Distributor...\n");
    
    // 1. Alice supplies 100 USDC
    console.log("1. Alice supplies 100 USDC...");
    await usdc.approve(await lendingPool.getAddress(), ethers.parseUnits("100", 6));
    await lendingPool.supply(await usdc.getAddress(), ethers.parseUnits("100", 6));
    console.log("✅ Alice supplied 100 USDC");
    
    // 2. Wait 100 seconds
    console.log("\n2. Waiting 100 seconds...");
    await time.increase(100);
    console.log("✅ 100 seconds passed");
    
    // 3. Check Alice's reward
    const aliceReward = await rewardDistributor.getUnclaimedRewards(alice.address);
    console.log("\n3. Alice's unclaimed reward:", ethers.formatEther(aliceReward), "LENDX");
    
    // 4. Bob borrows 50 USDC
    console.log("\n4. Bob borrows 50 USDC...");
    await lendingPool.borrow(await usdc.getAddress(), ethers.parseUnits("50", 6));
    console.log("✅ Bob borrowed 50 USDC");
    
    // 5. Wait another 100 seconds
    console.log("\n5. Waiting another 100 seconds...");
    await time.increase(100);
    console.log("✅ 100 seconds passed");
    
    // 6. Check rewards
    const aliceReward2 = await rewardDistributor.getUnclaimedRewards(alice.address);
    const bobReward = await rewardDistributor.getUnclaimedRewards(bob.address);
    console.log("\n6. Rewards after 200 seconds:");
    console.log("   Alice:", ethers.formatEther(aliceReward2), "LENDX");
    console.log("   Bob:", ethers.formatEther(bobReward), "LENDX");
    
    // 7. Alice claims rewards
    console.log("\n7. Alice claims rewards...");
    await rewardDistributor.connect(alice).claimRewards();
    console.log("✅ Alice claimed rewards");
    
    // 8. Check final state
    const aliceReward3 = await rewardDistributor.getUnclaimedRewards(alice.address);
    console.log("\n8. Alice's remaining reward:", ethers.formatEther(aliceReward3), "LENDX");
    
    console.log("\n✅ Test complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 📊 Bước 4: Monitor và Verify

### **Check Asset Indices**

```javascript
const supplyIndex = await rewardDistributor.getAssetIndices(usdcAddress);
console.log("Supply Index:", ethers.formatEther(supplyIndex.supplyIndex));
console.log("Borrow Index:", ethers.formatEther(supplyIndex.borrowIndex));
```

### **Check User Rewards**

```javascript
const userReward = await rewardDistributor.getUnclaimedRewards(userAddress);
console.log("User's unclaimed reward:", ethers.formatEther(userReward), "LENDX");
```

### **Check Asset Configuration**

```javascript
const assetData = await rewardDistributor.assets(usdcAddress);
console.log("Emission per second:", ethers.formatEther(assetData.emissionPerSecond));
console.log("Total supply:", ethers.formatEther(assetData.totalSupply));
console.log("Total borrow:", ethers.formatEther(assetData.totalBorrow));
```

## ⚠️ Lưu Ý Quan Trọng

### **1. Thứ Tự Gọi Function**

Luôn gọi `_updateUserReward()` **SAU KHI** đã cập nhật balances trong LendingPool:

```solidity
// ✅ ĐÚNG
userReserve.supplyBalance += amount;
reserve.totalSupply += amount;
_updateUserReward(msg.sender, asset); // Sau khi update balance

// ❌ SAI
_updateUserReward(msg.sender, asset); // Trước khi update balance
userReserve.supplyBalance += amount;
```

### **2. Gas Optimization**

- `handleAction()` được gọi mỗi khi có action → cần optimize gas
- Có thể batch update nhiều users nếu cần
- Cân nhắc sử dụng `unchecked` cho các phép tính an toàn

### **3. Error Handling**

- Luôn check `address(rewardDistributor) != address(0)` trước khi gọi
- RewardDistributor có thể fail → không nên revert toàn bộ transaction
- Có thể wrap trong try-catch nếu cần

### **4. Testing**

- Test với nhiều users và assets
- Test với các edge cases (balance = 0, totalSupply = 0, etc.)
- Test với time passing (sử dụng `time.increase()`)
- Test claim rewards

## ✅ Checklist

- [ ] Update LendingPool với reward distributor integration
- [ ] Deploy AAVERewardDistributor
- [ ] Setup và configure assets
- [ ] Fund RewardDistributor với LENDX tokens
- [ ] Test với multiple users
- [ ] Test claim rewards
- [ ] Monitor reward distribution
- [ ] Adjust parameters nếu cần

---

**Sau khi hoàn thành các bước trên, reward system sẽ tự động phân phối LENDX tokens cho users khi họ supply/borrow!**



