# ✅ Deployment Checklist - AAVE Reward Distributor

## 📋 Pre-Deployment

### **1. Contracts Ready**
- [x] `AAVERewardDistributor.sol` - Contract chính
- [x] `IAAVERewardDistributor.sol` - Interface
- [x] `LendingPool.sol` - Đã tích hợp reward distributor

### **2. Compile & Test**
- [ ] Compile contracts: `npx hardhat compile`
- [ ] Run tests: `npx hardhat test`
- [ ] Check for linter errors: `npx hardhat lint` (nếu có)

## 🚀 Deployment Steps

### **Step 1: Deploy AAVERewardDistributor**

```javascript
// scripts/deploy_aave_reward.js
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying with account:", deployer.address);
    
    // 1. Get LENDX Token address (hoặc deploy mới)
    const LENDXToken = await ethers.getContractFactory("LENDXToken");
    const lendxToken = await LENDXToken.attach("0x...LENDXTokenAddress");
    // Hoặc deploy mới:
    // const lendxToken = await LENDXToken.deploy();
    // await lendxToken.waitForDeployment();
    
    // 2. Deploy AAVERewardDistributor
    const AAVERewardDistributor = await ethers.getContractFactory("AAVERewardDistributor");
    const rewardDistributor = await AAVERewardDistributor.deploy(
        await lendxToken.getAddress(),
        deployer.address // owner
    );
    await rewardDistributor.waitForDeployment();
    
    console.log("✅ AAVERewardDistributor deployed to:", await rewardDistributor.getAddress());
    
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

### **Step 2: Setup Reward Distributor**

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
    const usdc = await ethers.getContractAt(
        "ERC20",
        "0x...USDCAddress"
    );
    const lendxToken = await ethers.getContractAt(
        "LENDXToken",
        "0x...LENDXTokenAddress"
    );
    
    console.log("Setting up reward distributor...\n");
    
    // 1. Set LendingPool in RewardDistributor
    console.log("1. Setting LendingPool...");
    await rewardDistributor.setLendingPool(await lendingPool.getAddress());
    console.log("   ✅ LendingPool set\n");
    
    // 2. Configure USDC asset
    // 1 LENDX per second, 50% supply, 50% borrow
    console.log("2. Configuring USDC asset...");
    await rewardDistributor.configureAsset(
        await usdc.getAddress(),
        ethers.parseEther("1"),      // 1 LENDX per second
        ethers.parseEther("0.5"),    // 50% for supply
        ethers.parseEther("0.5")     // 50% for borrow
    );
    console.log("   ✅ USDC configured: 1 LENDX/s, 50% supply, 50% borrow\n");
    
    // 3. Fund RewardDistributor với LENDX tokens
    console.log("3. Funding RewardDistributor...");
    const fundAmount = ethers.parseEther("1000000"); // 1M LENDX
    await lendxToken.transfer(await rewardDistributor.getAddress(), fundAmount);
    console.log("   ✅ Funded", ethers.formatEther(fundAmount), "LENDX\n");
    
    // 4. Set RewardDistributor in LendingPool
    console.log("4. Setting RewardDistributor in LendingPool...");
    await lendingPool.setRewardDistributor(await rewardDistributor.getAddress());
    console.log("   ✅ RewardDistributor set in LendingPool\n");
    
    // 5. Verify setup
    console.log("5. Verifying setup...");
    const setLendingPool = await rewardDistributor.lendingPool();
    const setInPool = await lendingPool.rewardDistributor();
    console.log("   RewardDistributor.lendingPool:", setLendingPool);
    console.log("   LendingPool.rewardDistributor:", setInPool);
    console.log("   ✅ Setup verified\n");
    
    console.log("🎉 Setup complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### **Step 3: Verify Integration**

```javascript
// scripts/verify_integration.js
const { ethers } = require("hardhat");

