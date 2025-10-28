# 🔧 TROUBLESHOOTING - COLLATERAL MANAGEMENT

## ❌ LỖI PHỔ BIẾN:

### 1. **"no data present; likely require(false)"**

**Nguyên nhân:** Contract chưa có functions mới

**Giải pháp:**
```bash
# 1. Recompile
npx hardhat compile

# 2. Redeploy
npx hardhat run scripts/deploy_ganache_simple.cjs

# 3. Update address in frontend
# Update: src/addresses.js
```

---

### 2. **"Function not found"**

**Nguyên nhân:** ABI không đầy đủ

**Giải pháp:** Check ABI trong `src/abis/LendingPool.json`

---

### 3. **"execution reverted"**

**Nguyên nhân:** Logic error trong contract

**Giải pháp:** 
- Check Solidity code
- Verify parameters
- Check Health Factor

---

## ✅ CÁCH KIỂM TRA:

### 1. **Check Contract có functions mới:**
```javascript
// In browser console
const pool = new ethers.Contract(ADDRESS, ABI, provider);
console.log(pool.interface.functions);
// Check for: getUserCollateral, getDebtUtilization, etc.
```

### 2. **Test thủ công:**
```javascript
// Connect to contract
const pool = await ethers.getContractAt("LendingPool", ADDRESS);

// Test function
const collaterals = await pool.getUserCollateral(USER_ADDRESS);
console.log("Collaterals:", collaterals);
```

---

## 🚀 QUICK FIX:

Nếu lỗi vẫn xảy ra, hãy:

1. **Comment out component:**
   - Edit `SimpleDashboard.tsx`
   - Comment lines 609-614

2. **OR Deploy lại:**
   - Run deploy script
   - Update addresses
   - Refresh browser

---

## 📝 LOGS CHECK:

### Check console logs:
```bash
# Should see:
🔍 Fetching collaterals for user: 0x...
📊 Collaterals: []
📊 Utilization: 0 %

# If not, function doesn't exist
```

---

**Need more help?** Check `COLLATERAL_FEATURES_COMPLETE.md`



