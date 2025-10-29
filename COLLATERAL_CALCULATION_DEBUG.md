# Collateral Calculation Debug

## Contract Logic for Collateral

From `_getAccountData()` function (lines 162-207):

```solidity
function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    // Loop through all initialized assets
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        // Skip if reserve not initialized
        if (r.lastUpdate == 0) continue;
        
        // Get asset price
        uint256 price = oracle.getAssetPrice1e18(asset);
        if (price == 0) continue; // Skip if price not available
        
        // Calculate collateral value (weighted by LTV)
        // ONLY if user has enabled this asset as collateral
        uint256 supply = _currentSupply(user, asset);
        if (supply > 0 && u.useAsCollateral) {
            // collateralValue = supply * price * ltvBps / 10000
            uint256 supplyValueUSD = (supply * price) / 1e18;
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            collateralValue1e18 += weightedCollateral;
        }
        
        // Calculate debt value
        uint256 debt = _currentDebt(user, asset);
        if (debt > 0) {
            uint256 debtValueUSD = (debt * price) / 1e18;
            debtValue1e18 += debtValueUSD;
        }
    }
    
    // Calculate health factor
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
    }
}
```

## Requirements for Collateral

### 1. **Reserve Must Be Initialized**
```solidity
if (r.lastUpdate == 0) continue;
```
- Check: `reserves[asset].lastUpdate > 0`

### 2. **Price Must Be Available**
```solidity
uint256 price = oracle.getAssetPrice1e18(asset);
if (price == 0) continue;
```
- Check: `oracle.getAssetPrice1e18(asset) > 0`

### 3. **User Must Have Supply**
```solidity
uint256 supply = _currentSupply(user, asset);
if (supply > 0 && u.useAsCollateral) {
```
- Check: `_currentSupply(user, asset) > 0`

### 4. **Asset Must Be Enabled as Collateral**
```solidity
if (supply > 0 && u.useAsCollateral) {
```
- Check: `userReserves[user][asset].useAsCollateral = true`

### 5. **LTV Must Be > 0**
```solidity
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
```
- Check: `reserves[asset].ltvBps > 0`

## Debug Checklist

### ✅ Check 1: Reserve Initialized?
```javascript
const reserve = await pool.reserves(usdcAddress);
console.log("Reserve initialized:", reserve.lastUpdate > 0);
```

### ✅ Check 2: Price Available?
```javascript
const price = await oracle.getAssetPrice1e18(usdcAddress);
console.log("USDC Price:", ethers.formatEther(price));
```

### ✅ Check 3: User Has Supply?
```javascript
const userReserve = await pool.userReserves(userAddress, usdcAddress);
console.log("Supply principal:", userReserve.supply.principal.toString());
```

### ✅ Check 4: Collateral Enabled?
```javascript
console.log("Use as collateral:", userReserve.useAsCollateral);
```

### ✅ Check 5: LTV > 0?
```javascript
console.log("LTV:", reserve.ltvBps.toString());
```

## Common Issues

### Issue 1: LTV = 0
- If `ltvBps = 0`, weightedCollateral = 0
- **Solution**: Set LTV > 0 (e.g., 8000 = 80%)

### Issue 2: Collateral Not Enabled
- If `useAsCollateral = false`, collateral not counted
- **Solution**: Enable collateral

### Issue 3: Price = 0
- If oracle doesn't have price, skip asset
- **Solution**: Set price in oracle

### Issue 4: Reserve Not Initialized
- If `lastUpdate = 0`, skip asset
- **Solution**: Initialize reserve

## Quick Test

Run this in console to check all conditions:

```javascript
const pool = new ethers.Contract(poolAddress, abi, provider);
const reserve = await pool.reserves(usdcAddress);
const userReserve = await pool.userReserves(userAddress, usdcAddress);

console.log("✅ All Checks:", {
  reserveInitialized: reserve.lastUpdate > 0,
  hasSupply: userReserve.supply.principal > 0,
  isCollateral: userReserve.useAsCollateral,
  hasLTV: reserve.ltvBps > 0,
  priceExists: true // Check oracle separately
});
```

The most common issue is **LTV = 0**, which makes `weightedCollateral = 0`!

