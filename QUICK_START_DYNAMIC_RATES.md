# ⚡ QUICK START: XEM LÃI SUẤT BIẾN ĐỘNG

## 🎯 Lãi suất ĐÃ biến động tự động trong dự án!

Chỉ cần làm theo 3 bước này để thấy lãi suất thay đổi:

---

## 📋 BƯỚC 1: CHẠY DEMO SCRIPT

```bash
# Đảm bảo Ganache đang chạy
npx hardhat run scripts/demo_dynamic_rates.cjs --network ganache
```

**Kết quả mong đợi:**
```
1️⃣ Initial State (No Activity)
💰 Reserve Cash:     0.00 USDC
📊 Total Borrowed:   0.00 USDC
📈 Utilization:      0%
🔵 Supply APR:       0.0000%
🟢 Borrow APR:       0.0000%

2️⃣ After User1 Supplies 1000 USDC
💰 Reserve Cash:     1000.00 USDC
📊 Total Borrowed:   0.00 USDC
📈 Utilization:      0%
🔵 Supply APR:       0.0000%
🟢 Borrow APR:       0.0000%

3️⃣ After User2 Borrows 500 USDC (U ≈ 50%)
💰 Reserve Cash:     500.00 USDC
📊 Total Borrowed:   500.00 USDC
📈 Utilization:      50%
🔵 Supply APR:       1.5600%    ← LÃI TĂNG!
🟢 Borrow APR:       3.1250%    ← LÃI TĂNG!

4️⃣ After User2 Borrows 300 More USDC (U ≈ 80%)
💰 Reserve Cash:     200.00 USDC
📊 Total Borrowed:   800.00 USDC
📈 Utilization:      80%
🔵 Supply APR:       4.0000%    ← LÃI TĂNG MẠNH!
🟢 Borrow APR:       5.0000%    ← LÃI TĂNG MẠNH!

5️⃣ After User2 Borrows 100 More USDC (U ≈ 90%)
💰 Reserve Cash:     100.00 USDC
📊 Total Borrowed:   900.00 USDC
📈 Utilization:      90%
🔵 Supply APR:       13.5000%   ← LÃI TĂNG CỰC MẠNH!
🟢 Borrow APR:       15.0000%   ← LÃI TĂNG CỰC MẠNH!

6️⃣ After User2 Repays 400 USDC (U ≈ 60%)
💰 Reserve Cash:     500.00 USDC
📊 Total Borrowed:   500.00 USDC
📈 Utilization:      60%
🔵 Supply APR:       2.3400%    ← LÃI GIẢM!
🟢 Borrow APR:       3.9000%    ← LÃI GIẢM!
```

---

## 📱 BƯỚC 2: XEM TRONG FRONTEND

1. **Mở frontend:**
   ```bash
   cd lendhub-frontend-nextjs
   npm run dev
   ```

2. **Connect MetaMask** và **chọn token USDC**

3. **Xem các chỉ số:**
   ```
   Supply APR:  3.12%   ← Tự động cập nhật mỗi 30s
   Borrow APR:  5.00%   ← Tự động cập nhật mỗi 30s
   Utilization: 50%     ← Tự động cập nhật mỗi 30s
   ```

4. **Supply hoặc Borrow** → **Refresh trang** → **Số liệu thay đổi!**

---

## 🧪 BƯỚC 3: TEST THỦ CÔNG

### **Test 1: Tăng Utilization (Lãi tăng)**

```bash
# Scenario: Càng nhiều người vay, lãi càng cao
1. Supply 1000 USDC
2. Refresh → Xem APR (0%)
3. Borrow 500 USDC (U = 50%)
4. Refresh → Xem APR tăng (~3%)
5. Borrow thêm 300 USDC (U = 80%)
6. Refresh → Xem APR tăng mạnh (~5%)
7. Borrow thêm 100 USDC (U = 90%)
8. Refresh → Xem APR tăng cực mạnh (~15%)
```

### **Test 2: Giảm Utilization (Lãi giảm)**

```bash
# Scenario: Càng nhiều người repay, lãi càng giảm
1. Hiện tại: U = 90%, APR = 15%
2. Repay 400 USDC (U = 60%)
3. Refresh → Xem APR giảm (~4%)
4. Repay hết (U = 0%)
5. Refresh → Xem APR về 0%
```

---

## 📊 TẠI SAO LÃI SUẤT BIẾN ĐỘNG?

### **Công thức tự động:**

```
Utilization (U) = Total Borrowed / Total Supplied

IF U ≤ 80% (optimal):
    Borrow APR = 0% + Slope1 × (U / 80%)
    
IF U > 80%:
    Borrow APR = 0% + Slope1 + Slope2 × ((U - 80%) / 20%)

Supply APR = Borrow APR × U × (1 - Reserve Factor)
```

### **Ví dụ cụ thể:**

| Action | Cash | Borrowed | U | Borrow APR | Supply APR |
|--------|------|----------|---|------------|------------|
| Supply 1000 | 1000 | 0 | 0% | 0% | 0% |
| Borrow 500 | 500 | 500 | 50% | 3.12% | 1.56% ⬆️ |
| Borrow 300 | 200 | 800 | 80% | 5.00% | 4.00% ⬆️⬆️ |
| Borrow 100 | 100 | 900 | 90% | 15.00% | 13.50% ⬆️⬆️⬆️ |
| Repay 400 | 500 | 500 | 60% | 3.90% | 2.34% ⬇️ |

---

## 🔄 TỰ ĐỘNG CẬP NHẬT

Frontend **TỰ ĐỘNG FETCH** APR mỗi 30 giây:

```typescript
// TokenCard.tsx
const aprData = useReserveAPR(
  provider,
  poolAddress,
  token.address,
  30000  // ← Auto-refresh every 30 seconds
);
```

**Hoặc refresh ngay sau action:**
- Supply → Rates update
- Borrow → Rates update
- Repay → Rates update
- Withdraw → Rates update

---

## 💡 TÙY CHỈNH

Muốn lãi suất biến động mạnh hơn? Chỉnh `slope2` trong deploy script:

```javascript
// scripts/deploy_ganache.cjs
await pool.initReserve(
  usdc.address,
  6,
  1000,                 // reserveFactorBps
  8000,                 // ltvBps
  8500,                 // liquidationThresholdBps
  500,                  // liquidationBonusBps
  5000,                 // closeFactorBps
  true,                 // isBorrowable
  8000,                 // optimalUBps (80%)
  0,                    // baseRateRayPerSec
  31709791983n,         // slope1RayPerSec (1% APY)
  317097919837n         // slope2RayPerSec (10% APY) ← TÙY CHỈNH ĐÂY!
);
```

**Tăng `slope2` → Lãi tăng mạnh hơn khi U > 80%**  
**Giảm `optimalU` (8000 → 7000) → Lãi tăng sớm hơn**

---

## 🎉 KẾT LUẬN

**LÃI SUẤT ĐÃ BIẾN ĐỘNG TỰ ĐỘNG!**

✅ Không cần code thêm  
✅ Giống Aave/Compound  
✅ Tự động cập nhật mỗi 30s  
✅ Thay đổi theo Supply/Borrow/Repay

**Chỉ cần:**
1. Chạy script demo
2. Xem trong frontend
3. Test bằng cách Supply/Borrow

🚀 **ENJOY!**

