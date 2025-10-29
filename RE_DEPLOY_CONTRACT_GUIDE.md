# 🔄 REDEPLOY CONTRACT - HƯỚNG DẪN

## ❌ LỖI:

```
execution reverted (no data present; likely require(false) occurred
```

**Nguyên nhân:** Contract chưa có các functions mới (getUserCollateral, getDebtUtilization, etc.)

---

## ✅ CÁCH SỬA:

### 1. **Recompile Contract:**
```bash
npx hardhat compile
```

### 2. **Deploy lại LendingPool:**
```bash
npx hardhat run scripts/deploy_ganache_simple.cjs
```

### 3. **Update addresses.js:**
Cập nhật address mới của LendingPool:
```javascript
export const LendingPool = "0x...NEW_ADDRESS...";
```

### 4. **Restart frontend:**
```bash
cd lendhub-frontend-nextjs
npm run dev
```

---

## 📝 HOẶC:

### Skip UI Features (Tạm thời):

Nếu không muốn deploy lại, có thể comment out component trong `SimpleDashboard.tsx`:

```typescript
// {/* Collateral Management */}
// <CollateralManager
//   poolAddress={CONFIG.LENDING_POOL}
//   provider={provider}
//   signer={signer}
//   onRefresh={refresh}
// />
```

---

## 🎯 LỰA CHỌN:

**Option 1:** Deploy lại contract với functions mới
- ✅ Đầy đủ tính năng
- ✅ UI hoạt động đầy đủ
- ❌ Mất time, cần reset data

**Option 2:** Comment out component
- ✅ Nhanh, không cần deploy
- ❌ Mất tính năng collateral UI

---

**Recommend: Option 1** - Deploy lại để test đầy đủ! 🚀




