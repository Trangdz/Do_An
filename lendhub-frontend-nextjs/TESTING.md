# Testing Guide for Real-time Interest Calculation

## Test Files Created

1. **`src/lib/testInterestCalculation.ts`** - Unit tests for interest calculation logic
2. **`src/components/InterestCalculationTest.tsx`** - Interactive test component
3. **`src/pages/test-interest.tsx`** - Test page at `/test-interest`
4. **`src/components/DepositInterestDebug.tsx`** - Debug component for deposit page

## How to Test

### 1. Run Unit Tests

Open browser console and run:
```javascript
import { runAllTests } from '@/lib/testInterestCalculation';
runAllTests();
```

Or visit `/test-interest` page to see interactive tests.

### 2. Test in Deposit Page

1. Navigate to `/deposit/[symbol]` (e.g., `/deposit/USDC`)
2. Open browser console (F12)
3. Look for debug logs:
   - `📊 Fetched chain snapshot` - Data from chain
   - `✅ Calculated balance from chain` - Balance calculation
   - `🔍 Checking rate before realtime update` - Rate check
   - `💰 Starting realtime updates` - Real-time started
   - `💰 Realtime update` - Updates every 10 seconds
   - `💰 Balance calculation` - Balance calculation details

4. Check debug component (only in development mode):
   - Expand "Interest Calculation Debug" section
   - Verify all values are correct
   - Check for warnings

### 3. Expected Behavior

#### Initial State (New Deposit)
- `snapshotIndex` = `liquidityIndex` (both = RAY)
- `interestEarned` = 0 (no interest yet)
- `displayBalance` = `suppliedPrincipal`

#### After Real-time Starts
- `displayBalance` should increase gradually
- `interestEarned` = `displayBalance` - `suppliedPrincipal`
- `currentIndex` should increase continuously
- Updates every 1 second

#### After 1 Year
- `interestEarned` ≈ `suppliedPrincipal * (APR / 100)`
- For 0.35% APR and 1200 principal: interest ≈ 4.2

## Debug Checklist

- [ ] `principalWad` > 0
- [ ] `snapshotIndexRay` > 0 and valid
- [ ] `rateRayPerSec` > 0 OR `supplyAPR` > 0
- [ ] `isLoadingSnapshot` = false
- [ ] `isRealtimeRunning` = true
- [ ] `displayBalance` > `suppliedPrincipal` (after some time)
- [ ] No errors in console
- [ ] Debug component shows correct values

## Common Issues

### Issue: Interest stays at 0
**Check:**
- Is `rateRayPerSec` > 0?
- Is `supplyAPR` > 0?
- Is real-time update running? (check `isRealtimeRunning`)
- Are indices valid? (check `snapshotIndexRay` and `oldIndexRay`)

### Issue: Real-time not starting
**Check:**
- Is `isLoadingSnapshot` = false?
- Is `principalWad` > 0?
- Is `snapshotIndexRay` valid?
- Check console for "⏸️ Skipping realtime update" log

### Issue: Balance not updating
**Check:**
- Is `displayBalance` being set?
- Is `updateBalance` function being called?
- Check console for "💰 Realtime update" logs
- Verify `intervalRef.current` is not null

## Test Scenarios

1. **New Deposit**: Deposit 1200 USDC, verify interest starts at 0
2. **After 1 minute**: Interest should be very small but > 0
3. **After 1 hour**: Interest should be noticeable
4. **After 1 day**: Interest should be significant
5. **Page Reload**: Interest should continue from saved snapshot
6. **Multiple Deposits**: Verify interest accumulates correctly

## Manual Test Script

```javascript
// Run in browser console on deposit page

// 1. Check initial state
console.log('Principal:', principalWadRef.current.toString());
console.log('Snapshot Index:', snapshotIndexRayRef.current.toString());
console.log('Current Index:', oldIndexRayRef.current.toString());
console.log('Rate:', rateRayPerSecRef.current.toString());
console.log('APR:', supplyAPR);
console.log('Display Balance:', displayBalance);
console.log('Interest:', interestEarned);

// 2. Wait 10 seconds, then check again
setTimeout(() => {
  console.log('After 10 seconds:');
  console.log('Display Balance:', displayBalance);
  console.log('Interest:', interestEarned);
}, 10000);

// 3. Check if real-time is running
console.log('Realtime running:', intervalRef.current !== null);
```

## Success Criteria

✅ Interest increases over time
✅ Balance = Principal + Interest
✅ Real-time updates every 1 second
✅ Interest persists after page reload
✅ Debug component shows correct values
✅ No errors in console
✅ All unit tests pass


