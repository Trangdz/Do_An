# 🔍 DEBUG: APR KHÔNG THAY ĐỔI SAU KHI WITHDRAW

## ✅ CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 1. Sửa hàm `withdraw()` trong `tx.ts`
- ✅ Đợi 1.5-2.5 giây sau transaction confirm
- ✅ Kiểm tra block mới
- ✅ Gọi `triggerAPRRefresh()` nhiều lần với delay

### 2. Cải thiện `triggerAPRRefresh()` trong `useSharedAPR.ts`
- ✅ Tạo object mới để force React re-render
- ✅ Delay nhỏ trước khi notify listeners
- ✅ Logging chi tiết để debug

### 3. Thêm logic refresh trong component
- ✅ Force refresh APR sau khi withdraw
- ✅ Gọi lại sau 3 giây để đảm bảo

---

## 🧪 CÁCH KIỂM TRA VÀ DEBUG

### Bước 1: Kiểm tra Console Log

Sau khi withdraw, mở **Console** (F12) và tìm các log:

```
🔄 APR refresh triggered: {
  supplyAPR: "0.0270% → 0.0550%",
  utilization: "20.00% → 33.33%",
  available: "2000.00 → 1000.00",
  changed: { apr: true, util: true, cash: true }
}
✅ APR/Utilization changed after transaction!
```

**Nếu thấy log này:**
- ✅ Contract đã cập nhật rates đúng
- ✅ Frontend đã fetch rates mới
- ⚠️ Có thể UI chưa re-render → Thử refresh trang (F5)

**Nếu KHÔNG thấy log này hoặc thấy:**
```
⚠️ APR/Utilization did NOT change - check contract state
```
- ❌ Contract có thể chưa cập nhật rates
- ❌ Hoặc utilization không thay đổi đủ

---

### Bước 2: Kiểm tra Trực Từ Contract

Mở **Console** (F12) và chạy:

```javascript
// Lấy provider và pool
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const poolAddress = '0x...'; // Lấy từ addresses.js
const assetAddress = '0x...'; // DAI address từ addresses.js

const poolABI = [
  'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, ...))'
];
const pool = new ethers.Contract(poolAddress, poolABI, provider);

// Lấy reserve data
const reserve = await pool.reserves(assetAddress);

// Tính utilization
const reserveCash = Number(ethers.formatUnits(reserve.reserveCash, 18));
const totalDebt = Number(ethers.formatUnits(reserve.totalDebtPrincipal, 18));
const utilization = (totalDebt / (reserveCash + totalDebt)) * 100;

// Tính APR
const RAY = 1e27;
const SECONDS_PER_YEAR = 31536000;
const supplyAPR = (Number(reserve.liquidityRateRayPerSec) / RAY) * SECONDS_PER_YEAR * 100;

console.log('📊 Contract State:');
console.log('  Reserve Cash:', reserveCash.toFixed(2), 'DAI');
console.log('  Total Debt:', totalDebt.toFixed(2), 'DAI');
console.log('  Utilization:', utilization.toFixed(2) + '%');
console.log('  Supply APR:', supplyAPR.toFixed(4) + '%');
console.log('  Liquidity Rate (RAY/s):', reserve.liquidityRateRayPerSec.toString());
```

**So sánh trước và sau withdraw:**
- Reserve Cash phải **GIẢM**
- Utilization phải **TĂNG**
- Supply APR phải **TĂNG**

---

### Bước 3: Chạy Script Test

Chạy script test để kiểm tra trực tiếp:

```bash
npx hardhat run scripts/test_apr_after_withdraw.cjs --network ganache
```

Script sẽ:
1. Lấy APR trước khi withdraw
2. Thực hiện withdraw (nếu user có supply)
3. Lấy APR sau khi withdraw
4. So sánh và báo cáo

---

### Bước 4: Kiểm tra Manual Accrue

Nếu rates không cập nhật, thử gọi `accruePublic()` thủ công:

```javascript
// Trong Console
const pool = await ethers.getContractAt("LendingPool", poolAddress);
const tx = await pool.accruePublic(assetAddress);
await tx.wait();
console.log('✅ Manual accrue completed');
```

Sau đó kiểm tra lại APR.

---

## 🔧 CÁC VẤN ĐỀ CÓ THỂ GẶP

### Vấn đề 1: Utilization Không Thay Đổi Đủ

**Nguyên nhân:**
- Withdraw lượng quá nhỏ so với total supply
- Utilization chỉ tăng 0.1-0.5% → APR thay đổi không đáng kể

**Giải pháp:**
- Withdraw lượng lớn hơn (ví dụ: 50% supply)
- Hoặc kiểm tra trong Console để xem giá trị chính xác

### Vấn đề 2: Contract Chưa Cập Nhật Rates

**Nguyên nhân:**
- `_accrue()` được gọi nhưng rates không thay đổi
- Có thể do `block.timestamp` không thay đổi (cùng block)

**Giải pháp:**
- Đợi block mới
- Hoặc gọi `accruePublic()` thủ công

### Vấn đề 3: Frontend Cache

**Nguyên nhân:**
- `useSharedAPR` hook cache 30 giây
- UI không re-render dù store đã update

**Giải pháp:**
- Refresh trang (F5)
- Hoặc đợi đến lần polling tiếp theo (tối đa 30 giây)

### Vấn đề 4: React Không Re-render

**Nguyên nhân:**
- Object reference không thay đổi
- React không detect state change

**Giải pháp:**
- Đã sửa trong code: Tạo object mới với `updatedAt`
- Force re-render bằng cách refresh trang

---

## 📊 CHECKLIST DEBUG

Sau khi withdraw, kiểm tra:

- [ ] Console có log `🔄 APR refresh triggered`?
- [ ] Log có hiển thị `changed: { apr: true, util: true }`?
- [ ] Reserve Cash có giảm đúng số lượng withdraw?
- [ ] Utilization có tăng?
- [ ] Supply APR có tăng?
- [ ] UI có cập nhật sau 5-10 giây?
- [ ] Refresh trang (F5) có thay đổi không?

---

## 🎯 KẾT QUẢ MONG ĐỢI

### Trước khi withdraw:
- Reserve Cash: 12,210 USDC
- Utilization: 28.67%
- Supply APR: 0.04%

### Sau khi withdraw 1,000 USDC:
- Reserve Cash: 11,210 USDC ⬇️
- Utilization: ~31% ⬆️ (+2.33%)
- Supply APR: ~0.045% ⬆️ (+0.005%)

**Nếu không thấy thay đổi:**
1. Kiểm tra Console log
2. Kiểm tra contract state trực tiếp
3. Chạy script test
4. Thử manual accrue

---

## 💡 TIPS

1. **Withdraw lượng lớn** để thấy sự thay đổi rõ ràng
2. **Kiểm tra Console** để xem giá trị chính xác
3. **Đợi 5-10 giây** sau khi withdraw
4. **Refresh trang** nếu vẫn không thấy thay đổi
5. **Kiểm tra Markets page** - có thể cập nhật nhanh hơn

---

## ✅ KẾT LUẬN

Sau các thay đổi:
- ✅ Code đã được sửa để refresh APR đúng cách
- ✅ Có logging chi tiết để debug
- ✅ Có script test để kiểm tra

**Nếu vẫn không thấy thay đổi:**
1. Kiểm tra Console log
2. Kiểm tra contract state trực tiếp
3. Chạy script test
4. Báo lại kết quả để tiếp tục debug

