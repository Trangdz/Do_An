# Health Factor Calculation Issues

## Problems Found

### 1. **Buffer Mismatch**
- **Contract**: `col * 100 > totalNewDebt * 101` (1% buffer)
- **Frontend**: `healthFactor < 1.1` (10% buffer)

### 2. **USDC LTV Issue**
- If USDC has `ltvBps = 0`, collateral value = 0
- This causes HF = 0, preventing borrowing

### 3. **Validation Logic**
- Contract and frontend use different validation approaches
- Frontend is more restrictive than contract

## Root Cause Analysis

### Contract Logic:
```solidity
// Health factor calculation
if (debtValue1e18 == 0) {
    healthFactor1e18 = type(uint256).max;
} else {
    healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
}

// Borrow validation
require(col * 100 > totalNewDebt * 101, "Health factor too low");
```

### Frontend Logic:
```typescript
// Health factor calculation
if (debt === 0) return Number.MAX_SAFE_INTEGER;
return collateral / debt;

// Borrow validation
if (healthFactor < 1.1) {
  throw new Error(`Health factor too low (${healthFactor.toFixed(2)})`);
}
```

## Issues

### 1. **USDC Collateral Problem**
If USDC has `ltvBps = 0`:
- `weightedCollateral = (supplyValueUSD * 0) / 10000 = 0`
- `collateralValue1e18 += 0` (no collateral value)
- `healthFactor1e18 = 0 / debtValue1e18 = 0`

### 2. **Buffer Inconsistency**
- Contract allows borrowing if `col * 100 > totalNewDebt * 101`
- Frontend blocks if `healthFactor < 1.1`
- These are different thresholds!

### 3. **Validation Order**
- Frontend validates before contract
- If frontend blocks, transaction never reaches contract
- Contract validation is more lenient

## Solutions

### 1. **Fix USDC LTV**
Ensure USDC has proper LTV:
```solidity
// USDC should have ltvBps > 0 (e.g., 8000 = 80%)
reserves[usdcAddress].ltvBps = 8000;
```

### 2. **Align Buffer Logic**
Make frontend match contract:
```typescript
// Change from 1.1 to 1.01 to match contract
if (healthFactor < 1.01) {
  throw new Error(`Health factor too low (${healthFactor.toFixed(2)})`);
}
```

### 3. **Debug Health Factor**
Add logging to see actual values:
```typescript
console.log('HF Debug:', {
  collateralUSD,
  debtUSD,
  healthFactor,
  ltvBps: reserve.ltvBps
});
```

## Immediate Fix

### Check USDC LTV:
1. Verify USDC has `ltvBps > 0`
2. If 0, set to 8000 (80%)
3. This will make USDC usable as collateral

### Align Validation:
1. Change frontend buffer from 1.1 to 1.01
2. This matches contract's 1% buffer
3. Allows borrowing when contract allows it

## Testing

### Before Fix:
- USDC collateral = 0 (if ltvBps = 0)
- HF = 0
- Cannot borrow

### After Fix:
- USDC collateral = supply * price * 0.8
- HF = collateral / debt
- Can borrow if HF > 1.01

## Next Steps

1. **Check USDC LTV** in contract
2. **Fix frontend buffer** to match contract
3. **Test borrowing** with corrected values
4. **Verify HF calculation** is consistent

The main issue is likely USDC having `ltvBps = 0`, making it unusable as collateral.
