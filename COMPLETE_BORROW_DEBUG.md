# Complete Borrow Debug Guide

## All Validation Checks

### 1. Asset Initialization
```solidity
// Asset must be initialized
if (reserves[asset].liquidityIndex == 0 && reserves[asset].lastUpdate == 0) {
    revert AssetNotInitialized();
}
```

### 2. Asset Borrowable
```solidity
// Asset must be borrowable
if (!r.isBorrowable) revert InvalidAmount();
```

### 3. Health Factor Check
```solidity
// HF must be > 1.01 after borrow
require(col * 100 > totalNewDebt * 101, "Health factor too low");
```

### 4. Collateral Check
```solidity
// Must have at least one enabled collateral
if (debt == 0 && borrowAmount1e18 > 0) {
    bool hasCollateral = false;
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address assetAddr = _allAssets[i];
        ReserveUserModels.UserReserveData storage uCheck = userReserves[msg.sender][assetAddr];
        if (uCheck.useAsCollateral && uCheck.supply.principal > 0) {
            hasCollateral = true;
            break;
        }
    }
    require(hasCollateral, "No collateral enabled");
}
```

### 5. Liquidity Check
```solidity
// Pool must have enough liquidity
require(r.reserveCash >= borrowAmount1e18, "Insufficient liquidity");
```

## Debug Steps

### Step 1: Check Asset Initialization
```javascript
// Check if USDC is initialized
const pool = new ethers.Contract(poolAddress, abi, provider);
const reserve = await pool.reserves(usdcAddress);
console.log("USDC Reserve:", {
    liquidityIndex: reserve.liquidityIndex.toString(),
    lastUpdate: reserve.lastUpdate.toString(),
    isInitialized: reserve.liquidityIndex > 0 || reserve.lastUpdate > 0
});
```

### Step 2: Check Asset Borrowable
```javascript
// Check if USDC is borrowable
console.log("USDC Borrowable:", reserve.isBorrowable);
```

### Step 3: Check Health Factor
```javascript
// Check account data
const accountData = await pool.getAccountData(userAddress);
console.log("Account Data:", {
    collateral: ethers.formatEther(accountData.collateralValue1e18),
    debt: ethers.formatEther(accountData.debtValue1e18),
    healthFactor: ethers.formatEther(accountData.healthFactor1e18)
});
```

### Step 4: Check Collateral Status
```javascript
// Check if USDC is enabled as collateral
const userReserve = await pool.userReserves(userAddress, usdcAddress);
console.log("USDC Collateral:", {
    useAsCollateral: userReserve.useAsCollateral,
    supplyPrincipal: userReserve.supply.principal.toString(),
    hasCollateral: userReserve.useAsCollateral && userReserve.supply.principal > 0
});
```

### Step 5: Check Pool Liquidity
```javascript
// Check pool liquidity
console.log("Pool Liquidity:", {
    reserveCash: ethers.formatEther(reserve.reserveCash),
    totalDebt: ethers.formatEther(reserve.totalDebtPrincipal),
    available: ethers.formatEther(reserve.reserveCash)
});
```

### Step 6: Check LTV
```javascript
// Check USDC LTV
console.log("USDC LTV:", {
    ltvBps: reserve.ltvBps.toString(),
    ltvPercent: (reserve.ltvBps / 100).toString() + "%"
});
```

## Common Issues

### Issue 1: Asset Not Initialized
- **Problem**: `liquidityIndex == 0 && lastUpdate == 0`
- **Solution**: Initialize the asset first

### Issue 2: Asset Not Borrowable
- **Problem**: `isBorrowable == false`
- **Solution**: Enable borrowing for the asset

### Issue 3: No Collateral Enabled
- **Problem**: No asset has `useAsCollateral == true`
- **Solution**: Enable collateral for at least one asset

### Issue 4: LTV = 0
- **Problem**: `ltvBps == 0` means no collateral value
- **Solution**: Set LTV > 0 (e.g., 8000 = 80%)

### Issue 5: Health Factor Too Low
- **Problem**: `col * 100 <= totalNewDebt * 101`
- **Solution**: Supply more collateral or reduce borrow amount

### Issue 6: Insufficient Liquidity
- **Problem**: `reserveCash < borrowAmount1e18`
- **Solution**: Add liquidity to the pool

## Quick Test

### Test with Small Amount
```javascript
// Try borrowing just 1 USDC first
const testAmount = ethers.parseUnits("1", 6); // 1 USDC
try {
    const tx = await pool.borrow(usdcAddress, testAmount);
    console.log("✅ Borrow successful:", tx.hash);
} catch (error) {
    console.error("❌ Borrow failed:", error.message);
}
```

## Expected Results

### If All Checks Pass:
```
✅ Asset initialized: true
✅ Asset borrowable: true
✅ Collateral enabled: true
✅ Health factor: 999.99
✅ Pool liquidity: 1000.0 USDC
✅ LTV: 80%
```

### If Any Check Fails:
```
❌ Asset not initialized
❌ Asset not borrowable
❌ No collateral enabled
❌ Health factor too low
❌ Insufficient liquidity
❌ LTV = 0%
```

## Next Steps

1. **Run all debug checks** above
2. **Identify which check fails**
3. **Fix the failing check**
4. **Try borrowing again**

The most likely issues are:
- USDC not initialized
- USDC LTV = 0
- No collateral enabled
- Health factor calculation error

