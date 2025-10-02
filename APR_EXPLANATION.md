# 📊 GIẢI THÍCH CÁC CHỈ SỐ APR & UTILIZATION

## ❓ CÁC THÀNH PHẦN BẠN KHOANH LÀ GÌ?

### **1. Supply APR (0%)**
- **Định nghĩa**: Lãi suất hàng năm (Annual Percentage Rate) cho người CHO VAY
- **Ý nghĩa**: Nếu bạn lend 100 USDC với Supply APR 5%, sau 1 năm bạn có 105 USDC
- **Tại sao 0%?**: Vì chưa có ai borrow → không có lãi để trả cho lenders

### **2. Borrow APR (0%)**
- **Định nghĩa**: Lãi suất hàng năm người VAY phải trả
- **Ý nghĩa**: Nếu bạn borrow 100 USDC với Borrow APR 10%, sau 1 năm bạn phải trả 110 USDC
- **Tại sao 0%?**: Vì pool mới, utilization = 0%, chỉ có base rate (rất nhỏ)

### **3. Utilization (0%)**
- **Định nghĩa**: Tỷ lệ % token đang được vay / tổng token đã lend
- **Công thức**: `Utilization = (Total Borrowed / Total Supplied) × 100`
- **Tại sao 0%?**: 
  - Total Supplied = 1000 USDC (bạn lend)
  - Total Borrowed = 0 USDC (chưa ai vay)
  - Utilization = (0 / 1000) × 100 = 0%

### **4. Available (1.0K)**
- **Định nghĩa**: Số lượng token có sẵn để borrow
- **Công thức**: `Available = Total Supplied - Total Borrowed`
- **Giá trị**: 1.0K = 1000 USDC

## 🔍 LẤY TỪ ĐÂU?

### **Data flow:**

```
1. Contract LendingPool
   ├─ reserves(USDC) → reserveCash, totalDebtPrincipal
   └─ getInterestRateModel() → InterestRateModel address

2. Contract InterestRateModel
   └─ getRates(cash, debt, ...) → borrowRateRayPerSec, supplyRateRayPerSec

3. Frontend calculations
   ├─ Convert Ray/second → APR %
   ├─ Calculate Utilization
   └─ Display in UI
```

### **Contract Functions:**

```solidity
// LendingPool.sol
function reserves(address asset) external view returns (
    uint128 reserveCash,        // Token available
    uint128 totalDebtPrincipal, // Token borrowed
    ...
);

// InterestRateModel.sol
function getRates(
    uint256 cash,
    uint256 debtNow,
    uint16 reserveFactorBps,
    uint16 optimalUBps,
    uint64 baseRateRayPerSec,
    uint64 slope1RayPerSec,
    uint64 slope2RayPerSec
) external pure returns (
    uint64 borrowRateRayPerSec,
    uint64 supplyRateRayPerSec
);
```

## 🧮 CÁCH TÍNH TOÁN

### **Supply APR:**

```
Step 1: Get supply rate per second (Ray = 1e27)
  supplyRateRayPerSec = từ contract

Step 2: Convert to per year
  ratePerYear = supplyRateRayPerSec × 31,536,000 (seconds/year)

Step 3: Convert Ray → Percentage
  Supply APR = (ratePerYear / 1e27) × 100
```

### **Borrow APR:**

```
Step 1: Get borrow rate per second
  borrowRateRayPerSec = từ contract

Step 2: Convert to APR (same formula)
  Borrow APR = (borrowRateRayPerSec × 31536000 / 1e27) × 100
```

### **Utilization:**

```
Total Supplied = reserveCash + totalDebtPrincipal
Total Borrowed = totalDebtPrincipal

Utilization = (Total Borrowed / Total Supplied) × 100
```

## 📈 VÍ DỤ THỰC TẾ

### **Scenario 1: Pool mới (như screenshot của bạn)**

```
Trạng thái:
- Total Supplied: 1000 USDC (bạn vừa lend)
- Total Borrowed: 0 USDC
- Utilization: 0%

APR:
- Supply APR: ~0% (không có lãi vì không ai borrow)
- Borrow APR: ~0.1% (chỉ có base rate)
```

### **Scenario 2: Có người borrow**

