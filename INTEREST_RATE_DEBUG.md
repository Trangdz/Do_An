# Debug Borrow Issue - Interest Rate Analysis

## Current Issue from Console Logs

From the console logs, we see:
- `borrowRateRayPerSec`: `317097919837645888` (very high)
- `supplyRateRayPerSec`: `0`
- `borrowAPR`: `1.0000%`
- `supplyAPR`: `0.0000%`

## Root Cause Analysis

### 1. **Supply Rate = 0**
This happens when:
```solidity
// supply ≈ borrow * U * (1 - reserveFactor)
uint256 supply = (borrow * U) / 1e18;
supply = (supply * oneMinusRF) / 1e18;
```

If `U = 0` (no utilization) or `reserveFactor = 100%`, then `supply = 0`.

### 2. **High Borrow Rate**
The borrow rate `317097919837645888` suggests:
- Very high utilization rate (U close to 100%)
- Or slope parameters are too high

## Debug Steps

### Step 1: Check Utilization Rate
```javascript
// Check current utilization
const pool = new ethers.Contract(poolAddress, abi, provider);
const reserve = await pool.reserves(usdcAddress);

const totalSupplied = Number(ethers.formatEther(reserve.reserveCash + reserve.totalDebtPrincipal));
const totalBorrowed = Number(ethers.formatEther(reserve.totalDebtPrincipal));
const utilization = totalBorrowed / totalSupplied;

console.log("Utilization Analysis:", {
  totalSupplied,
  totalBorrowed,
  utilization: (utilization * 100).toFixed(2) + "%",
  reserveCash: ethers.formatEther(reserve.reserveCash),
  totalDebt: ethers.formatEther(reserve.totalDebtPrincipal)
});
```

### Step 2: Check Interest Rate Parameters
```javascript
// Check IRM parameters
console.log("IRM Parameters:", {
  optimalUBps: reserve.optimalUBps.toString(),
  baseRateRayPerSec: reserve.baseRateRayPerSec.toString(),
  slope1RayPerSec: reserve.slope1RayPerSec.toString(),
  slope2RayPerSec: reserve.slope2RayPerSec.toString(),
  reserveFactorBps: reserve.reserveFactorBps.toString()
});
```

### Step 3: Check Pool Liquidity
```javascript
// Check if pool has liquidity
console.log("Pool Liquidity:", {
  reserveCash: ethers.formatEther(reserve.reserveCash),
  isBorrowable: reserve.isBorrowable,
  hasLiquidity: Number(ethers.formatEther(reserve.reserveCash)) > 0
});
```

## Common Issues

### Issue 1: Pool Has No Liquidity
- **Problem**: `reserveCash = 0`
- **Solution**: Someone needs to supply tokens first

### Issue 2: Utilization = 100%
- **Problem**: All liquidity is borrowed
- **Solution**: Wait for repayments or add more liquidity

### Issue 3: Wrong IRM Parameters
- **Problem**: Slope parameters too high
- **Solution**: Adjust parameters in `initReserve`

### Issue 4: Reserve Factor = 100%
- **Problem**: `reserveFactorBps = 10000`
- **Solution**: Set to reasonable value (e.g., 1000 = 10%)

## Quick Fixes

### Fix 1: Add Liquidity
```javascript
// Supply some USDC to create liquidity
const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
await pool.lend(usdcAddress, usdcAmount);
```

### Fix 2: Check Reserve Parameters
```javascript
// Verify USDC reserve is properly configured
const reserve = await pool.reserves(usdcAddress);
console.log("USDC Reserve:", {
  isBorrowable: reserve.isBorrowable,
  ltvBps: reserve.ltvBps.toString(),
  reserveFactorBps: reserve.reserveFactorBps.toString(),
  optimalUBps: reserve.optimalUBps.toString()
});
```

## Expected Results

### Healthy Pool:
```
Utilization: 0-80%
Borrow APR: 1-5%
Supply APR: 0.5-3%
Reserve Cash: > 0
```

### Problem Pool:
```
Utilization: 100%
Borrow APR: Very high
Supply APR: 0%
Reserve Cash: 0
```

## Next Steps

1. **Check utilization rate** - if 100%, pool has no liquidity
2. **Check reserve parameters** - ensure reasonable values
3. **Add liquidity** if pool is empty
4. **Try borrowing** after fixing issues

The main issue is likely **pool has no liquidity** (reserveCash = 0), making utilization = 100% and supply rate = 0.


