# 🔒 COLLATERAL TOGGLE BUTTON - HƯỚNG DẪN

## ✅ ĐÃ THÊM:

**Collateral Toggle Button** trong mỗi TokenCard!

---

## 🎯 VỊ TRÍ:

Button hiển thị ngay bên dưới address của mỗi token:
```
WETH
0x5Fb...a123
🔒 Collateral  ← Button này!
```

---

## 🎨 UI FEATURES:

### States:

1. **🔒 Collateral** (Green)
   - Background: `bg-green-100`
   - Text: `text-green-700`
   - Border: `border-green-300`
   - Meaning: Asset đang dùng làm collateral

2. **🔓 Not Collateral** (Gray)
   - Background: `bg-gray-100`
   - Text: `text-gray-500`
   - Border: `border-gray-300`
   - Meaning: Asset không dùng làm collateral

3. **⏳** (Loading)
   - Khi đang toggle
   - Disabled state

---

## 💻 CÁCH SỬ DỤNG:

### 1. **Check Status:**
- Button hiển thị status hiện tại
- Auto-check khi component load
- Update khi user supply/withdraw

### 2. **Toggle Collateral:**
```typescript
// Click button
→ Check HF
→ Send transaction
→ Wait confirmation
→ Update UI
→ Auto refresh
```

### 3. **Logic:**
- ✅ Chỉ hiển thị khi `token.userSupply > 0`
- ✅ Check HF trước khi disable
- ✅ Update state sau transaction
- ✅ Auto refresh UI

---

## 🔧 CODE CHANGES:

### File: `src/components/TokenCard.tsx`

**Added:**
- `signer` prop
- `isCollateral` state
- `isToggling` state
- `checkCollateralStatus()` useEffect
- `handleToggleCollateral()` function
- Button UI in header

### File: `src/components/SimpleDashboard.tsx`

**Added:**
- Pass `signer` prop to TokenCard

---

## ⚠️ LƯU Ý:

### Constraints:
- Chỉ hiển thị khi có supply (`token.userSupply > 0`)
- Không thể disable nếu HF < 1.0
- Cần signer để toggle

### Behavior:
- Toggle ngay lập tức
- Check HF trong contract
- Error nếu violate health factor
- Auto refresh sau success

---

## 🎯 EXAMPLES:

### 1. **Enable Collateral:**
```
User supplies 10 DAI
→ Button shows: 🔓 Not Collateral
→ Click
→ Transaction sent
→ Wait...
→ Button shows: 🔒 Collateral ✅
```

### 2. **Disable Collateral:**
```
User có debt
→ Check HF > 1.0
→ If HF < 1.0 → ❌ Block
→ If HF >= 1.0 → ✅ Allow
→ Button shows: 🔒 Collateral → 🔓 Not Collateral
```

---

## 🚀 TESTING:

### 1. **Test Enable:**
```bash
1. Supply some tokens
2. Check button appears
3. Click toggle
4. Confirm transaction
5. Verify status changes
```

### 2. **Test Disable:**
```bash
1. Have collateral enabled
2. Have debt
3. Click toggle
4. If HF < 1.0 → Block with error
5. If HF >= 1.0 → Allow
```

---

## ✅ READY TO USE!

Button đã sẵn sàng trong UI!

**Location:** Mỗi token card trong dashboard

**Status:** ✅ Working (chờ deploy contract mới)


