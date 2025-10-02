# 📈 LÃI SUẤT BIẾN ĐỘNG THỰC TẾ - CÁCH HOẠT ĐỘNG

## 🎯 LÃI SUẤT ĐÃ BIẾN ĐỘNG TỰ ĐỘNG!

Lãi suất trong LendHub **TỰ ĐỘNG THAY ĐỔI** dựa trên **Utilization (U)** theo mô hình **2-Slope Interest Rate Model** (giống Aave, Compound).

---

## 📊 MÔ HÌNH LÃI SUẤT 2-SLOPE

### **Công thức:**

```
U = Total Borrowed / (Total Supplied + Total Borrowed)

Nếu U ≤ U*optimal (80%):
    Borrow Rate = Base + Slope1 × (U / U*optimal)

Nếu U > U*optimal (80%):
    Borrow Rate = Base + Slope1 + Slope2 × ((U - U*optimal) / (1 - U*optimal))

Supply Rate = Borrow Rate × U × (1 - Reserve Factor)
```

### **Ví dụ với USDC:**

| Utilization | Borrow APR | Supply APR | Tình huống |
|-------------|------------|------------|------------|
| **0%** | 0% (base) | 0% | Không ai vay |
| **40%** | 2.5% | 1.0% | Vay ít, lãi thấp |
| **80%** (optimal) | 5% | 4% | Lãi tối ưu |
| **90%** | 15% | 13.5% | Vay nhiều, lãi tăng mạnh |
| **95%** | 30% | 28.5% | Gần cạn pool, lãi rất cao |

---

## 🔄 LÃI SUẤT TỰ ĐỘNG THAY ĐỔI KHI:

### **1. Khi có người SUPPLY (Lend)**
```
Total Supplied ↑ → U ↓ → Borrow APR ↓ → Supply APR ↓
```
**Ví dụ:**
- Ban đầu: 100 USDC supplied, 80 USDC borrowed → **U = 80%** → Borrow APR = 5%
- Alice supply thêm 100 USDC → 200 USDC supplied, 80 USDC borrowed → **U = 40%** → Borrow APR = 2.5% ↓

### **2. Khi có người BORROW**
```
Total Borrowed ↑ → U ↑ → Borrow APR ↑ → Supply APR ↑
```
**Ví dụ:**
- Ban đầu: 100 USDC supplied, 50 USDC borrowed → **U = 50%** → Borrow APR = 3%
- Bob borrow thêm 30 USDC → 100 USDC supplied, 80 USDC borrowed → **U = 80%** → Borrow APR = 5% ↑

### **3. Khi có người REPAY**
```
Total Borrowed ↓ → U ↓ → Borrow APR ↓ → Supply APR ↓
```
**Ví dụ:**
- Ban đầu: 100 USDC supplied, 80 USDC borrowed → **U = 80%** → Borrow APR = 5%
- Charlie repay 30 USDC → 100 USDC supplied, 50 USDC borrowed → **U = 50%** → Borrow APR = 3% ↓

### **4. Khi có người WITHDRAW**
```
Total Supplied ↓ → U ↑ → Borrow APR ↑ → Supply APR ↑
```
**Ví dụ:**
- Ban đầu: 200 USDC supplied, 80 USDC borrowed → **U = 40%** → Borrow APR = 2.5%
- David withdraw 100 USDC → 100 USDC supplied, 80 USDC borrowed → **U = 80%** → Borrow APR = 5% ↑

---

## 🧪 TEST BIẾN ĐỘNG LÃI SUẤT

### **Scenario 1: Tăng Utilization (Lãi tăng)**

```bash
# 1. Xem lãi suất ban đầu (U = 0%, APR = 0%)
# 2. Supply 1000 USDC
# 3. Borrow 500 USDC → U = 50% → Borrow APR ≈ 3%
# 4. Borrow thêm 300 USDC → U = 80% → Borrow APR ≈ 5%
# 5. Borrow thêm 100 USDC → U = 90% → Borrow APR ≈ 15% 🚀
```

### **Scenario 2: Giảm Utilization (Lãi giảm)**

```bash
# 1. Hiện tại: U = 90%, Borrow APR = 15%
# 2. Repay 200 USDC → U = 70% → Borrow APR ≈ 4.5% ↓
# 3. Supply thêm 1000 USDC → U = 40% → Borrow APR ≈ 2.5% ↓
# 4. Repay hết → U = 0% → Borrow APR = 0% ↓
```

---

## 📝 CODE DEMO: TEST BIẾN ĐỘNG LÃI SUẤT

Tạo script để test:

