# 📊 APR & UTILIZATION INTEGRATION GUIDE

## 🎯 MỤC TIÊU

Hiển thị các chỉ số quan trọng trong UI:
- **Supply APR**: Lãi suất cho người cho vay
- **Borrow APR**: Lãi suất người vay phải trả
- **Utilization**: Tỷ lệ % token đang được vay

## 📁 FILES ĐÃ TẠO

### 1. `src/lib/aprCalculations.ts`
- Helper functions để tính toán APR từ contract
- Convert Ray per second → APR %
- Calculate Utilization
- Format functions

### 2. `src/hooks/useReserveAPR.ts`
- React hook để fetch APR data
- Auto-refresh mỗi 30 giây
- Handle loading & error states

## 🔧 CÁCH TÍCH HỢP VÀO UI

### **Bước 1: Import hook và helpers**

```tsx
import { useReserveAPR } from '@/hooks/useReserveAPR';
import { formatAPR, formatUtilization } from '@/lib/aprCalculations';
```

### **Bước 2: Sử dụng trong component**

```tsx
export function TokenCard({ token, poolAddress, provider }: Props) {
  // Fetch APR data
  const {
    supplyAPR,
    borrowAPR,
    utilization,
    totalSupplied,
    totalBorrowed,
    isLoading,
    error
  } = useReserveAPR(provider, poolAddress, token.address);

  return (
    <div className="token-card">
      <h3>{token.symbol}</h3>
      
      {/* Supply APR */}
      <div className="apr-box">
        <span className="label">Supply APR</span>
        <span className="value">
          {isLoading ? '...' : formatAPR(supplyAPR)}
        </span>
      </div>
      
      {/* Borrow APR */}
      <div className="apr-box">
        <span className="label">Borrow APR</span>
        <span className="value">
          {isLoading ? '...' : formatAPR(borrowAPR)}
        </span>
      </div>
      
      {/* Utilization */}
      <div className="utilization-box">
        <span className="label">Utilization</span>
        <span className="value">
          {isLoading ? '...' : formatUtilization(utilization)}
        </span>
      </div>
      
      {/* Available */}
      <div className="available-box">
        <span className="label">Available</span>
        <span className="value">{totalSupplied}</span>
      </div>
    </div>
  );
}
```

### **Bước 3: Update component hiện tại**

Giả sử bạn có component hiển thị USDC như screenshot:

```tsx
// Ví dụ: components/SimpleDashboard.tsx hoặc assets/USDC.tsx

import { useReserveAPR } from '@/hooks/useReserveAPR';
import { formatAPR, formatUtilization } from '@/lib/aprCalculations';

export function USDCCard() {
  const provider = /* get from context */;
  const poolAddress = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '';
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || '';
  
  const {
    supplyAPR,
    borrowAPR,
    utilization,
    isLoading
  } = useReserveAPR(provider, poolAddress, usdcAddress);

  return (
    <div>
      {/* Supply APR - box bạn khoanh đỏ */}
      <div className="bg-blue-50 p-2 rounded">
        <div className="text-blue-600 text-2xl font-bold">
          {isLoading ? '...' : formatAPR(supplyAPR)}
        </div>
        <div className="text-sm text-gray-600">Supply APR</div>
      </div>
      
      {/* Borrow APR - box bạn khoanh đỏ */}
      <div className="bg-green-50 p-2 rounded">
        <div className="text-green-600 text-2xl font-bold">
          {isLoading ? '...' : formatAPR(borrowAPR)}
        </div>
        <div className="text-sm text-gray-600">Borrow APR</div>
      </div>
      
      {/* Utilization - box bạn khoanh đỏ */}
      <div className="bg-purple-50 p-2 rounded">
        <div className="text-purple-600 text-2xl font-bold">
          {isLoading ? '...' : formatUtilization(utilization)}
        </div>
        <div className="text-sm text-gray-600">Utilization</div>
      </div>
    </div>
  );
}
```

## 🧮 CÁCH TÍNH TOÁN

### **1. Ray per Second → APR**

