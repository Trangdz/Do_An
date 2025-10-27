# ✅ Fix: Không Rút Được Khi Asset Không Phải Collateral

## 🐛 Bug

**Vấn đề:** User không thể rút asset đã supply nếu asset **không bật làm collateral**, thậm chí khi không có debt.

### Symptoms:
```
- Supply: 300 USDC
- Collateral: OFF
- Max Withdraw: 0 USDC ❌
- Warning: "Your debt exceeds collateral"
```

## 🔍 Root Cause

WithdrawModal đang **LUÔN LUÔN** dùng công thức tính `x_max` dựa trên Health Factor:

```typescript
// ❌ Bug: Luôn check HF cho mọi asset
const maxWithdrawUSD = calculateMaxWithdraw(
  collateralUSD,  // Tổng collateral của account
  debtUSD,        // Tổng debt của account
  price,
  liquidationThreshold
);
```

Logic này **CHỈ ĐÚNG** cho assets dùng làm collateral. Khi asset không phải collateral:
- Không ảnh hưởng đến Health Factor
- Không cần tính toán phức tạp
- **Nên cho rút hết** (limited by supply & liquidity)

## ✅ Solution

### Fix Logic trong WithdrawModal.tsx:

```typescript
// ✅ Check xem asset có phải collateral không
useEffect(() => {
  const checkCollateralStatus = async () => {
    const pool = new ethers.Contract(poolAddress, abi, provider);
    const userReserve = await pool.userReserves(userAddress, token.address);
    setIsCollateral(userReserve.useAsCollateral);
  };
  
  if (open) checkCollateralStatus();
}, [open, provider, signer, poolAddress, token.address]);

// ✅ Logic tính x_max
const calculateXMax = () => {
  const userSupplyNum = parseFloat(userSupply);
  const poolLiquidityNum = parseFloat(poolLiquidity);
  
  // ✅ Case 1: Không phải collateral → Rút hết
  if (!isCollateral) {
    return Math.min(userSupplyNum, poolLiquidityNum);
  }
  
  // ✅ Case 2: Là collateral → Check Health Factor
  const maxWithdrawUSD = calculateMaxWithdraw(...);
  const maxWithdrawTokens = maxWithdrawUSD / price;
  return Math.min(maxWithdrawTokens, userSupplyNum, poolLiquidityNum);
};

// ✅ Update canWithdraw logic
const canWithdraw = !isCollateral 
  ? xMax > 0  // Không cần check HF
  : (isHealthy && xMax > 0); // Cần check HF
```

## 🎯 Test Cases

### Test 1: Non-Collateral Asset
```
Setup:
- Supply 300 USDC (collateral = OFF)
- No other assets
- No debt

Expected:
✅ x_max = 300 USDC
✅ Can withdraw all
✅ No HF check
```

### Test 2: Collateral Asset, No Debt
```
Setup:
- Supply 300 USDC (collateral = ON)
- No debt

Expected:
✅ x_max = 300 USDC
✅ Can withdraw all
✅ No restrictions
```

### Test 3: Collateral Asset, Has Debt
```
Setup:
- Supply 300 USDC (collateral = ON)
- Supply 100 WETH (collateral = ON)
- Borrow 50 DAI
- Total collateral: $XXX, Debt: $XXX

Expected:
✅ x_max = calculated value (max safe amount)
✅ Limited by HF constraint
✅ Cannot withdraw all if HF would drop
```

### Test 4: Mixed Scenario
```
Setup:
- Supply 300 USDC (collateral = OFF)
- Supply 100 WETH (collateral = ON)
- Borrow 50 DAI

Expected:
- USDC: ✅ Can withdraw 300 (not collateral)
- WETH: ✅ Can withdraw partial (is collateral, HF check)
```

## 📝 Code Changes

### File: `src/components/WithdrawModal.tsx`

**Added:**
- `isCollateral` state
- `useEffect` to check collateral status from contract
- Conditional logic in `calculateXMax()`
- Updated `canWithdraw` logic

**Changed:**
- `calculateXMax()` now handles both cases
- Proper handling for non-collateral assets

## ✅ Kết Quả

### Before Fix:
```
Asset: 300 USDC (collateral = OFF)
Max Withdraw: 0 USDC ❌
Error: "Cannot withdraw safely"
```

### After Fix:
```
Asset: 300 USDC (collateral = OFF)  
Max Withdraw: 300 USDC ✅
Can withdraw: YES ✅
No HF check: YES ✅
```

## 🚀 How to Test

### 1. **Test Non-Collateral Withdraw**
```bash
# 1. Supply asset WITHOUT enabling collateral
- Supply 300 USDC
- Toggle collateral = OFF

# 2. Try to withdraw
- Click Withdraw
- Check x_max = 300 USDC
- Can withdraw all ✅
```

### 2. **Test Collateral Withdraw**
```bash
# 1. Supply asset WITH collateral enabled
- Supply 300 USDC
- Toggle collateral = ON

# 2. Try to withdraw with debt
- Borrow some DAI
- Click Withdraw
- Check x_max = limited by HF ✅
```

## 📌 Notes

1. **Contract Logic:** Đã đúng, không cần thay đổi
2. **Frontend Logic:** Cần check collateral status trước khi tính x_max
3. **Edge Cases:** Đã handle đầy đủ các trường hợp
4. **Performance:** Contract query khi mở modal, không ảnh hưởng UX

## 🎨 UI Flow

### Before:
```
User supplies → Opens withdraw → x_max = 0 (wrong)
```

### After:
```
User supplies → Opens withdraw → Check collateral status
  ├─ Not collateral → x_max = userSupply
  └─ Is collateral → Calculate x_max with HF check
```

---

**Status:** ✅ Fixed! Refresh browser to apply changes.

