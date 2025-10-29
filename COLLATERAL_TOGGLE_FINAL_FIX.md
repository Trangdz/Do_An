# ✅ FINAL FIX: Collateral Toggle Error Handling

## 🔍 VẤN ĐỀ:

Error `could not coalesce error` khi tắt collateral do không parse được revert reason từ transaction.

## ✅ GIẢI PHÁP:

### 1. **Simplify Error Handling:**

**Trước:**
- Try-catch estimateGas trước
- Nhiều layer error checking
- Complex error structure parsing

**Sau:**
- Gọi trực tiếp transaction
- Parse error structure đúng cách
- Focus vào revert reason extraction

### 2. **Better Error Extraction:**

```typescript
// Try multiple error structures
if (error?.error?.message) {
  revertReason = error.error.message;
}
else if (error?.reason) {
  revertReason = error.reason;
}
// ... etc
```

### 3. **Specific Handling for Internal JSON-RPC:**

When code = -32603 (Internal JSON-RPC error):
- Đây là transaction REVERT
- Nhưng Ganache không trả về reason
- Show helpful message thay vì "unknown error"

```typescript
if (errorCode === -32603) {
  alert('❌ TRANSACTION REVERTED!\n\n⚠️ Likely: Cannot disable collateral\n\nWhy?\n• You have DEBT\n• This is only collateral\n• Disabling → HF < 1\n\n...');
}
```

---

## 🎯 KẾT QUẢ:

✅ User thấy message rõ ràng về WHY failed  
✅ Hiểu WHAT to do next  
✅ Không bị confused bởi "unknown error"

---

**File updated:** `src/components/TokenCard.tsx`