```javascript
// scripts/test_dynamic_rates.cjs
const { ethers } = require('hardhat');

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  
  // Load contracts (thay YOUR_ADDRESS)
  const pool = await ethers.getContractAt('LendingPool', 'YOUR_POOL_ADDRESS');
  const usdc = await ethers.getContractAt('IERC20', 'YOUR_USDC_ADDRESS');
  
  console.log('📊 DEMO: Dynamic Interest Rates\n');
  
  // Helper function to get rates
  async function showRates() {
    const reserve = await pool.reserves(usdc.address);
    const U = reserve.totalDebtPrincipal.mul(10000).div(
      reserve.reserveCash.add(reserve.totalDebtPrincipal)
    );
    console.log(`Utilization: ${U.toNumber() / 100}%`);
    console.log(`Borrow APR: ${rayToAPR(reserve.variableBorrowRateRayPerSec)}%`);
    console.log(`Supply APR: ${rayToAPR(reserve.liquidityRateRayPerSec)}%\n`);
  }
  
  function rayToAPR(rateRayPerSec) {
    const SECONDS_PER_YEAR = 31536000;
    return (rateRayPerSec * SECONDS_PER_YEAR / 1e27 * 100).toFixed(2);
  }
  
  // Step 1: Initial state
  console.log('1️⃣ Initial state (no activity):');
  await showRates();
  
  // Step 2: Supply 1000 USDC
  console.log('2️⃣ User1 supplies 1000 USDC:');
  await usdc.connect(user1).approve(pool.address, ethers.parseUnits('1000', 6));
  await pool.connect(user1).supply(usdc.address, ethers.parseUnits('1000', 6));
  await showRates();
  
  // Step 3: Borrow 500 USDC (U = 50%)
  console.log('3️⃣ User2 borrows 500 USDC (U = 50%):');
  await pool.connect(user2).borrow(usdc.address, ethers.parseUnits('500', 6));
  await showRates();
  
  // Step 4: Borrow 300 more (U = 80%)
  console.log('4️⃣ User2 borrows 300 more USDC (U = 80%):');
  await pool.connect(user2).borrow(usdc.address, ethers.parseUnits('300', 6));
  await showRates();
  
  // Step 5: Repay 400 (U = 40%)
  console.log('5️⃣ User2 repays 400 USDC (U = 40%):');
  await usdc.connect(user2).approve(pool.address, ethers.parseUnits('400', 6));
  await pool.connect(user2).repay(usdc.address, ethers.parseUnits('400', 6), user2.address);
  await showRates();
  
  console.log('✅ Demo complete! Rates changed dynamically!');
}

main().catch(console.error);
```

**Chạy:**
```bash
npx hardhat run scripts/test_dynamic_rates.cjs --network ganache
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

```
📊 DEMO: Dynamic Interest Rates

1️⃣ Initial state (no activity):
Utilization: 0%
Borrow APR: 0%
Supply APR: 0%

2️⃣ User1 supplies 1000 USDC:
Utilization: 0%
Borrow APR: 0%
Supply APR: 0%

3️⃣ User2 borrows 500 USDC (U = 50%):
Utilization: 50%
Borrow APR: 3.12%    ← Lãi tăng!
Supply APR: 1.56%    ← Lãi tăng!

4️⃣ User2 borrows 300 more USDC (U = 80%):
Utilization: 80%
Borrow APR: 5.00%    ← Lãi tăng mạnh!
Supply APR: 4.00%    ← Lãi tăng mạnh!

5️⃣ User2 repays 400 USDC (U = 40%):
Utilization: 40%
Borrow APR: 2.50%    ← Lãi giảm!
Supply APR: 1.00%    ← Lãi giảm!

✅ Demo complete! Rates changed dynamically!
```

---

## 📱 TRONG FRONTEND

Lãi suất **TỰ ĐỘNG CẬP NHẬT** trong UI:

1. **Mỗi 30 giây**: Hook `useReserveAPR` tự động fetch rates mới
2. **Sau mỗi action**: Supply/Borrow/Repay/Withdraw → rates thay đổi ngay
3. **Real-time chart**: (TODO) Hiển thị biểu đồ lãi suất theo thời gian

```typescript
// TokenCard.tsx - Line 28
const aprData = useReserveAPR(
  provider,
  poolAddress,
  token.address,
  30000  // Auto-refresh every 30s
);
```

---

## ⚙️ TÙY CHỈNH MÔ HÌNH LÃI SUẤT

Để thay đổi độ nhạy của lãi suất, chỉnh các tham số khi `initReserve`:

```solidity
// scripts/deploy_ganache.cjs
await pool.initReserve(
  usdcAddress,
  6,                    // decimals
  1000,                 // reserveFactorBps (10%)
  8000,                 // ltvBps (80%)
  8500,                 // liquidationThresholdBps (85%)
  500,                  // liquidationBonusBps (5%)
  5000,                 // closeFactorBps (50%)
  true,                 // isBorrowable
  8000,                 // optimalUBps (80%) ← U* optimal
  0,                    // baseRateRayPerSec (0% base)
  31709791983n,         // slope1RayPerSec (1% APY) ← Độ dốc 1
  317097919837n         // slope2RayPerSec (10% APY) ← Độ dốc 2 (steep!)
);
```

**Tăng `slope2` → Lãi tăng mạnh hơn khi U > U*optimal**  
**Giảm `optimalU` → Lãi tăng sớm hơn**

---

## 🎉 KẾT LUẬN

### **Lãi suất ĐÃ BIẾN ĐỘNG TỰ ĐỘNG trong dự án của bạn!**

✅ **Không cần code thêm gì**  
✅ **Mô hình giống Aave/Compound**  
✅ **UI tự động cập nhật mỗi 30s**  
✅ **Rates thay đổi theo Supply/Borrow/Repay/Withdraw**

**Để thấy rõ biến động:**
1. Supply 1000 USDC
2. Borrow 500 USDC → Xem APR tăng
3. Borrow thêm 300 USDC → Xem APR tăng mạnh
4. Repay → Xem APR giảm

---

## 📚 TÀI LIỆU THAM KHẢO

- **InterestRateModel.sol**: `contracts/core/InterestRateModel.sol`
- **LendingPool._accrue()**: `contracts/core/LendingPool.sol` (line 54-102)
- **useReserveAPR hook**: `lendhub-frontend-nextjs/src/hooks/useReserveAPR.ts`
- **APR Calculations**: `lendhub-frontend-nextjs/src/lib/aprCalculations.ts`
- **Aave V2 Whitepaper**: https://github.com/aave/protocol-v2/blob/master/aave-v2-whitepaper.pdf

🚀 **ENJOY YOUR DYNAMIC INTEREST RATES!**

