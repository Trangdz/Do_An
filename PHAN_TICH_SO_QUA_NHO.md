# 🔍 Phân Tích: Số Quá Nhỏ Vẫn Hiển Thị

## 📊 Vấn Đề

Khi nhấn MAX với số nợ `0.000000200000000116` (< 0.000001), nó vẫn hiển thị số này thay vì "0".

## 🔍 Phân Tích

### 1. Kiểm Tra ParseFloat

```javascript
parseFloat("0.000000200000000116")
// Kết quả: 2.00000000116e-7 (scientific notation)
```

**Vấn đề:**
- `parseFloat()` convert về scientific notation
- Khi so sánh `2.00000000116e-7 < 0.000001` → Có thể có vấn đề với floating point precision
- Khi `toString()` → Có thể trả về scientific notation hoặc decimal

### 2. Logic Hiện Tại

```typescript
const debtNum = parseFloat(userDebt) || 0;
const MIN_REPAY_AMOUNT = 0.000001;

if (debtNum < MIN_REPAY_AMOUNT) {
  setAmount('0');
  return;
}
```

**Vấn đề có thể:**
1. `parseFloat()` mất precision với số quá nhỏ
2. So sánh floating point không chính xác
3. `userDebt` string có thể có format khác

### 3. Test Case

```javascript
// Test 1: Parse
const debt = "0.000000200000000116";
const debtNum = parseFloat(debt);
console.log(debtNum); // 2.00000000116e-7

// Test 2: Comparison
console.log(debtNum < 0.000001); // true (should be true)

// Test 3: toString
console.log(debtNum.toString()); // "2.00000000116e-7" hoặc "0.000000200000000116"
```

## ✅ Giải Pháp

### Giải Pháp 1: So Sánh Trực Tiếp Với String

**Thay vì parseFloat, so sánh string trực tiếp:**

```typescript
const handleMaxClick = () => {
  const debtNum = parseFloat(userDebt) || 0;
  const balanceNum = parseFloat(balance) || 0;
  
  // So sánh trực tiếp với string để tránh floating point issues
  const MIN_REPAY_AMOUNT = 0.000001;
  const MIN_REPAY_AMOUNT_STR = "0.000001";
  
  // Check cả số và string
  if (debtNum < MIN_REPAY_AMOUNT || parseFloat(userDebt) < parseFloat(MIN_REPAY_AMOUNT_STR)) {
    setAmount('0');
    return;
  }
  
  // ... rest of logic
};
```

### Giải Pháp 2: Convert Về Number Chính Xác

**Sử dụng Number() thay vì parseFloat():**

```typescript
const debtNum = Number(userDebt) || 0;
```

### Giải Pháp 3: So Sánh Với Epsilon

**Sử dụng epsilon để so sánh:**

```typescript
const MIN_REPAY_AMOUNT = 0.000001;
const EPSILON = 1e-10;

if (Math.abs(debtNum - MIN_REPAY_AMOUNT) < EPSILON || debtNum < MIN_REPAY_AMOUNT) {
  setAmount('0');
  return;
}
```

### Giải Pháp 4: Check String Length (Tốt Nhất)

**Kiểm tra số chữ số thập phân:**

```typescript
const handleMaxClick = () => {
  const debtNum = parseFloat(userDebt) || 0;
  const balanceNum = parseFloat(balance) || 0;
  
  // Check nếu số quá nhỏ bằng cách so sánh trực tiếp
  // Nếu userDebt có nhiều hơn 6 chữ số 0 sau dấu chấm → quá nhỏ
  const MIN_REPAY_AMOUNT = 0.000001;
  
  // So sánh chính xác hơn
  if (debtNum < MIN_REPAY_AMOUNT || debtNum === 0 || isNaN(debtNum)) {
    setAmount('0');
    return;
  }
  
  // Đảm bảo không có scientific notation
  let maxAmount = Math.min(debtNum, balanceNum);
  
  if (maxAmount < MIN_REPAY_AMOUNT) {
    setAmount('0');
    return;
  }
  
  // Format với đủ precision
  const maxDecimals = Math.min(token.decimals, 18);
  const formatted = maxAmount.toFixed(maxDecimals);
  
  // Kiểm tra lại sau khi format
  const finalAmount = parseFloat(formatted);
  if (finalAmount < MIN_REPAY_AMOUNT) {
    setAmount('0');
    return;
  }
  
  // Remove trailing zeros
  const trimmed = finalAmount.toString();
  setAmount(trimmed);
};
```

## 🎯 Giải Pháp Tốt Nhất

**Kết hợp nhiều cách:**

1. **Check trước khi parse:**
   - Nếu `userDebt` string có nhiều hơn 6 chữ số 0 sau dấu chấm → Quá nhỏ

2. **So sánh chính xác:**
   - Dùng `Number()` thay vì `parseFloat()`
   - So sánh với epsilon

3. **Check lại sau khi format:**
   - Sau khi format, check lại xem có < MIN_REPAY_AMOUNT không

4. **Fallback:**
   - Nếu bất kỳ check nào fail → Set về "0"

