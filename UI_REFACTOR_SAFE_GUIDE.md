# 🎨 HƯỚNG DẪN ĐỔI GIAO DIỆN AN TOÀN

## ✅ AN TOÀN - Có thể đổi tự do

### 1. **Styling/Design**
```tsx
// AN TOÀN: Đổi màu, spacing, typography
<div className="bg-blue-500 p-4">  // Cũ
<div className="bg-purple-600 p-6 rounded-lg">  // Mới ✅
```

### 2. **Layout Structure**
```tsx
// AN TOÀN: Thay đổi cách bố trí
<div className="grid grid-cols-2">  // Cũ
<div className="flex flex-col gap-4">  // Mới ✅
```

### 3. **Visual Elements**
- Icons, images
- Borders, shadows
- Animations, transitions
- Responsive breakpoints

---

## ⚠️ CẨN THẬN - Chỉ đổi UI, giữ nguyên logic

### 1. **Event Handlers** 
```tsx
// ✅ ĐỔI: Thêm visual effects
<button onClick={handleSubmit} className="btn-primary">
  Submit
</button>

// ❌ KHÔNG ĐỔI: Function name/params
onClick={handleSubmit}  // Phải giữ nguyên
```

### 2. **Component Props**
```tsx
// ✅ ĐỔI: Styling của prop
<SimpleRealtimeBalance
  principal={bigint}
  tokenSymbol="WETH"
/>

// ❌ KHÔNG ĐỔI: Prop names/types
<SimpleRealtimeBalance
  principal={bigint}  // Đúng type
  // principal={number}  // ❌ SAI!
/>
```

### 3. **State & Hooks**
```tsx
// ✅ ĐỔI: Cách hiển thị state
const balance = useBalance();
<div>{balance}</div>  // Cũ
<div className="text-2xl font-bold">{balance}</div>  // Mới ✅

// ❌ KHÔNG ĐỔI: State structure hay hook logic
```

---

## 🚨 KHÔNG ĐỔI - Logic nghiệp vụ

### 1. **Contract Interactions**
- Function calls (`contract.lend()`, `contract.borrow()`)
- Parameter validation
- Error handling logic

### 2. **Data Calculations**
- Interest calculation logic
- Health factor formulas
- Balance computations

### 3. **State Management**
- Redux/Context structure (nếu có)
- localStorage keys
- API endpoint URLs

---

## 📋 CHECKLIST KHI ĐỔI UI

### Trước khi đổi:
- [ ] Commit code hiện tại vào Git
- [ ] Tạo branch mới: `git checkout -b feature/new-ui`
- [ ] Xác định components cần đổi

### Khi đổi:
- [ ] Chỉ đổi CSS/styling, không đổi logic
- [ ] Giữ nguyên prop names/types
- [ ] Giữ nguyên event handler names
- [ ] Giữ nguyên state/hook structure

### Sau khi đổi:
- [ ] Test tất cả flows: Supply, Withdraw, Borrow, Repay
- [ ] Kiểm tra console không có errors
- [ ] Kiểm tra responsive trên mobile/tablet
- [ ] Verify balance calculations vẫn đúng

---

## 🎯 NHỮNG COMPONENT DỄ ĐỔI NHẤT

### 1. **TokenCard.tsx** ✅
- Chỉ cần đổi layout/styling
- Props đã rõ ràng
- Logic độc lập

### 2. **SimpleDashboard.tsx** ✅
- Main layout component
- Dễ đổi grid/flex layout
- Components con đã tách biệt

### 3. **Modal Components** ⚠️
- `WithdrawModal.tsx`
- `BorrowModal.tsx`
- Cần cẩn thận với form validation

---

## 🔧 CÔNG CỤ HỖ TRỢ

### 1. **Tailwind Config**
```js
// tailwind.config.js - Customize theme
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### 2. **Component Library**
- Có thể dùng: shadcn/ui, Chakra UI, Material-UI
- Chỉ cần replace JSX, logic giữ nguyên

### 3. **CSS Modules / Styled Components**
```tsx
// Có thể wrap components
import styles from './TokenCard.module.css';

<div className={styles.card}>  // Thay vì Tailwind
```

---

## 💡 BEST PRACTICES

1. **Progressive Enhancement**
   - Đổi từng component một
   - Test sau mỗi component
   - Không đổi hết một lúc

2. **Keep It Simple**
   - Ưu tiên Tailwind classes
   - Tránh custom CSS phức tạp
   - Dùng existing design tokens

3. **Document Changes**
   - Comment lại những chỗ đổi
   - Note lý do đổi
   - Giữ changelog

---

## 🚀 QUICK START

```bash
# 1. Tạo branch mới
git checkout -b feature/new-ui

# 2. Đổi một component nhỏ để test
# Ví dụ: Đổi màu nút trong TokenCard.tsx

# 3. Test
npm run dev
# Kiểm tra không có console errors

# 4. Commit
git add .
git commit -m "UI: Update TokenCard styling"

# 5. Tiếp tục với components khác
```

---

## ✅ KẾT LUẬN

**Có thể đổi giao diện an toàn nếu:**
- ✅ Chỉ đổi CSS/styling
- ✅ Giữ nguyên props/types
- ✅ Giữ nguyên event handlers
- ✅ Giữ nguyên logic calculations

**Sẽ lỗi nếu:**
- ❌ Đổi prop names
- ❌ Đổi function signatures
- ❌ Thay đổi state structure
- ❌ Sửa logic calculations

**Recommendation:** Đổi từng phần nhỏ, test kỹ, commit thường xuyên! 🎨

