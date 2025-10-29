# 🎯 AAVE USDC INTEREST RATE PARAMETERS

## 📋 Official Values (Ethereum Mainnet)

```
Base Variable Borrow Rate:    0%
Variable Rate Slope 1:         4% APR
Variable Rate Slope 2:        75% APR  
Optimal Utilization:          90%
Max Interest Rate (Rmax):     79% APR
```

## 📊 Visual Breakdown

```
Utilization | Borrow Rate | Explanation
------------|-------------|-------------
0%          | 0%          | Only base rate
50%         | ~2.2%       | Slope 1 active (50%/90% = 0.555)
80%         | ~3.6%       | Slope 1 active (80%/90% = 0.888)
90%         | 4%          | Slope 1 max (reaches Optimal U)
95%         | ~42.5%      | Slope 2 kicks in hard
100%        | 79%         | Maximum rate (Rmax)
```

## 🔗 Sources

### 1. Aave App
- Open: https://app.aave.com/reserve-overview/?underlyingAsset=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- Scroll down to "Interest Rate Model" section

### 2. Etherscan
- PoolDataProvider: https://etherscan.io/address/0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
- Function: `getReserveConfigurationData(address asset)`

### 3. Aave Docs
- URL: https://docs.aave.com/risk/asset-risk/risk-parameters
- Section: Interest Rate Strategy

## 📐 Calculation Formula

```solidity
// Convert percentage to RAY per second
const SECONDS_PER_YEAR = 31,536,000;

baseRayPerSec = (0 * 1e27) / SECONDS_PER_YEAR;        // 0
slope1RayPerSec = (0.04 * 1e27) / SECONDS_PER_YEAR;   // ~1,269,391,679 RAY/sec
slope2RayPerSec = (0.75 * 1e27) / SECONDS_PER_YEAR;   // ~23,800,343,982 RAY/sec

// Calculate rate based on utilization U
if (U <= 90%) {
    rate = base + slope1 * (U / 90%)
} else {
    rate = base + slope1 + slope2 * ((U - 90%) / 10%)
}
```

## 🆚 Comparison: Your Project vs Aave

| Parameter | Your Project | Aave USDC | Difference |
|-----------|--------------|-----------|------------|
| Base      | 0.1% APR     | 0% APR    | +0.1%      |
| Slope 1   | 0.2% APR     | 4% APR    | -3.8%      |
| Slope 2   | 1% APR       | 75% APR   | -74%       |
| Optimal U | 80%          | 90%       | -10%       |
| Rmax      | 1.3% APR     | 79% APR   | -77.7%     |

## 💡 Why Aave Values?

1. **Slope 1 = 4%**: Moderate incentive at low utilization
2. **Slope 2 = 75%**: Strong penalty to prevent over-utilization
3. **Optimal U = 90%**: High but safe threshold
4. **Rmax = 79%**: Strong incentive to repay/refinance

These values are tuned for **real-world DeFi usage** where:
- High TVL competition
- Need to balance supply/demand
- Prevent bank runs

## 🚀 Using Aave Parameters

```javascript
// In your deploy script
const toRayPerSec = (apr) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

const aaveBase = toRayPerSec(0);    // 0% like Aave
const aaveS1 = toRayPerSec(0.04);   // 4% like Aave  
const aaveS2 = toRayPerSec(0.75);   // 75% like Aave
const aaveOptimalU = 9000;          // 90% like Aave

await pool.initReserve(
  usdcAddress, 6,
  1000, 7500, 8000, 500, 5000,  // Other params
  true,                         // borrowable
  aaveOptimalU,                 // 90%
  aaveBase,                     // 0%
  aaveS1,                       // 4%
  aaveS2                        // 75%
);
```

---

**Last Updated**: 2024
**Source**: Aave Protocol V3, Ethereum Mainnet




