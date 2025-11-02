# 🔗 JAVASCRIPT ↔️ SMART CONTRACT INTERACTION

## ✅ CÓ! JavaScript CÓ THỂ TƯƠNG TÁC VỚI CONTRACT

### Cơ chế hoạt động:

```
JavaScript (Browser/Node.js)
        ↓
  Ethers.js / Web3.js
        ↓
   RPC Connection
        ↓
   Ethereum Blockchain
        ↓
  Smart Contract
```

---

## 🎯 CÁC CÁCH TƯƠNG TÁC:

### 1. **READ Data** (View functions)

```javascript
// File: scripts/read_contract.js
const { ethers } = require('ethers');

async function readData() {
    // 1. Kết nối blockchain
    const provider = new ethers.JsonRpcProvider('http://localhost:7545');
    
    // 2. Load contract
    const contractAddress = '0x...';
    const abi = [...]; // Contract ABI
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // 3. GỌI FUNCTION TỪ CONTRACT
    const result = await contract.reserves(USDC_ADDRESS);
    
    console.log('Slope 1:', result.slope1RayPerSec);
    // ✅ JavaScript đọc được data từ contract!
}

readData();
```

### 2. **WRITE Data** (Non-payable functions)

```javascript
// File: scripts/update_rates.js
const { ethers } = require('hardhat');

async function updateRates() {
    // 1. Kết nối với wallet
    const [deployer] = await ethers.getSigners();
    
    // 2. Load contract
    const pool = await ethers.getContractAt('LendingPool', POOL_ADDRESS);
    
    // 3. GỌI FUNCTION UPDATE
    const tx = await pool.updateInterestRateParams(
        USDC_ADDRESS,
        9000,      // optimalU
        0,         // base
        634195839674n,  // slope1
        3170979198373n  // slope2
    );
    
    // 4. ĐỢI TX EXECUTED
    await tx.wait();
    
    console.log('✅ Updated!');
    // ✅ JavaScript gọi được function trong contract!
}

updateRates();
```

### 3. **SEND Transaction** (Payable functions)

```javascript
// File: scripts/deposit.js
const { ethers } = require('ethers');

async function deposit() {
    const [user] = await ethers.getSigners();
    const pool = await ethers.getContractAt('LendingPool', POOL_ADDRESS);
    const usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS);
    
    // 1. Approve
    await usdc.approve(pool.address, ethers.parseUnits('1000', 6));
    
    // 2. GỌI FUNCTION SUPPLY
    const tx = await pool.supply(
        USDC_ADDRESS,
        ethers.parseUnits('1000', 6),
        user.address
    );
    
    await tx.wait();
    console.log('✅ Deposited!');
}
```

---

## 📊 PHÂN LOẠI FUNCTIONS:

### 1. **View Functions** (Chỉ đọc)

```solidity
// Contract
function reserves(address asset) external view returns (ReserveData memory) {
    return _reserves[asset];
}
```

```javascript
// JavaScript gọi:
const data = await contract.reserves(USDC_ADDRESS);
// ✅ Không cần sign, không tốn gas
```

### 2. **Pure Functions** (Không đọc storage)

```solidity
// Contract
function calculateRate(uint256 utilization) external pure returns (uint256) {
    return utilization * 100;
}
```

```javascript
// JavaScript gọi:
const rate = await contract.calculateRate(50);
// ✅ Không cần kết nối blockchain thậm chí!
```

### 3. **Write Functions** (Thay đổi state)

```solidity
// Contract
function updateSlope1(uint64 newSlope1) external onlyOwner {
    _slope1 = newSlope1;
}
```

```javascript
// JavaScript gọi:
const tx = await contract.updateSlope1(634195839674n);
await tx.wait();
// ✅ Cần signer, tốn gas, thay đổi blockchain
```

---

## 🔍 VÍ DỤ THỰC TẾ TRONG DỰ ÁN BẠN:

### Example 1: Đọc reserve data

```javascript
// scripts/check_reserve.cjs
const { ethers } = require('hardhat');

async function main() {
    const pool = await ethers.getContractAt(
        'LendingPool',
        '0x56328671A331a3563e86C4CC53b5E1945733A3E3'
    );
    
    // ✅ GỌI FUNCTION TỪ CONTRACT
    const reserve = await pool.reserves(USDC_ADDRESS);
    
    console.log('Slope 1:', reserve.slope1RayPerSec.toString());
    console.log('Slope 2:', reserve.slope2RayPerSec.toString());
}

main();
```

**Output:**
```
Slope 1: 63419583966
Slope 2: 317097919837
✅ Đọc được từ contract!
```

