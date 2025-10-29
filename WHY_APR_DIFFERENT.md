# ✅ GIẢI THÍCH: TẠI SAO SUPPLY APR ≠ BORROW APR

## 🎯 CÔNG THỨC

### Từ InterestRateModel:
```solidity
function getRates(...) returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec)
```

### Supply APR:
```typescript
supplyRate = borrowRate * utilization * (1 - reserveFactor)
supplyAPR = rayPerSecToAPR(supplyRateRayPerSec)
```

### Borrow APR:
```typescript
borrowRate = baseRate + slope1 * (U / Ustar) // Nếu U <= Ustar
borrowRate = baseRate + slope1 + slope2 * ((U - Ustar) / (1 - Ustar)) // Nếu U > Ustar
borrowAPR = rayPerSecToAPR(borrowRateRayPerSec)
```

---

## 📊 TẠI SAO KHÁC NHAU?

### 1. **Utilization (U = 0%):**
```
Có supply nhưng chưa ai borrow
→ Borrow rate: 1% (base rate + slopes)
→ Supply rate: 1% × 0% × (1 - reserveFactor) = 0%
```

### 2. **Supply APR < Borrow APR:**
```
Supply APR = Borrow Rate × Utilization × (1 - ReserveFactor)

Ví dụ:
- Borrow APR = 1%
- Utilization = 50%
- Reserve Factor = 10%

→ Supply APR = 1% × 0.5 × 0.9 = 0.45%
```

### 3. **Không hồi tố:**
```
Giây 1: Supply APR = 0% → P(1) = 100 × (1 + 0) = 100
Giây 2: Supply APR = 0.01% → P(2) = P(1) × (1 + 0.01%/31536000)
```

---

## ✅ HIỂN THỊ TRONG UI

### Trong hình ảnh:
```
Supply APR: 0.010% ✅ (Lãi bạn nhận khi supply)
Borrow APR: 1.00% ✅ (Lãi bạn trả khi borrow)
```

### Giải thích:
1. **Supply APR = 0.01%**: Do U rất thấp (0%)
2. **Borrow APR = 1%**: Rate khi borrow
3. **Khác nhau**: Vì `supplyRate = borrowRate × U × (1 - RF)`

---

## 🎯 KẾT LUẬN

### Supply APR < Borrow APR vì:
1. ✅ **Utilization effect**: U càng cao → Supply APR càng cao
2. ✅ **Reserve factor**: Platform giữ lại một phần lãi
3. ✅ **Economic incentive**: Khuyến khích supply, kiểm soát borrow

### Formula:
```
Supply APR = Borrow APR × Utilization × (1 - ReserveFactor)

Ví dụ:
- Borrow APR = 5%
- Utilization = 80%
- ReserveFactor = 10%

→ Supply APR = 5% × 0.8 × 0.9 = 3.6%
```

---

**🎉 GIẢI THÍCH: Supply APR ≠ Borrow APR là đúng!** ✨


