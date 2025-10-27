# 📍 CÁC THÔNG SỐ ĐƯỢC SET Ở ĐÂU VÀ TÍNH TOÁN THẾ NÀO?

## 🎯 PHẦN 1: NƠI SET PARAMETERS TRONG AAVE

### Bước 1: Governance Proposal
```
Người đề xuất:
→ Tạo proposal trên Aave Governance
→ Ví dụ: "Update USDC slope1 from 4% to 5%"
→ Community voting (AAVE token holders)
→ Pass → Parameters được update
```

### Bước 2: PoolConfigurator Executes
```solidity
// File: PoolConfigurator.sol
function updateInterestRateStrategyConfiguration(
    address asset,
    InterestRateParams memory params  // ← SET NHỮNG NÀY
) external onlyPoolAdmin {
    poolsDataProvider.setInterestRateParams(
        asset,
        params.optimalUtilizationRate,  // Uopt
        params.baseVariableBorrowRate,  // Base
        params.variableRateSlope1,      // Slope1
        params.variableRateSlope2      // Slope2
    );
}
```

### Bước 3: Lưu vào Storage
```solidity
// File: DefaultReserveInterestRateStrategyV2.sol
function setInterestRateParams(
    address reserve,
    InterestRateData calldata rateData
) external onlyPoolConfigurator {
    _interestRateData[reserve] = rateData;
    // ← PARAMETERS ĐƯỢC LƯU TẠI ĐÂY!
    
    emit RateDataUpdate(
        reserve,
        rateData.optimalUsageRatio,      // ← Uopt
        rateData.baseVariableBorrowRate, // ← Rbase
        rateData.variableRateSlope1,     // ← Slope1
        rateData.variableRateSlope2     // ← Slope2
    );
}
```

### Bước 4: Lưu trữ trên Blockchain
```
Mapping: _interestRateData[reserve_address]
        ↓
Struct: InterestRateData {
    optimalUsageRatio:        90    (90% = 9000 bps)
    baseVariableBorrowRate:   0     (0%)
    variableRateSlope1:       400   (4% = 400 bps)
    variableRateSlope2:      7500  (75% = 7500 bps)
}
```

---

## 🎯 PHẦN 2: CÁCH TÍNH TOÁN SỬ DỤNG PARAMETERS

### Công thức trong Aave:

```solidity
// File: DefaultReserveInterestRateStrategyV2.sol
// Line 146-167

function calculateInterestRates(...) {
    InterestRateDataRay memory rateData = _interestRateData[reserve];
    
    // ✅ LẤY PARAMETERS TỪ MAPPING
    vars.currentVariableBorrowRate = rateData.baseVariableBorrowRate;
    
    // Tính Utilization
    vars.borrowUsageRatio = params.totalDebt.rayDiv(vars.availableLiquidityPlusDebt);
    
    // ✅ SỬ DỤNG PARAMETERS ĐỂ TÍNH
    if (vars.borrowUsageRatio > rateData.optimalUsageRatio) {
        // U > Uopt → Slope 2
        
        uint256 excessBorrowUsageRatio = 
            (vars.borrowUsageRatio - rateData.optimalUsageRatio).rayDiv(
                WadRayMath.RAY - rateData.optimalUsageRatio
            );
        
        // CÔNG THỨC:
        // Rate = Base + Slope1 + Slope2 × ((U - Uopt) / (1 - Uopt))
        vars.currentVariableBorrowRate +=
            rateData.variableRateSlope1 +                    // ← Slope1
            rateData.variableRateSlope2.rayMul(excessBorrowUsageRatio); // ← Slope2
        
    } else {
        // U ≤ Uopt → Slope 1
        
        // CÔNG THỨC:
        // Rate = Base + Slope1 × (U / Uopt)
        vars.currentVariableBorrowRate += 
            rateData.variableRateSlope1.rayMul(vars.borrowUsageRatio)
              .rayDiv(rateData.optimalUsageRatio);
    }
    
    // Supply Rate
    vars.currentLiquidityRate = vars.currentVariableBorrowRate
        .rayMul(vars.supplyUsageRatio)
        .percentMul(PercentageMath.PERCENTAGE_FACTOR - params.reserveFactor);
    
    return (vars.currentLiquidityRate, vars.currentVariableBorrowRate);
}
```

---

## 📊 VÍ DỤ CỤ THỂ: USDC TRÊN AAVE

### Input Parameters:
```
Asset: USDC (address: 0xA0...eB48)
Base: 0%
Slope1: 4% (stored as 400 in bps)
Slope2: 75% (stored as 7500 in bps)
Optimal U: 90% (stored as 90% in Ray)
```

### Case 1: Utilization = 50% (< 90%)
```javascript
U = 50%
Uopt = 90%

// Formula: Rate = Base + Slope1 × (U / Uopt)
Rate = 0% + 4% × (50% / 90%)
     = 4% × 0.555...
     = 2.22% APR

// ✅ Kết quả: 2.22% borrow APR
```

### Case 2: Utilization = 92% (> 90%)
```javascript
U = 92%
Uopt = 90%

// Formula: Rate = Base + Slope1 + Slope2 × ((U - Uopt) / (1 - Uopt))
Rate = 0% + 4% + 75% × ((92% - 90%) / (1 - 90%))
     = 4% + 75% × (2% / 10%)
     = 4% + 75% × 0.2
     = 4% + 15%
     = 19% APR

// ✅ Kết quả: 19% borrow APR
```

