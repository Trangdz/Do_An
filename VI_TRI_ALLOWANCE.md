# 📍 Vị Trí Code Hiển Thị "Allowance"

## 🎯 Vị Trí Chính

**File:** `lendhub-frontend-nextjs/src/components/LendModal.tsx`

**Dòng:** 395-401

## 📝 Code Chi Tiết

```tsx
// Dòng 395-401
<div className="flex justify-between items-center">
  <span className="text-sm font-medium text-gray-600">Allowance</span>
  <span className={`text-sm font-mono ${
    parseFloat(allowance) === 0 ? 'text-red-600' : 'text-gray-900'
  }`}>
    {formatNumber(parseFloat(allowance), 4)} {token.symbol}
  </span>
</div>
```

## 🔍 Giải Thích

### 1. Label "Allowance" (Dòng 396)
```tsx
<span className="text-sm font-medium text-gray-600">Allowance</span>
```
- Đây là chữ "Allowance" mà bạn thấy trong UI
- Style: `text-sm font-medium text-gray-600`

### 2. Giá Trị Allowance (Dòng 397-400)
```tsx
<span className={`text-sm font-mono ${
  parseFloat(allowance) === 0 ? 'text-red-600' : 'text-gray-900'
}`}>
  {formatNumber(parseFloat(allowance), 4)} {token.symbol}
</span>
```
- Hiển thị giá trị allowance
- **Nếu allowance = 0** → Màu đỏ (`text-red-600`) ← Đây là lý do bạn thấy màu đỏ!
- **Nếu allowance > 0** → Màu xám đen (`text-gray-900`)
- Format số với 4 chữ số thập phân

## 🎨 Logic Màu Sắc

```tsx
parseFloat(allowance) === 0 ? 'text-red-600' : 'text-gray-900'
```

**Điều kiện:**
- `allowance === 0` → Màu đỏ (cảnh báo)
- `allowance > 0` → Màu xám đen (bình thường)

## 📊 Context Xung Quanh

**Trước đó (Dòng 390-394):**
```tsx
<div className="flex justify-between items-center">
  <span className="text-sm font-medium text-gray-600">Your Balance</span>
  <span className="text-sm font-mono text-gray-900">
    {balance} {token.symbol}
  </span>
</div>
```

**Sau đó (Dòng 404-433):**
- Comment về allowance info (đã bị comment)
- Hiển thị thông báo nếu allowance > 0 (approved)
- Hiển thị cảnh báo nếu balance = 0

## 🔧 State Management

**State được định nghĩa ở dòng 46:**
```tsx
const [allowance, setAllowance] = useState('0');
```

**State được cập nhật ở dòng 184:**
```tsx
setAllowance(allowanceStr);
```

**Giá trị được lấy từ:**
- Dòng 171: `getTokenAllowance(useProvider, token.address, userAddress, poolAddress, token.decimals)`

## 🎯 Tóm Tắt

**Vị trí hiển thị "Allowance":**
- **File:** `lendhub-frontend-nextjs/src/components/LendModal.tsx`
- **Dòng:** 396 (label) và 397-400 (giá trị)
- **Màu đỏ khi:** `allowance === 0`
- **Màu xám khi:** `allowance > 0`

**Để sửa:**
- Thay đổi text "Allowance" → Sửa dòng 396
- Thay đổi màu sắc → Sửa dòng 398
- Thay đổi format số → Sửa dòng 400