### Example 2: Set parameters lúc deploy

```javascript
// scripts/deploy_ganache_simple.cjs
const pool = await LendingPool.deploy(...);
await pool.waitForDeployment();

// ✅ GỌI FUNCTION initReserve TỪ CONTRACT
await pool.initReserve(
    await usdc.getAddress(),
    6,
    1000, 7500, 8000, 500, 5000,
    true,
    8000,        // optimalU
    base,        // base rate
    s1,          // slope1
    s2           // slope2
);
```

**Kết quả:**
- Contract được deploy
- Parameters được set vào contract storage
- ✅ JavaScript đã tương tác với contract thành công!

### Example 3: Update parameters (nếu có function)

```javascript
// scripts/update_params.cjs
const pool = await ethers.getContractAt('LendingPool', POOL_ADDRESS);

// ✅ GỌI FUNCTION UPDATE TỪ CONTRACT
const tx = await pool.updateInterestRateParams(
    USDC_ADDRESS,
    9000,              // new optimalU
    newBase,           // new base
    newSlope1,         // new slope1
    newSlope2          // new slope2
);

await tx.wait();
console.log('✅ Updated!');
```

**Kết quả:**
- Parameters trong contract đã thay đổi
- ✅ JavaScript đã update contract thành công!

---

## 🎯 LUỒNG HOẠT ĐỘNG:

### Trường hợp: Update Slope1 từ JavaScript

```
Step 1: JavaScript Code
├─ const newSlope1 = toRayPerSec(0.05); // 0.5% APR
└─ await pool.updateInterestRateParams(asset, optimalU, base, newSlope1, slope2)

Step 2: Transaction Signed
├─ Signer signs transaction
└─ Transaction sent to blockchain

Step 3: Contract Execution
├─ function updateInterestRateParams() executed
├─ r.slope1RayPerSec = newSlope1; // UPDATE STORAGE
└─ emit InterestRateParamsUpdated(...)

Step 4: Blockchain Updated
├─ Transaction included in block
└─ Contract storage changed

Step 5: Result
└─ ✅ Slope1 updated từ 0.2% → 0.5% APR
```

---

## 📝 CODE TRONG DỰ ÁN BẠN:

### Đã có tương tác JavaScript ↔️ Contract:

#### 1. **Frontend (React/Next.js)**
```typescript
// lendhub-frontend-nextjs/src/components/TokenCard.tsx

const aprData = useReserveAPR(
    provider,
    poolAddress,
    token.address,
    30000  // Auto-refresh every 30s
);

// ✅ Frontend gọi contract function mỗi 30s để lấy APR!
```

#### 2. **Backend Scripts**
```javascript
// scripts/deploy_*.cjs
const pool = await LendingPool.deploy(...);
await pool.initReserve(...);

// ✅ Script gọi contract functions khi deploy!
```

#### 3. **Indexer**
```javascript
// indexer/index.js
async function syncReserves() {
    const reserve = await pool.reserves(tokenAddress);
    await db.updateReserve(reserve);
}

// ✅ Indexer đọc từ contract và lưu vào DB!
```

---

## 🎯 TÓM TẮT:

### ✅ JavaScript CÓ THỂ:

1. **Đọc** data từ contract (view functions)
   ```javascript
   const data = await contract.reserves(address);
   ```

2. **Gọi** functions thay đổi state (write functions)
   ```javascript
   const tx = await contract.updateSlope1(newValue);
   ```

3. **Listen** events từ contract
   ```javascript
   contract.on('Supply', (event) => {
       console.log('Supply event:', event);
   });
   ```

4. **Estimate gas** trước khi gửi transaction
   ```javascript
   const gas = await contract.updateSlope1.estimateGas(newValue);
   ```

### ❌ JavaScript KHÔNG THỂ:

1. Gọi private/internal functions trực tiếp
2. Bypass access control (modifiers)
3. Thay đổi code contract (bytecode)
4. Xem private variables trực tiếp

---

## 💡 KẾT LUẬN:

**JavaScript ↔️ Smart Contract = HOÀN TOÀN TƯƠNG TÁC ĐƯỢC!**

```
JavaScript Files           Smart Contract
├─ deploy_*.cjs       ───→  initReserve()
├─ update_params.js   ───→  updateInterestRateParams()  
├─ frontend code      ───→  reserves(address)
└─ indexer.js         ───→  All view functions

✅ Tất cả đều hoạt động!
✅ Đọc và ghi đều được!
✅ Chỉ cần ABI + Address + Provider
```

**Công cụ cần:**
- Ethers.js hoặc Web3.js
- Contract ABI
- Signer (cho write operations)
- RPC Provider




