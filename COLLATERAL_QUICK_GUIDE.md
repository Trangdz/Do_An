# 🚀 QUICK GUIDE: COLLATERAL MANAGEMENT

## 📋 TÓM TẮT CÁC CHỨC NĂNG MỚI:

### 🎯 6 Functions Mới:

1. **getUserCollateral(user)** - Danh sách assets dùng làm collateral
2. **canUseAsCollateral(asset)** - Check asset có thể làm collateral không
3. **getMaxBorrowable(user, asset)** - Số lượng tối đa có thể vay
4. **getDebtUtilization(user)** - % vay so với capacity (0-100%)
5. **setUserCollaterals(assets[], flags[])** - Enable/disable nhiều assets
6. **getLiquidationRisk(user, asset)** - Risk của asset riêng lẻ

### 🔧 2 Functions Đã Sửa:

1. **_maxWithdrawAllowed()** - Giới hạn rút dựa trên HF
2. **borrow()** - Thêm validation LTV và collateral check

---

## 💡 SỬ DỤNG:

### 1. Check Collateral Eligibility:
```js
const canCollateral = await pool.canUseAsCollateral(wethAddress);
console.log("Can use as collateral:", canCollateral); // true
```

### 2. Get User Collaterals:
```js
const collaterals = await pool.getUserCollateral(userAddress);
console.log("Collateral assets:", collaterals); // ["0x...WETH", "0x...DAI"]
```

### 3. Get Max Borrowable:
```js
const maxBorrow = await pool.getMaxBorrowable(userAddress, daiAddress);
console.log(`Max borrowable: ${maxBorrow / 1e18} DAI`);
```

### 4. Get Debt Utilization:
```js
const utilization = await pool.getDebtUtilization(userAddress);
console.log(`Using ${utilization / 100}% of capacity`);
```

### 5. Batch Operations:
```js
await pool.setUserCollaterals(
    [wethAddress, daiAddress],
    [true, true]  // Enable both as collateral
);
```

### 6. Check Liquidation Risk:
```js
const risk = await pool.getLiquidationRisk(userAddress, wethAddress);
if (risk > 5000) {
    alert("High risk! Don't disable this collateral!");
}
```

---

## ✅ KIỂM THỬ:

```bash
# Run test
npx hardhat test test/test_collateral_features.cjs

# Or deploy and test on Ganache
npx hardhat node
# Then deploy and run manual tests
```

---

## 📊 SO SÁNH VỚI AAVE:

| Feature | Status |
|---------|--------|
| Enable/Disable Collateral | ✅ |
| List User Collaterals | ✅ |
| Check Eligibility | ✅ |
| Max Borrowable | ✅ |
| Debt Utilization | ✅ |
| Batch Operations | ✅ |
| Liquidation Risk | ✅ |
| Withdraw Limit (HF) | ✅ |
| LTV Validation | ✅ |

**Giờ dự án đã giống Aave!** 🎉