```
Trạng thái:
- Total Supplied: 1000 USDC
- Total Borrowed: 800 USDC (ai đó vay)
- Utilization: 80%

APR (với optimal U = 80%):
- Borrow APR: ~5% (cao hơn vì utilization cao)
- Supply APR: ~3.6% (lenders nhận lãi từ borrowers)

Công thức:
Supply APR = Borrow APR × Utilization × (1 - Reserve Factor)
          = 5% × 80% × 90%
          = 3.6%
```

### **Scenario 3: Over-utilized**

```
Trạng thái:
- Total Supplied: 1000 USDC
- Total Borrowed: 950 USDC
- Utilization: 95%

APR (utilization > optimal):
- Borrow APR: ~20% (penalty rate cao để khuyến khích repay)
- Supply APR: ~17.1% (lenders được thưởng nhiều)
```

## 🔄 KHI NÀO APR THAY ĐỔI?

### **Actions ảnh hưởng:**

| Action | Total Supplied | Total Borrowed | Utilization | APR |
|--------|---------------|----------------|-------------|-----|
| **Lend** | ↑ | = | ↓ | ↓ |
| **Borrow** | = | ↑ | ↑ | ↑ |
| **Withdraw** | ↓ | = | ↑ | ↑ |
| **Repay** | = | ↓ | ↓ | ↓ |

### **Interest Rate Curve:**

```
Borrow APR
    ↑
 20%|              ┌──────
    |            ╱
 10%|          ╱
    |        ╱
  5%|      ╱
    |    ╱
  1%|  ╱
    |╱────────────────────→ Utilization
     0%  20%  40%  60%  80%  100%
          ↑
       Optimal U (80%)
```

## 💻 CÁCH IMPLEMENT

### **Đã tạo cho bạn:**

1. ✅ `src/lib/aprCalculations.ts` - Helper functions
2. ✅ `src/hooks/useReserveAPR.ts` - React hook
3. ✅ `APR_INTEGRATION_GUIDE.md` - Hướng dẫn chi tiết
4. ✅ `APR_QUICK_EXAMPLE.tsx` - Example code

### **Sử dụng:**

```tsx
import { useReserveAPR } from '@/hooks/useReserveAPR';
import { formatAPR, formatUtilization } from '@/lib/aprCalculations';

function YourComponent() {
  const { supplyAPR, borrowAPR, utilization, isLoading } = 
    useReserveAPR(provider, poolAddress, tokenAddress);

  return (
    <div>
      <div>Supply APR: {formatAPR(supplyAPR)}</div>
      <div>Borrow APR: {formatAPR(borrowAPR)}</div>
      <div>Utilization: {formatUtilization(utilization)}</div>
    </div>
  );
}
```

## 🎯 TẠI SAO QUAN TRỌNG?

### **Cho Lenders (người cho vay):**
- 📊 **Supply APR cao** = thu nhập tốt
- 📈 **Utilization cao** = APR cao nhưng rủi ro thanh khoản
- 💰 **Theo dõi APR** để optimize lợi nhuận

### **Cho Borrowers (người vay):**
- 💸 **Borrow APR thấp** = chi phí vay rẻ
- ⚠️ **Utilization > 80%** = APR tăng nhanh (penalty)
- 📉 **Repay sớm** để tránh lãi suất cao

### **Cho Protocol:**
- ⚖️ **Balance utilization** = khuyến khích lend khi U thấp, repay khi U cao
- 🛡️ **Protect liquidity** = penalty rate khi U quá cao
- 💹 **Sustainable yields** = APR hợp lý cho cả 2 bên

## 📚 SO SÁNH VỚI CÁC PROTOCOL LỚN

### **Aave V3:**
- Utilization optimal: **80-90%**
- Base rate: **0%**
- Max rate: **~300%** (when U = 100%)

### **Compound V3:**
- Utilization optimal: **~90%**
- Base rate: **0%**
- Kink rate: Tăng đột ngột khi > optimal

### **LendHub V2 (của bạn):**
- Utilization optimal: **80%** (configurable)
- Base rate: **~0.1%**
- 2-slope model: Tương tự Aave

## 🔧 NEXT STEPS

1. ✅ **Copy files** đã tạo vào project
2. ✅ **Import** vào component cần dùng
3. ✅ **Test** với pool có liquidity
4. ✅ **Lend** → Supply APR vẫn 0% (chưa ai borrow)
5. ✅ **Borrow** → APR tăng lên ngay lập tức
6. ✅ **Monitor** APR updates real-time

---

**Bây giờ bạn hiểu rõ APR & Utilization, và có code sẵn để integrate!** 🎉