### Case 3: Utilization = 100%
```javascript
U = 100%
Uopt = 90%

Rate = 0% + 4% + 75% × ((100% - 90%) / (1 - 90%))
     = 4% + 75% × (10% / 10%)
     = 4% + 75% × 1
     = 4% + 75%
     = 79% APR

// ✅ Kết quả: 79% borrow APR (Rmax)
```

---

## 🎯 PHẦN 3: SO SÁNH VỚI DỰ ÁN CỦA BẠN

### DỰ ÁN CỦA BẠN:

**Set Parameters:**
```javascript
// scripts/deploy_ganache_simple.cjs (Lines 79-81)

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

// ✅ SET PARAMETERS Ở ĐÂY
const base = toRayPerSec(0.001);   // 0.1% APR → RAY per second
const s1 = toRayPerSec(0.002);     // 0.2% APR → RAY per second
const s2 = toRayPerSec(0.01);      // 1% APR → RAY per second
const optimalU = 8000;             // 80% (in bps)

// ✅ PASS VÀO CONTRACT
await pool.initReserve(
    assetAddress,
    decimals,
    reserveFactor,
    ltv,
    liqThreshold,
    liqBonus,
    closeFactor,
    isBorrowable,
    optimalU,  // ← Set ở đây
    base,      // ← Set ở đây
    s1,        // ← Set ở đây
    s2         // ← Set ở đây
);
```

**Lưu trong Contract:**
```solidity
// contracts/core/LendingPool.sol

struct ReserveData {
    // ...
    uint16 optimalUBps;               // ← Lưu ở đây
    uint64 baseRateRayPerSec;         // ← Lưu ở đây
    uint64 slope1RayPerSec;           // ← Lưu ở đây
    uint64 slope2RayPerSec;           // ← Lưu ở đây
    // ...
}

// ✅ SET TRONG initReserve()
r.optimalUBps = optimalUBps;
r.baseRateRayPerSec = baseRateRayPerSec;
r.slope1RayPerSec = slope1RayPerSec;
r.slope2RayPerSec = slope2RayPerSec;
```

**Tính toán:**
```solidity
// contracts/core/InterestRateModel.sol

function getRates(...) {
    // ✅ LẤY PARAMETERS TỪ STORAGE
    uint256 base = uint256(baseRateRayPerSec);
    uint256 s1   = uint256(slope1RayPerSec);
    uint256 s2   = uint256(slope2RayPerSec);
    uint256 Ustar = (uint256(optimalUBps) * 1e14);
    
    // ✅ TÍNH RATE (giống Aave)
    if (U <= Ustar) {
        uint256 ratioWAD = (U * 1e18) / Ustar;
        borrow = base + (s1 * ratioWAD) / 1e18;
    } else {
        uint256 numer = U - Ustar;
        uint256 denom = (1e18 - Ustar);
        uint256 ratioWAD = (numer * 1e18) / denom;
        borrow = base + s1 + (s2 * ratioWAD) / 1e18;
    }
    
    return (borrowRateRayPerSec, supplyRateRayPerSec);
}
```

---

## 🔍 CONVERSION: APR (%) → RAY per second

### Công thức chuyển đổi:
```javascript
// 1. APR → per year
const ratePerYear = APR / 100  // 4% → 0.04

// 2. Per year → per second
const ratePerSecond = ratePerYear / SECONDS_PER_YEAR
                   = 0.04 / 31,536,000
                   = 0.000000001269

// 3. Per second → RAY
const rateInRAY = ratePerSecond * 1e27
                = 0.000000001269 * 1e27
                = 1,269,000,000,000
                = 1.269e12 RAY
```

**Hàm trong code:**
```javascript
// scripts/deploy_ganache_simple.cjs
const SECONDS_PER_YEAR = 365 * 24 * 3600;
const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

// Example:
toRayPerSec(0.002)  // 0.2% APR
// = 0.002 * 1e27 / 31536000
// = 63,419,583,966 RAY per second
```

---

## 📊 BẢNG CHUYỂN ĐỔI (Tham khảo)

| APR | RAY per second | Stored in Contract |
|-----|----------------|-------------------|
| 0.1% | 31,709,791,983 | `base` |
| 0.2% | 63,419,583,966 | `slope1` |
| 1% | 317,097,919,837 | `slope2` |
| 2% | 634,195,839,674 | |
| 4% | 1,268,391,679,348 | Aave USDC slope1 |
| 75% | ~23,781,869,000,000 | Aave USDC slope2 |

---

## 🎯 TÓM TẮT

### ⭐ NƠI SET PARAMETERS:

**Trong Aave:**
1. Governance proposal
2. PoolConfigurator.setInterestRateParams()
3. Lưu vào `_interestRateData[reserve]` mapping
4. On-chain storage (Ethereum blockchain)

**Trong dự án của bạn:**
1. Deploy script (deploy_*.cjs)
2. Function initReserve()
3. Lưu vào struct ReserveData
4. On-chain storage (Ganache/Local)

### ⭐ CÁCH TÍNH TOÁN:

**Cả hai đều dùng công thức 2-slope:**
```
If U ≤ Uopt:
    Rate = Base + Slope1 × (U / Uopt)

If U > Uopt:
    Rate = Base + Slope1 + Slope2 × ((U - Uopt) / (1 - Uopt))
```

**Format:**
- APR (%) → RAY per second trong contract
- RAY per second → APR (%) trong frontend

---

✅ **KẾT LUẬN: Aave và dự án của bạn dùng CÙNG CÔNG THỨC, chỉ khác giá trị!**

