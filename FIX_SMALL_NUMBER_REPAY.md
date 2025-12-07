# 🔧 Fix: Lỗi Parse Số Quá Nhỏ (< 0.000001)

## ⚠️ Vấn Đề

Lỗi: `invalid FixedNumber string value (argument="value", value="2.70083360753e-7", code=INVALID_ARGUMENT)`

**Nguyên nhân:**
- Khi số quá nhỏ, `parseFloat()` trả về scientific notation (ví dụ: `2.70083360753e-7`)
- `parseUnits()` của ethers.js không thể parse scientific notation
- Gây lỗi khi parse token amount

## ✅ Giải Pháp

### 1. Set về 0 nếu số < 0.000001

**Logic:**
- Nếu `debtNum < 0.000001` → Set amount = "0" và return
- Nếu `amountNum < 0.000001` → Show toast và return
- Không cho phép repay số quá nhỏ

### 2. Convert Scientific Notation

**Trong `parseTokenAmount()`:**
- Detect scientific notation (có chứa 'e' hoặc 'E')
- Convert về fixed decimal string trước khi parse
- Handle error `INVALID_ARGUMENT` với scientific notation

### 3. Validate Trước Khi Repay

**Trong `handleRepay()`:**
- Check `debtNum < MIN_REPAY_AMOUNT` → Return early
- Check `amountNum < MIN_REPAY_AMOUNT` → Show toast và return

## 📝 Code Thay Đổi

### File 1: `lendhub-frontend-nextjs/src/components/RepayModal.tsx`

**1. handleMaxClick() (Dòng 75-95):**
```typescript
const MIN_REPAY_AMOUNT = 0.000001;
if (debtNum < MIN_REPAY_AMOUNT) {
  setAmount('0');
  return;
}
```

**2. handleRepay() - Check MIN (Dòng 113-125):**
```typescript
const MIN_REPAY_AMOUNT = 0.000001;
if (debtNum < MIN_REPAY_AMOUNT || amountNum < MIN_REPAY_AMOUNT) {
  showToast({
    type: 'info',
    title: 'Amount Too Small',
    message: 'Debt amount is too small (< 0.000001). No repayment needed.'
  });
  setIsLoading(false);
  return;
}
```

**3. handleRepay() - Normal amount (Dòng 230-250):**
```typescript
const MIN_REPAY_AMOUNT = 0.000001;
if (amountNum < MIN_REPAY_AMOUNT) {
  showToast({
    type: 'info',
    title: 'Amount Too Small',
    message: 'Repay amount is too small (< 0.000001). Please enter a larger amount.'
  });
  setIsLoading(false);
  return;
}

// Convert scientific notation to decimal
if (trimmedAmount.includes('e') || trimmedAmount.includes('E')) {
  trimmedAmount = amountNum.toFixed(token.decimals);
}
```

### File 2: `lendhub-frontend-nextjs/src/lib/tx.ts`

**parseTokenAmount() (Dòng 1112-1140):**
```typescript
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    // Convert scientific notation to decimal string if needed
    let amountStr = amount;
    if (amount.includes('e') || amount.includes('E')) {
      const num = parseFloat(amount);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${amount}`);
      }
      amountStr = num.toFixed(decimals);
    }
    
    return parseUnits(amountStr, decimals);
  } catch (error: any) {
    // Handle invalid FixedNumber string (scientific notation)
    if (error.code === 'INVALID_ARGUMENT' && error.argument === 'value') {
      const num = parseFloat(amount);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${amount}`);
      }
      const fixed = num.toFixed(decimals);
      return parseUnits(fixed, decimals);
    }
    // ... other error handling
  }
}
```

## 🎯 Cách Hoạt Động

### Scenario 1: Số Nợ Quá Nhỏ

```
Debt: 0.000000029386754516 DAI (< 0.000001)
→ Nhấn MAX
→ Input: "0"
→ Không cho phép repay
→ Show toast: "Amount Too Small"
```

### Scenario 2: Số Nợ Bình Thường

```
Debt: 0.001 DAI (> 0.000001)
→ Nhấn MAX
→ Input: "0.001"
→ Repay: 0.001 DAI ✅
```

### Scenario 3: Scientific Notation

```
Amount: "2.70083360753e-7"
→ parseTokenAmount detect 'e'
→ Convert: "0.000000270083360753"
→ Parse thành công ✅
```

## 🧪 Test Cases

1. **Test với số quá nhỏ:**
   - Debt: 0.0000005 DAI
   - Nhấn MAX → Input = "0"
   - Repay → Show toast "Amount Too Small"

2. **Test với scientific notation:**
   - Amount: "2.7e-7"
   - parseTokenAmount → Convert về "0.00000027"
   - Parse thành công

3. **Test với số bình thường:**
   - Debt: 0.001 DAI
   - Nhấn MAX → Input = "0.001"
   - Repay → Thành công

## 📊 Kết Quả Mong Đợi

- ✅ Số < 0.000001 → Set về "0" và không cho repay
- ✅ Scientific notation → Convert về decimal trước khi parse
- ✅ Không còn lỗi "invalid FixedNumber string value"
- ✅ User experience tốt hơn với toast message rõ ràng

