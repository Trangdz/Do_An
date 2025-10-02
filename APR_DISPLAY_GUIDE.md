# 📊 HƯỚNG DẪN HIỂN THỊ APR, BORROW APR VÀ UTILIZATION

## ✅ ĐÃ HOÀN THÀNH

### 🎯 Vấn đề ban đầu:
Các chỉ số **Supply APR**, **Borrow APR**, và **Utilization** đang hiển thị **0%** trong UI.

### 🔧 Giải pháp:
Tích hợp hook `useReserveAPR` để tự động fetch và cập nhật APR data từ smart contract.

---

## 📁 CÁC FILE ĐÃ THAY ĐỔI

### 1. **`lendhub-frontend-nextjs/src/components/TokenCard.tsx`** (MỚI)
- Component riêng để hiển thị thông tin token
- Sử dụng `useReserveAPR` hook để fetch APR data
- Tự động cập nhật mỗi 30 giây
- Hiển thị loading spinner khi đang fetch data

### 2. **`lendhub-frontend-nextjs/src/components/SimpleDashboard.tsx`** (CẬP NHẬT)
- Import `TokenCard` component
- Thay thế inline token rendering bằng `TokenCard`
- Truyền `provider` và `poolAddress` vào `TokenCard`

---

## 🚀 CÁCH HOẠT ĐỘNG

### **1. Khi component mount:**
```typescript
// TokenCard.tsx
const aprData = useReserveAPR(
  token.symbol === 'ETH' ? null : provider,  // ETH không có reserve
  poolAddress,
  token.address,
  30000  // Refresh mỗi 30 giây
);
```

### **2. Hook `useReserveAPR` tự động:**
- Fetch `reserves(asset)` từ `LendingPool` contract
- Get `InterestRateModel` address từ pool
- Call `getRates()` từ `InterestRateModel`
- Convert từ `RayPerSec` → `APR %`
- Calculate `Utilization = (totalBorrowed / totalSupplied) × 100`

### **3. UI hiển thị:**
```typescript
<div className="text-lg font-bold text-blue-600">
  {aprData.isLoading ? (
    <LoadingSpinner />
  ) : (
    formatPercentage(supplyAPR)  // Ví dụ: "5.25%"
  )}
</div>
```

---

## 📊 DỮ LIỆU HIỂN THỊ

### **Supply APR** (Blue Box)
- Lãi suất hàng năm cho người cho vay
- Tính từ `supplyRateRayPerSec` từ contract
- Ví dụ: `5.25%` = người lend 100 USDC sẽ nhận 105.25 USDC sau 1 năm

### **Borrow APR** (Green Box)
- Lãi suất hàng năm người vay phải trả
- Tính từ `borrowRateRayPerSec` từ contract
- Ví dụ: `10.50%` = người borrow 100 USDC phải trả 110.50 USDC sau 1 năm

### **Utilization** (Purple Box)
- Tỷ lệ % token đang được vay / tổng token
- Công thức: `(Total Borrowed / Total Supplied) × 100`
- Ví dụ: `75.5%` = 755 USDC đang được vay / 1000 USDC tổng supply

### **Available** (Gray Box)
- Số lượng token có sẵn để borrow
- Lấy từ `reserveCash` trong contract
- Ví dụ: `1.0K` = 1000 USDC

---

## 🔄 AUTO-REFRESH

APR data tự động refresh mỗi **30 giây** để luôn cập nhật:

```typescript
useEffect(() => {
  // Initial fetch
  fetchData();
  
  // Set up interval
  const intervalId = setInterval(fetchData, 30000);
  
  // Cleanup
  return () => clearInterval(intervalId);
}, [provider, poolAddress, assetAddress]);
```

---

## 💡 LƯU Ý

### **1. ETH Token:**
- ETH không có reserve trong pool (vì phải wrap thành WETH trước)
- APR cho ETH luôn là `0%`
- `useReserveAPR` không được call cho ETH token

### **2. Loading State:**
- Khi đang fetch, hiển thị loading spinner
- Sau khi fetch xong, hiển thị số liệu thực tế
- Nếu lỗi, hiển thị `0%` (fallback)

### **3. Error Handling:**
```typescript
try {
  const aprData = await getReserveAPRData(...);
  setData(aprData);
} catch (error) {
  console.error('Error fetching reserve APR:', error);
  setData({
    supplyAPR: 0,
    borrowAPR: 0,
    utilization: 0,
    // ... fallback values
  });
}
```

---

## 🎯 KẾT QUẢ

Sau khi tích hợp, các chỉ số sẽ **TỰ ĐỘNG HIỂN THỊ** thay vì `0%`:

| Chỉ số | Trước | Sau |
|--------|-------|-----|
| **Supply APR** | `0%` | `5.25%` ✅ |
| **Borrow APR** | `0%` | `10.50%` ✅ |
| **Utilization** | `0%` | `75.5%` ✅ |
| **Available** | `0` | `1.0K` ✅ |

---

## 🧪 TEST

### **Cách test:**

1. **Start Ganache:**
   ```bash
   ganache-cli -p 7545 -i 1337 -m "test test test test test test test test test test test junk"
   ```

2. **Deploy contracts:**
   ```bash
   npx hardhat run scripts/deploy_ganache.cjs --network ganache
   ```

3. **Start frontend:**
   ```bash
   cd lendhub-frontend-nextjs
   npm run dev
   ```

4. **Kết nối MetaMask** và **Supply một số token** (USDC hoặc DAI)

5. **Chờ 5 giây** → APR sẽ tự động hiển thị

6. **Borrow một số token** → Utilization và APR sẽ thay đổi

7. **Chờ 30 giây** → Data sẽ tự động refresh

---

## 📚 RELATED FILES

- **Hook**: `lendhub-frontend-nextjs/src/hooks/useReserveAPR.ts`
- **Calculations**: `lendhub-frontend-nextjs/src/lib/aprCalculations.ts`
- **Component**: `lendhub-frontend-nextjs/src/components/TokenCard.tsx`
- **Dashboard**: `lendhub-frontend-nextjs/src/components/SimpleDashboard.tsx`
- **Documentation**: `APR_EXPLANATION.md`, `APR_INTEGRATION_GUIDE.md`

---

## ✨ HOÀN THÀNH!

Bây giờ tất cả các chỉ số APR, Borrow APR, và Utilization sẽ **TỰ ĐỘNG HIỂN THỊ** và **TỰ ĐỘNG CẬP NHẬT** mỗi 30 giây! 🎉

