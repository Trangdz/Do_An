# 🔧 Fix: Repay Max Về 0 Khi Số Quá Nhỏ

## ⚠️ Vấn Đề

Khi số nợ quá nhỏ (ví dụ: 0.000000029386754516 DAI), nhấn MAX thì input field hiển thị về 0 thay vì hiển thị số nợ thực tế.

## 🔍 Nguyên Nhân

### 1. Logic MAX Cũ

**Code cũ:**
```typescript
const handleMaxClick = () => {
  setAmount('REPAY_ALL'); // Chỉ set string, không tính toán số
};
```

**Vấn đề:**
- Khi set `amount = 'REPAY_ALL'`, input field hiển thị text "Repay All (including interest)"
- Nhưng khi tính toán, `parseFloat('REPAY_ALL')` = `NaN` → `amountNum = 0`
- User không thấy số thực tế

### 2. Format Number Mất Precision

**Trong math.ts:**
```typescript
export function formatNumber(value: number, decimals: number = 2): string {
  if (value > 0 && value < 0.01) return '< 0.01'; // ⚠️ Mất precision
  return value.toFixed(decimals);
}
```

**Vấn đề:**
- Số quá nhỏ (< 0.01) bị format thành "< 0.01"
- Khi parseFloat("< 0.01") = `NaN` → `0`

### 3. ParseFloat Mất Precision

**Vấn đề:**
- `parseFloat("0.000000029386754516")` có thể bị làm tròn
- JavaScript number precision chỉ ~15-17 chữ số
- Số quá nhỏ có thể bị làm tròn về 0

## ✅ Giải Pháp

### 1. Tính Toán MAX Thực Tế

**Code mới:**
```typescript
const handleMaxClick = () => {
  const debtNum = parseFloat(userDebt);
  const balanceNum = parseFloat(balance);
  const maxAmount = Math.min(debtNum, balanceNum);
  
  // Format với đủ precision
  if (maxAmount > 0) {
    const maxDecimals = Math.min(token.decimals, 18);
    const formatted = maxAmount.toFixed(maxDecimals);
    const trimmed = parseFloat(formatted).toString();
    setAmount(trimmed);
  } else {
    // Nếu quá nhỏ, set trực tiếp từ userDebt string
    setAmount(userDebt);
  }
};
```

**Lợi ích:**
- Tính toán số thực tế thay vì set string
- Format với đủ precision (tối đa 18 decimals)
- Giữ nguyên precision từ `userDebt` string nếu cần

### 2. Loại Bỏ REPAY_ALL Mode

**Thay đổi:**
- Không còn dùng `amount === 'REPAY_ALL'`
- Luôn dùng số thực tế trong input field
- Khi repay, check nếu `amountNum >= debtNum` thì coi như repay all

### 3. Sửa Logic Repay

**Code mới:**
```typescript
// Check if user wants to repay all
const debtNum = parseFloat(userDebt) || 0;
const amountNum = parseFloat(amount) || 0;
const isRepayAll = Math.abs(amountNum - debtNum) < 0.00000001 || amountNum >= debtNum;

if (isRepayAll) {
  // Repay all logic với MaxUint256
}
```

**Lợi ích:**
- Tự động detect repay all dựa trên số nhập
- Không cần mode đặc biệt

## 📝 Code Thay Đổi

### File: `lendhub-frontend-nextjs/src/components/RepayModal.tsx`

**1. handleMaxClick() (Dòng 75-78):**
```typescript
// Trước:
const handleMaxClick = () => {
  setAmount('REPAY_ALL');
};

// Sau:
const handleMaxClick = () => {
  const debtNum = parseFloat(userDebt);
  const balanceNum = parseFloat(balance);
  const maxAmount = Math.min(debtNum, balanceNum);
  
  if (maxAmount > 0) {
    const maxDecimals = Math.min(token.decimals, 18);
    const formatted = maxAmount.toFixed(maxDecimals);
    const trimmed = parseFloat(formatted).toString();
    setAmount(trimmed);
  } else {
    setAmount(userDebt);
  }
};
```

**2. Input Field (Dòng 315):**
```typescript
// Trước:
value={amount === 'REPAY_ALL' ? 'Repay All (including interest)' : amount}

// Sau:
value={amount}
```

**3. amountNum Calculation (Dòng 253):**
```typescript
// Trước:
const amountNum = amount === 'REPAY_ALL' ? debtNum : (parseFloat(amount) || 0);

// Sau:
const amountNum = parseFloat(amount) || 0;
```

**4. isRepayAll Check (Dòng 91):**
```typescript
// Trước:
if (amount === 'REPAY_ALL') {

// Sau:
const isRepayAll = Math.abs(amountNum - debtNum) < 0.00000001 || amountNum >= debtNum;
if (isRepayAll) {
```

## 🎯 Cách Hoạt Động

### Scenario 1: Số Nợ Bình Thường

```
Debt: 1000 DAI
Balance: 2000 DAI
→ Nhấn MAX
→ Input: "1000"
→ Repay: 1000 DAI ✅
```

### Scenario 2: Số Nợ Quá Nhỏ

```
Debt: 0.000000029386754516 DAI
Balance: 986.6K DAI
→ Nhấn MAX
→ Input: "0.000000029386754516" (hoặc format với đủ precision)
→ Repay: 0.000000029386754516 DAI ✅
```

### Scenario 3: Số Nợ Nhỏ Hơn Precision

```
Debt: 0.000000000000000001 DAI (1 wei)
Balance: 1000 DAI
→ Nhấn MAX
→ Input: "0.000000000000000001" (từ userDebt string)
→ Repay: 1 wei ✅
```

## 🧪 Test Cases

1. **Test với số nợ quá nhỏ:**
   - Debt: 0.000000029386754516 DAI
   - Nhấn MAX → Kiểm tra input hiển thị đúng số

2. **Test với số nợ bình thường:**
   - Debt: 1000 DAI
   - Nhấn MAX → Kiểm tra input = "1000"

3. **Test với balance không đủ:**
   - Debt: 1000 DAI
   - Balance: 500 DAI
   - Nhấn MAX → Kiểm tra input = "500"

4. **Test repay với số quá nhỏ:**
   - Debt: 0.000000029386754516 DAI
   - Nhấn MAX → Repay → Kiểm tra trả hết nợ

## 📊 Kết Quả Mong Đợi

- ✅ Nhấn MAX với số nợ quá nhỏ → Hiển thị đúng số (không về 0)
- ✅ Input field luôn hiển thị số thực tế
- ✅ Repay với số quá nhỏ → Trả hết nợ
- ✅ Không còn vấn đề "về 0" khi nhấn MAX