```typescript
// Contract trả về: borrowRateRayPerSec = 31709791983 (1% APY)

// Bước 1: Convert per second → per year
ratePerYear = ratePerSec × 31,536,000 (seconds per year)

// Bước 2: Convert Ray (1e27) → Percentage
APR% = (ratePerYear / 1e27) × 100

// Example:
// 31709791983 × 31536000 / 1e27 × 100 = 0.001 = 0.1%
```

### **2. Utilization**

```typescript
// Từ contract:
reserveCash = 1000 USDC (available)
totalDebtPrincipal = 0 USDC (borrowed)

// Tính:
totalSupplied = reserveCash + totalDebtPrincipal = 1000
utilization = (totalDebtPrincipal / totalSupplied) × 100
           = (0 / 1000) × 100 = 0%
```

### **3. Supply APR từ Borrow APR**

```solidity
// Contract logic (InterestRateModel.sol):
supplyRate = borrowRate × utilization × (1 - reserveFactor)

// Example:
borrowRate = 5% APR
utilization = 80%
reserveFactor = 10%

supplyRate = 5% × 0.8 × 0.9 = 3.6% APR
```

## 📊 KHI NÀO GIÁ TRỊ THAY ĐỔI?

### **APR thay đổi khi:**
- ✅ Có người lend → totalSupplied tăng → utilization giảm → APR giảm
- ✅ Có người borrow → totalBorrowed tăng → utilization tăng → APR tăng
- ✅ Có người withdraw → totalSupplied giảm → utilization tăng → APR tăng
- ✅ Có người repay → totalBorrowed giảm → utilization giảm → APR giảm

### **Ví dụ thực tế:**

**Trạng thái ban đầu:**
- Supply: 1000 USDC
- Borrow: 0 USDC
- Utilization: 0%
- Supply APR: 0%
- Borrow APR: 0.1% (base rate)

**Sau khi user borrow 800 USDC:**
- Supply: 1000 USDC
- Borrow: 800 USDC
- Utilization: 80%
- Supply APR: 3.6%
- Borrow APR: 5%

## 🔄 AUTO-REFRESH

Hook tự động refresh mỗi 30 giây. Để thay đổi:

```tsx
// Refresh mỗi 10 giây
useReserveAPR(provider, poolAddress, assetAddress, 10000);

// Disable auto-refresh
useReserveAPR(provider, poolAddress, assetAddress, 0);
```

## 🎨 STYLING EXAMPLES

### **Aave-style:**
```tsx
<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
  <div>
    <div className="text-sm text-gray-500">Supply APR</div>
    <div className="text-2xl font-bold text-green-600">
      {formatAPR(supplyAPR)}
    </div>
  </div>
</div>
```

### **Compound-style:**
```tsx
<div className="text-center">
  <div className="text-4xl font-bold">
    {formatAPR(borrowAPR)}
  </div>
  <div className="text-xs text-gray-400 uppercase mt-1">
    Borrow APR
  </div>
</div>
```

## 🐛 DEBUGGING

### **APR vẫn là 0%?**

```typescript
// Check trong console:
console.log('Reserve data:', {
  supplyAPR,
  borrowAPR,
  utilization,
  totalSupplied,
  totalBorrowed
});

// Verify contract addresses:
console.log('Pool:', poolAddress);
console.log('Asset:', assetAddress);
```

### **Common issues:**

1. **Contract chưa có liquidity** → utilization = 0% → APR = 0%
   - Solution: Lend tokens trước

2. **Wrong contract address** → fetch fails
   - Solution: Check `.env.local` có đúng addresses không

3. **Provider null** → hook không chạy
   - Solution: Đảm bảo provider được pass đúng

## 📚 REFERENCES

- [Aave Interest Rate Model](https://docs.aave.com/developers/core-contracts/pool#getreservedata)
- [Compound Interest Rate](https://compound.finance/docs/ctokens#get-borrow-rate)
- [Ray Math Explained](https://docs.aave.com/developers/guides/rates-guide)

## ✅ CHECKLIST INTEGRATION

- [ ] Copy `src/lib/aprCalculations.ts`
- [ ] Copy `src/hooks/useReserveAPR.ts`
- [ ] Import vào component cần dùng
- [ ] Test với pool có liquidity
- [ ] Verify APR updates sau borrow/lend
- [ ] Style theo design system

---

**Sau khi integrate, APR & Utilization sẽ tự động hiện thị và update real-time!** 🎉

