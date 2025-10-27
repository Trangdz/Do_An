# ✅ FIX: APR Error - BAD_DATA

## 🔍 PHÂN TÍCH LỖI:

**Error:** `could not decode result data (value="0x"...)` khi gọi `reserves(address)`

**Nguyên nhân:**
1. Contract chưa được khởi tạo cho asset đó (lastUpdate == 0)
2. Mapping trả về dữ liệu rỗng (0x)
3. Ethers.js không decode được tuple rỗng

## ✅ ĐÃ FIX:

### 1. Update ABI với named parameters:
```typescript
'function reserves(address) external view returns (
  uint128 reserveCash, 
  uint128 totalDebtPrincipal, 
  uint128 liquidityIndex, 
  uint128 variableBorrowIndex, 
  uint64 liquidityRateRayPerSec, 
  uint64 variableBorrowRateRayPerSec, 
  uint16 reserveFactorBps, 
  uint16 ltvBps, 
  uint16 liqThresholdBps, 
  uint16 liqBonusBps, 
  uint16 closeFactorBps, 
  uint8 decimals, 
  bool isBorrowable, 
  uint16 optimalUBps, 
  uint64 baseRateRayPerSec, 
  uint64 slope1RayPerSec, 
  uint64 slope2RayPerSec, 
  uint40 lastUpdate
)'
```

### 2. Add try-catch và validation:
- Catch `BAD_DATA` error
- Check `lastUpdate === 0` (uninitialized)
- Return zero values thay vì throw error

### 3. Sử dụng named fields:
```typescript
reserveRaw.reserveCash thay vì reserveRaw[0]
```

---

## 🎯 KẾT QUẢ:

- ✅ Không crash khi reserve chưa init
- ✅ Trả về 0% APR gracefully
- ✅ Đúng ABI mapping với contract

---

**Đã fix trong:** `src/lib/aprCalculations.ts`

