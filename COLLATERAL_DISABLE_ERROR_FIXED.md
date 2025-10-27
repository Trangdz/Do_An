# ✅ FIX: Lỗi khi Disable Collateral

## 🔍 VẤN ĐỀ:

Khi tắt collateral → Transaction bị revert với:
- `Internal JSON-RPC error (code -32603)`
- Không có message rõ ràng

## 🎯 NGUYÊN NHÂN:

Contract đang revert vì **Health Factor check**:

```solidity
// Line 568-570 trong LendingPool.sol
if (debt > 0) {
    require(collateralAfter >= debt, "Health factor would be < 1");
}
```

**Điều này có nghĩa:**
- Bạn có DEBT
- Disabling collateral này → HF < 1.00
- Contract từ chối để bảo vệ bạn khỏi liquidation!

---

## ✅ ĐÃ FIX:

### 1. **Better Error Handling:**
```typescript
if (reason.includes('Health factor would be < 1')) {
  alert('❌ CANNOT DISABLE COLLATERAL!\n\n⚠️ Your position would become liquidatable!\n\n...');
  return;
}
```

### 2. **Clear User Instructions:**
- ✅ Show WHY it failed (safety check)
- ✅ Show WHAT happens (HF < 1 → liquidatable)
- ✅ Show HOW to fix (repay debt OR enable other collateral)

### 3. **Protection Message:**
```
⚠️ Safety Check Failed:

You have DEBT ($X) and this is your ONLY collateral.

If you disable this collateral:
• Health Factor → < 1.00
• Position becomes LIQUIDATABLE!

✅ TO FIX:
1. Repay ALL your debt first
   OR
2. Enable another asset as collateral
3. Then you can disable this one

🛡️ Protocol protects you from liquidation!
```

---

## 🎯 WORKFLOW:

### Scenario 1: User có 1 collateral + debt
```
❌ Tắt collateral → Revert (correct!)
✅ Message: "Cannot disable - would be liquidatable"
✅ User hiểu được tại sao
```

### Scenario 2: User có 1 collateral + NO debt
```
✅ Tắt collateral → Success
(Because no debt, so no HF check)
```

### Scenario 3: User có 2+ collaterals + debt
```
✅ Tắt 1 collateral → Success (if HF still > 1)
❌ Tắt ALL collaterals → Revert (correct!)
```

---

**Đã fix trong:** `src/components/TokenCard.tsx`

**Logic:** Contract đúng, frontend giờ có message rõ ràng hơn! ✅

