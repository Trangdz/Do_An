# 🚫 Tắt Auto-Enable Collateral

## ✅ Đã Sửa

### Contract: `contracts/core/LendingPool.sol`
Đã **XÓA** logic auto-enable collateral trong function `lend()`:

```solidity
// Trước đây (đã xóa):
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;
    emit CollateralEnabled(msg.sender, asset);
}

// Bây giờ:
// Note: NOT auto-enabling as collateral
// User must manually enable collateral via setUserUseReserveAsCollateral()
```

## 🎯 Hành Vi Mới

### Khi Supply Asset:
1. ✅ Asset được supply vào pool
2. ❌ **KHÔNG** tự động bật làm collateral
3. ✅ User phải tự bật thủ công qua toggle switch

### Khi Enable Collateral:
1. User click toggle switch ON
2. Transaction được gửi đến `setUserUseReserveAsCollateral(asset, true)`
3. Asset được bật làm collateral

## 📝 Cần Redeploy Contract

Vì đã thay đổi contract logic, bạn cần redeploy:

### Option 1: Dùng Script (Khuyến nghị)
```bash
npx hardhat run scripts/redeploy-no-auto-collateral.js --network localhost
```

### Option 2: Manual Deploy
1. Compile contract:
   ```bash
   npx hardhat compile
   ```

2. Deploy lại contracts:
   ```bash
   # Deploy InterestRateModel
   # Deploy PriceOracle  
   # Deploy LendingPool (với params: irm, oracle, weth, dai)
   ```

3. Update addresses trong frontend:
   - File: `lendhub-frontend-nextjs/src/addresses.js`
   - Copy ABI mới: `artifacts/contracts/core/LendingPool.sol/LendingPool.json` → `lendhub-frontend-nextjs/src/abis/LendingPool.json`

## 🎨 UI Flow

### Trước Khi Supply:
```
🔘 Collateral: OFF (gray)
📌 "Supply to enable" badge
```

### Sau Khi Supply (Chưa Enable):
```
🔘 Collateral: OFF (gray)  
📊 Supply amount hiển thị
✏️ Click toggle để enable
```

### Sau Khi Enable:
```
🟢 Collateral: ON (green)
✅ "ON" status hiển thị
```

## 🔍 Test Scenarios

### Test 1: Supply Không Auto-Enable
1. Connect wallet
2. Supply WETH (100 tokens)
3. **Check:** Collateral switch = OFF (gray)
4. **Check:** Phải click toggle để enable

### Test 2: Manual Enable
1. Supply WETH
2. Click toggle → ON
3. **Check:** Switch = ON (green)
4. **Check:** Can now use as collateral to borrow

### Test 3: Disable Collateral
1. Enable collateral
2. Borrow some DAI
3. Try to disable collateral
4. **Expected:** Error or warning (HF would be < 1)

## ✅ Lợi Ích

- ✅ **Full Control:** User kiểm soát hoàn toàn collateral
- ✅ **Flexibility:** Supply assets mà không phải dùng làm collateral
- ✅ **Safety:** Explicit action required → ít nhầm lẫn
- ✅ **Clarity:** UI rõ ràng về trạng thái collateral

## 📌 Lưu Ý

1. **Nếu có debt:** Không thể disable collateral nếu HF sẽ < 1
2. **Bảo vệ:** Contract check health factor trước khi disable
3. **UX:** Frontend warning dialog khi thao tác nguy hiểm
4. **Migration:** Contracts cũ vẫn auto-enable, cần redeploy

## 🚀 Quick Start

```bash
# 1. Compile
npx hardhat compile

# 2. Deploy (nếu cần)
npx hardhat run scripts/redeploy-no-auto-collateral.js --network localhost

# 3. Restart frontend
cd lendhub-frontend-nextjs
npm run dev

# 4. Hard refresh browser
# Ctrl + Shift + R
```

---

**Updated:** Contract đã được cập nhật. Cần redeploy để áp dụng thay đổi.

