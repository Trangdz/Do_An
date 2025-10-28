# Interest Calculation Verification

## User's Example:
- Principal: $123
- APR: 1.06%
- After 1 second: 123 × (1 + 1.06% / 31536000) = 123.00000000041

## Contract Formula:
```solidity
// Contract: borIndex = RayMath.rayMul(borIndex, 1e27 + uint256(r.variableBorrowRateRayPerSec) * dt)
// RayMath.rayMul(a, b) = (a * b) / 1e27
```

## Frontend Formula (Current):
```typescript
// 1. Calculate rateRayPerSec from APR
const rateRayPerSec = BigInt(Math.floor((apr * 1e27) / (SECONDS_PER_YEAR * 100)));

// 2. Calculate multiplier
const multiplier = RAY + (rateRayPerSec * BigInt(timeDiff));

// 3. Calculate newIndex
const estimatedNewIndex = (currentIndex * multiplier) / RAY;

// 4. Calculate balance
const newBalance = (principal * estimatedNewIndex) / snapshotIndex;
```

## Verification:

### Step 1: APR to rateRayPerSec
- APR = 1.06%
- rateRayPerSec = (1.06 × 1e27) / (31536000 × 100) = 1.06e27 / 3153600000
- rateRayPerSec = 336,191,011,407,407 (approximately)

### Step 2: Multiplier for 1 second
- timeDiff = 1
- multiplier = 1e27 + (336,191,011,407,407 × 1) = 1e27 + 336,191,011,407,407
- multiplier = 1,000,000,000,000,000,000,000,000,000 + 336,191,011,407,407
- multiplier = 1,000,000,000,336,191,011,407,407

### Step 3: New Index
- Assuming currentIndex = snapshotIndex = 1e27 (initial state)
- estimatedNewIndex = (1e27 × 1,000,000,000,336,191,011,407,407) / 1e27
- estimatedNewIndex = 1,000,000,000,336,191,011,407,407

### Step 4: New Balance
- principal = 123 × 1e18 = 123,000,000,000,000,000,000
- newBalance = (123,000,000,000,000,000,000 × 1,000,000,000,336,191,011,407,407) / 1e27
- newBalance = 123,000,000,000,000,000,000 × 1.000000000336191011407407
- newBalance = 123,000,000,000,000,000,041.34 (approximately)

### Step 5: Interest Accrued
- interestAccrued = newBalance - principal
- interestAccrued = 123,000,000,000,000,000,041.34 - 123,000,000,000,000,000,000
- interestAccrued = 41.34 (in wei)
- interestAccrued = 41.34 / 1e18 = 0.00000000000000004134 USD

## Expected vs Actual:
- Expected: 123.00000000041 USD
- Actual: 123.00000000000000004134 USD

## Issue Found:
The calculation is correct but the precision might be lost due to BigInt operations and rounding.

## Solution:
1. Use higher precision for intermediate calculations
2. Ensure proper rounding
3. Add logging to verify each step
