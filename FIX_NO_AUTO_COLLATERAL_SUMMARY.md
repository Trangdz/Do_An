# ✅ Đã Tắt Auto-Enable Collateral

## 🎯 Vấn Đề

Khi supply một asset, nó **TỰ ĐỘNG** bật làm collateral. Bạn muốn **PHẢI TỰ TAY BẬT**.

## ✅ Giải Pháp

Đã **XÓA** logic auto-enable trong contract `LendingPool.sol`.

### Thay Đổi:
```solidity
// File: contracts/core/LendingPool.sol (line 287-292)

// ❌ XÓA ĐOẠN NÀY:
// if (r.ltvBps > 0 && !u.useAsCollateral) {
//     u.useAsCollateral = true;
//     emit CollateralEnabled(msg.sender, asset);
// }

// ✅ THÊM COMMENT:
// Note: NOT auto-enabling as collateral
// User must manually enable collateral via setUserUseReserveAsCollateral()
```

## 📋 Cần Làm Gì Tiếp

### 1. **Redeploy Contract** ⚠️ BẮT BUỘC

Vì đã thay đổi contract logic, bạn cần redeploy:

```bash
# Compile lại (đã done ✅)
npx hardhat compile

# Redeploy (chọn một option)
```

**Option A: Dùng script tự động**
```bash
npx hardhat run scripts/redeploy-no-auto-collateral.js --network localhost
```

**Option B: Manual deploy qua Hardhat console**
```bash
npx hardhat console --network localhost

# Trong console:
const LendingPool = await ethers.getContractFactory('LendingPool');
const pool = await LendingPool.deploy(irm, oracle, weth, dai);
await pool.waitForDeployment();
const address = await pool.getAddress();
console.log('New LendingPool:', address);
```

### 2. **Update Frontend Addresses**
```bash
# Copy address mới vào:
lendhub-frontend-nextjs/src/addresses.js

# Update: LendingPoolAddress = "0x..."
```

### 3. **Copy ABI Mới**
```bash
# ABI mới đã có trong artifacts, copy sang:
cp artifacts/contracts/core/LendingPool.sol/LendingPool.json \
   lendhub-frontend-nextjs/src/abis/LendingPool.json
```

### 4. **Restart Frontend**
```bash
cd lendhub-frontend-nextjs
npm run dev
```

### 5. **Hard Refresh Browser**
```
Ctrl + Shift + R (hoặc Cmd + Shift + R)
```

## 🎨 Hành Vi Mới

### Supply Asset:
```
1. User supplies 100 WETH
   ↓
2. Asset vào pool ✅
   ↓
3. Collateral switch = OFF (gray) ❌
   ↓
4. User phải click toggle để enable ✅
```

### Enable Collateral:
```
1. User clicks toggle switch
   ↓
2. Transaction: setUserUseReserveAsCollateral(token, true)
   ↓
3. Switch = ON (green) ✅
   ↓
4. Asset có thể dùng để borrow ✅
```

### Disable Collateral:
```
1. User clicks toggle switch
   ↓
2. Check Health Factor
   ↓
3. If HF would be < 1 → Error ❌
   ↓
4. Otherwise → Disabled ✅
```

## ✅ Kết Quả

- ✅ Supply asset **KHÔNG** auto-enable collateral
- ✅ User phải **TỰ TAY** bật collateral
- ✅ UI toggle switch hoạt động bình thường
- ✅ All safety checks vẫn hoạt động

## 📝 Files Changed

- ✅ `contracts/core/LendingPool.sol` - Xóa auto-enable
- ✅ `scripts/redeploy-no-auto-collateral.js` - Script redeploy
- ✅ `NO_AUTO_COLLATERAL.md` - Documentation chi tiết

## ⚠️ Lưu Ý

1. **Contracts cũ** (đã deploy) vẫn có logic cũ
2. **Cần redeploy** để áp dụng thay đổi mới
3. **Frontend** đã sẵn sàng, chỉ cần contract mới
4. **Ganache** reset = mất data, backup nếu cần

## 🚀 Quick Deploy

Nếu muốn deploy nhanh, dùng script:

```bash
# 1. Compile (đã done ✅)
# npx hardhat compile

# 2. Deploy
npx hardhat run scripts/redeploy-no-auto-collateral.js --network localhost

# 3. Update frontend addresses nếu cần
# (Script sẽ tự động update)

# 4. Restart frontend
cd lendhub-frontend-nextjs
npm run dev

# 5. Hard refresh browser
# Ctrl + Shift + R
```

---

**Status:** ✅ Contract code đã được fix. Cần redeploy để áp dụng.

