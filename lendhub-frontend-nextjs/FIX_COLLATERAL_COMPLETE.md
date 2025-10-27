# ✅ Fix Collateral Toggle - Hoàn Thành

## 🎯 Vấn Đề Đã Giải Quyết

### 1. **Lỗi Internal JSON-RPC Error** ✅
- **Nguyên nhân**: ABI frontend thiếu method `setUserUseReserveAsCollateral`
- **Giải pháp**: Copy ABI đầy đủ từ `artifacts/` sang `src/abis/LendingPool.json`

### 2. **Error Message Không Rõ Ràng** ✅
- **Vấn đề**: Không parse được revert reason từ contract
- **Giải pháp**: 
  - Thêm `estimateGas()` để check trước khi send transaction
  - Parse error chi tiết hơn từ ethers v6 format
  - Handle các lỗi cụ thể: Health factor, No supply, Invalid collateral

### 3. **UX Improvements** ✅
- **Pre-check**: Check Health Factor trước khi disable
- **Warning Dialog**: Cảnh báo khi HF < 2.0
- **Detailed Error Messages**: Message rõ ràng cho từng loại lỗi

## 📝 Các Thay Đổi

### File: `src/abis/LendingPool.json`
- ✅ Added method: `setUserUseReserveAsCollateral(address,bool)`
- ✅ Added method: `getAccountData(address)`
- ✅ Added all other missing methods from contract

### File: `src/components/TokenCard.tsx`
- ✅ Improved error parsing for ethers v6
- ✅ Added gas estimation before transaction
- ✅ Added health factor pre-check
- ✅ Better error messages for users

## 🚀 Cách Sử Dụng

### 1. **Refresh Browser**
**BẮT BUỘC:** Phải refresh để load ABI mới
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### 2. **Test Collateral Toggle**

#### Test Case 1: Enable Collateral
1. Connect MetaMask
2. Supply một asset (ví dụ: WETH)
3. Toggle collateral switch ON
4. ✅ Should work without error

#### Test Case 2: Disable Collateral (No Debt)
1. Supply asset
2. Enable as collateral
3. Toggle switch OFF
4. ✅ Should work if no debt

#### Test Case 3: Disable Collateral (With Debt)
1. Supply asset A, enable as collateral
2. Borrow asset B
3. Toggle asset A collateral switch OFF
4. ⚠️ Should show warning if Health Factor < 2.0
5. ❌ Should reject if Health Factor would be < 1.0

## 🛡️ Error Messages

### Health Factor Too Low
```
❌ CANNOT DISABLE COLLATERAL!

⚠️ Safety Check Failed:

You have DEBT and this is your ONLY collateral.

Disabling would make:
• Health Factor < 1.00
• Your position LIQUIDATABLE!

✅ TO FIX:
1. Repay ALL your debt first
   OR
2. Enable another asset as collateral
3. Then disable this one

🛡️ Protocol protects you!
```

### No Supply Balance
```
❌ No supply balance

You must supply this asset first.
```

### Asset Cannot Be Used As Collateral
```
❌ Asset cannot be used as collateral

This asset has LTV = 0%.
```

## 📊 How It Works

### Flow Diagram
```
1. User clicks toggle
   ↓
2. Check current account (collateral, debt, HF)
   ↓
3. If disabling and HF < 2.0 → Show warning dialog
   ↓
4. Estimate gas to simulate transaction
   ↓
5. If estimate fails with specific error → Show detailed message
   ↓
6. Otherwise → Send transaction with proper gas limit
   ↓
7. Wait for confirmation
   ↓
8. Update UI and reload page
```

## 🔍 Technical Details

### ABI Update
```bash
# Copy from artifacts
$abi = Get-Content -Raw "artifacts\contracts\core\LendingPool.sol\LendingPool.json" | ConvertFrom-Json
$abi.abi | ConvertTo-Json -Depth 10 | Out-File "src\abis\LendingPool.json"
```

### Error Parsing
```typescript
// Check multiple error formats
if (error?.shortMessage) { // ethers v6
  revertReason = error.shortMessage;
}
if (error?.reason) { // ethers v5
  revertReason = error.reason;
}
```

### Gas Estimation
```typescript
// Estimate first to catch revert reasons early
estimatedGas = await contract.method.estimateGas(...)
// Catch error and extract revert reason
catch (estError) {
  if (estError.reason.includes('Health factor')) {
    alert('Cannot disable');
    return;
  }
}
```

## ✅ Kết Quả

- ✅ ABI updated với tất cả methods
- ✅ Error handling tốt hơn
- ✅ UX improvements (warnings, confirmations)
- ✅ Detailed error messages
- ✅ No linter errors
- ✅ Health factor protection

## 📌 Lưu Ý

1. **Nếu thay đổi contract:**
   - Luôn copy ABI mới từ `artifacts/`
   - Restart server nếu cần
   - Hard refresh browser

2. **Nếu vẫn gặp lỗi:**
   - Check console log để xem error chi tiết
   - Verify contract đã deploy
   - Verify Ganache đang chạy
   - Check MetaMask connection

3. **Development:**
   - Server đang chạy ở: `http://localhost:3000`
   - ABI location: `src/abis/LendingPool.json`
   - Contract ABI: `artifacts/contracts/core/LendingPool.sol/LendingPool.json`

