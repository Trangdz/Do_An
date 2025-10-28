# 🐛 Debug: Không Thấy Balance Tăng Realtime

## Vấn Đề

User không thấy balance tăng realtime trong browser.

## 🔍 Kiểm Tra

### 1. Mở Browser Console

```javascript
F12 → Console tab
```

### 2. Tìm Logs

Tìm các log sau:
- ✅ "Got balance with interest for USDC" 
- ⚠️ "Could not get balance with interest for USDC"
- 🔄 "Auto-refreshing balance with interest..."

### 3. Kiểm Tra Values

Check xem:
```javascript
// Trong console
📊 USDC supply: <number>
```

## 🎯 Các Nguyên Nhân Có Thể

### 1. **Contract Không Có Functions**

Nếu thấy:
```
⚠️ Could not get balance with interest for USDC, using principal
```

**Fix:** Deploy lại contract với các functions `getCurrentSupplyBalance()` và `getCurrentDebtBalance()`

### 2. **Contract Chưa Accrue Interest**

Balance chỉ tăng nếu contract **accrue interest**. Check:

```bash
# Trong truffle console hoặc hardhat console
await pool.accruePublic(usdcAddress);
```

### 3. **Auto-Refresh Không Chạy**

Check console có log "🔄 Auto-refreshing..." mỗi 30s không.

## 🔧 Cách Fix Nhanh

### Option 1: Manual Refresh

Trong browser console:
```javascript
// Force refresh
location.reload();
```

### Option 2: Check Contract

Test xem contract có functions:
```javascript
// Trong console của Ganache
const pool = await ethers.getContractAt("LendingPool", "0x...");
await pool.getCurrentSupplyBalance(userAddress, usdcAddress);
```

### Option 3: Check Balance Có Tăng

```javascript
// Trong browser console
console.log('Initial:', supplyAssets[0].supplyBalance);
// Đợi 30s
console.log('After 30s:', supplyAssets[0].supplyBalance);
```

## 📊 Debug Steps

### 1. Check Console Logs

Mở browser console và tìm:
- ✅ "Got balance with interest" → **OK**
- ⚠️ "Could not get balance" → **Problem**

### 2. Check SupplyAssets

```javascript
// Trong console
console.log('SupplyAssets:', supplyAssets);
console.log('SupplyBalance:', supplyAssets[0]?.supplyBalance);
console.log('SupplyPrincipal:', supplyAssets[0]?.supplyPrincipal);
```

### 3. Check Contract

Test contract trực tiếp:
```bash
node scripts/test_balance.cjs
```

## 🎯 Expected Results

### Console Logs Nên Có:

```
🔍 Checking supply for USDC (0x92...)
✅ Got balance with interest for USDC
📊 USDC: {
  principal: "100.0000",
  balanceWithInterest: "100.0010",  ← Tăng!
  borrowPrincipal: "0.0000"
}
✅ Found supply for USDC: {
  principal: "100.0000",
  withInterest: "100.0010"  ← Với lãi
}
```

### 30s Sau:

```
🔄 Auto-refreshing balance with interest...
📊 USDC supply: 100.0020  ← Tăng thêm!
```

## ✅ Fix Checklist

- [ ] Contract có `getCurrentSupplyBalance()`?
- [ ] Pool address đúng?
- [ ] Contract đã accrue interest?
- [ ] Auto-refresh chạy (log "🔄..." mỗi 30s)?
- [ ] Supply balance khác principal?

## 🚀 Quick Test

1. Open browser console
2. Connect MetaMask
3. Supply 100 USDC
4. Check console: `supplyAssets[0].supplyBalance`
5. Đợi 30s
6. Check lại: `supplyAssets[0].supplyBalance`

**Nếu vẫn không tăng → Contract chưa accrue hoặc chưa có functions!**