async function main() {
    const [deployer, alice] = await ethers.getSigners();
    
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
    
    console.log("Verifying integration...\n");
    
    // 1. Check LendingPool has rewardDistributor set
    const poolRewardDistributor = await lendingPool.rewardDistributor();
    console.log("LendingPool.rewardDistributor:", poolRewardDistributor);
    console.log("Expected:", await rewardDistributor.getAddress());
    console.log("Match:", poolRewardDistributor.toLowerCase() === (await rewardDistributor.getAddress()).toLowerCase());
    
    // 2. Check RewardDistributor has LendingPool set
    const distributorLendingPool = await rewardDistributor.lendingPool();
    console.log("\nRewardDistributor.lendingPool:", distributorLendingPool);
    console.log("Expected:", await lendingPool.getAddress());
    console.log("Match:", distributorLendingPool.toLowerCase() === (await lendingPool.getAddress()).toLowerCase());
    
    // 3. Check asset configuration
    const assetData = await rewardDistributor.assets(await usdc.getAddress());
    console.log("\nUSDC Asset Data:");
    console.log("  Emission per second:", ethers.formatEther(assetData.emissionPerSecond), "LENDX");
    console.log("  Supply index:", ethers.formatEther(assetData.supplyIndex));
    console.log("  Borrow index:", ethers.formatEther(assetData.borrowIndex));
    
    // 4. Check contract balance
    const lendxToken = await ethers.getContractAt(
        "LENDXToken",
        await rewardDistributor.lendxToken()
    );
    const balance = await lendxToken.balanceOf(await rewardDistributor.getAddress());
    console.log("\nRewardDistributor LENDX balance:", ethers.formatEther(balance), "LENDX");
    
    console.log("\n✅ Verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 🧪 Testing

### **Test 1: Supply và Check Reward**

```javascript
// scripts/test_supply_reward.js
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const [deployer, alice] = await ethers.getSigners();
    
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
    
    console.log("Testing supply reward...\n");
    
    // 1. Alice supplies 100 USDC
    console.log("1. Alice supplies 100 USDC...");
    await usdc.connect(alice).approve(await lendingPool.getAddress(), ethers.parseUnits("100", 6));
    await lendingPool.connect(alice).lend(await usdc.getAddress(), ethers.parseUnits("100", 6));
    console.log("   ✅ Supplied\n");
    
    // 2. Wait 100 seconds
    console.log("2. Waiting 100 seconds...");
    await time.increase(100);
    console.log("   ✅ 100 seconds passed\n");
    
    // 3. Check Alice's reward
    const aliceReward = await rewardDistributor.getUnclaimedRewards(alice.address);
    console.log("3. Alice's unclaimed reward:", ethers.formatEther(aliceReward), "LENDX");
    console.log("   Expected: ~50 LENDX (50% of 100 LENDX)\n");
    
    // 4. Alice claims
    console.log("4. Alice claims rewards...");
    await rewardDistributor.connect(alice).claimRewards();
    console.log("   ✅ Claimed\n");
    
    // 5. Check final state
    const aliceRewardAfter = await rewardDistributor.getUnclaimedRewards(alice.address);
    console.log("5. Alice's remaining reward:", ethers.formatEther(aliceRewardAfter), "LENDX");
    console.log("   Expected: 0 (or very small due to rounding)\n");
    
    console.log("✅ Test complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## ⚠️ Important Notes

### **1. Gas Costs**
- `handleAction()` được gọi mỗi lần user thực hiện action
- Estimate gas: ~100,000 - 150,000 gas per call
- Có thể optimize bằng cách batch updates nếu cần

### **2. Error Handling**
- Reward update failures không revert transaction
- Events được emit để debug
- Monitor `RewardUpdateFailed` events

### **3. Security**
- Chỉ LendingPool có thể gọi `handleAction()`
- Owner có thể configure assets và parameters
- Distribution end có thể được set để tắt rewards

### **4. Monitoring**
- Monitor reward distribution rate
- Check contract balance thường xuyên
- Monitor asset indices growth
- Check user rewards accumulation

## 📊 Post-Deployment

- [ ] Verify all contracts deployed correctly
- [ ] Verify LendingPool and RewardDistributor linked
- [ ] Verify assets configured
- [ ] Verify contract funded with LENDX
- [ ] Test supply → check reward
- [ ] Test borrow → check reward
- [ ] Test claim rewards
- [ ] Monitor gas usage
- [ ] Monitor reward distribution

---

**Sau khi hoàn thành checklist này, reward system sẽ hoạt động tự động!**

