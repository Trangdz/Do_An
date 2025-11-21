# 📊 GIẢI THÍCH: TẠI SAO APR/APY GIẢM KHI SUPPLY TĂNG?

## ❓ VẤN ĐỀ

Khi bạn supply (gửi tài sản vào pool), bạn nhận thấy:
- **Supply APR** giảm
- **Supply APY** giảm

Đây có phải là bug không? **KHÔNG!** Đây là hành vi **ĐÚNG** của lending protocol.

---

## 🔍 NGUYÊN LÝ HOẠT ĐỘNG

### 1. Utilization Rate (Tỷ lệ sử dụng)

**Công thức:**
```
Utilization = Total Debt / (Reserve Cash + Total Debt) × 100%
```

**Ví dụ:**
- **Trước khi supply**: 
  - Reserve Cash: 1,000 DAI
  - Total Debt: 500 DAI
  - **Utilization = 500 / (1,000 + 500) = 33.3%**

- **Sau khi supply 1,000 DAI**:
  - Reserve Cash: 2,000 DAI (tăng)
  - Total Debt: 500 DAI (không đổi)
  - **Utilization = 500 / (2,000 + 500) = 20%** ⬇️ **GIẢM**

**Kết luận:** Khi supply tăng, utilization **GIẢM** (vì mẫu số tăng).

---

### 2. Interest Rate Model (Mô hình 2-slope)

Lãi suất được tính theo mô hình **2-slope** dựa trên utilization:

#### **Borrow Rate (Lãi suất vay):**

```
Nếu U ≤ U* (optimal, thường 80%):
  borrowRate = baseRate + slope1 × (U / U*)

Nếu U > U*:
  borrowRate = baseRate + slope1 + slope2 × ((U - U*) / (1 - U*))
```

**Ví dụ với tham số:**
- baseRate = 0.1% APR
- slope1 = 0.2% APR
- slope2 = 1% APR
- optimalU = 80%

**Trước khi supply (U = 33.3%):**
```
borrowRate = 0.1% + 0.2% × (33.3% / 80%)
          = 0.1% + 0.2% × 0.416
          = 0.1% + 0.083%
          = 0.183% APR
```

**Sau khi supply (U = 20%):**
```
borrowRate = 0.1% + 0.2% × (20% / 80%)
          = 0.1% + 0.2% × 0.25
          = 0.1% + 0.05%
          = 0.15% APR ⬇️ GIẢM
```

**Kết luận:** Khi utilization giảm, borrow rate **GIẢM**.

---

### 3. Supply Rate (Lãi suất gửi)

**Công thức:**
```
supplyRate = borrowRate × U × (1 - reserveFactor)
```

Trong đó:
- `borrowRate`: Lãi suất vay (tính ở trên)
- `U`: Utilization rate (0-1)
- `reserveFactor`: Tỷ lệ giữ lại (ví dụ: 10% = 0.1)

**Ví dụ với reserveFactor = 10%:**

**Trước khi supply:**
```
supplyRate = 0.183% × 0.333 × (1 - 0.1)
           = 0.183% × 0.333 × 0.9
           = 0.0548% APR
```

**Sau khi supply:**
```
supplyRate = 0.15% × 0.20 × (1 - 0.1)
           = 0.15% × 0.20 × 0.9
           = 0.027% APR ⬇️ GIẢM
```

**Kết luận:** Khi utilization giảm, supply rate **GIẢM** (vì cả borrowRate và U đều giảm).

---

## 📈 TẠI SAO ĐÂY LÀ HÀNH VI ĐÚNG?

### 1. **Cơ chế cân bằng thị trường**

- **Khi supply nhiều, utilization thấp:**
  - Có nhiều tiền sẵn sàng cho vay
  - Không cần trả lãi cao để thu hút người gửi
  - → **APR/APY thấp**

- **Khi supply ít, utilization cao:**
  - Ít tiền sẵn sàng cho vay
  - Cần trả lãi cao để thu hút người gửi
  - → **APR/APY cao**

### 2. **Tương tự thị trường tài chính truyền thống**

- **Ngân hàng có nhiều tiền gửi:**
  - Lãi suất tiết kiệm thấp
  - Lãi suất cho vay thấp

- **Ngân hàng thiếu tiền:**
  - Lãi suất tiết kiệm cao (để thu hút)
  - Lãi suất cho vay cao

### 3. **Bảo vệ protocol**

- **Utilization thấp:**
  - Nhiều thanh khoản dự phòng
  - Rủi ro thấp
  - → Lãi suất thấp là hợp lý

- **Utilization cao:**
  - Ít thanh khoản dự phòng
  - Rủi ro cao
  - → Lãi suất cao để bù đắp rủi ro

---

## 🔢 VÍ DỤ CỤ THỂ

### Tình huống 1: Supply đầu tiên

**Trước khi có ai supply:**
- Reserve Cash: 0 DAI
- Total Debt: 0 DAI
- Utilization: 0%
- **Supply APR: 0%** (không có gì để tính)

**Sau khi bạn supply 1,000 DAI:**
- Reserve Cash: 1,000 DAI
- Total Debt: 0 DAI
- Utilization: 0%
- **Supply APR: ~0.1%** (base rate, rất thấp vì không có ai vay)

### Tình huống 2: Có người vay

**Trước khi bạn supply thêm:**
- Reserve Cash: 1,000 DAI
- Total Debt: 500 DAI
- Utilization: 33.3%
- **Supply APR: ~0.055%**

**Sau khi bạn supply thêm 1,000 DAI:**
- Reserve Cash: 2,000 DAI
- Total Debt: 500 DAI (không đổi)
- Utilization: 20% ⬇️
- **Supply APR: ~0.027%** ⬇️ **GIẢM**

**Tại sao giảm?**
- Utilization giảm từ 33.3% → 20%
- Borrow rate giảm (vì U giảm)
- Supply rate = borrowRate × U × (1-RF) → **Cả 2 đều giảm** → Supply rate giảm

---

## 💡 KẾT LUẬN

### ✅ Đây là hành vi ĐÚNG, không phải bug!

**Khi supply tăng:**
1. ✅ Utilization giảm (vì mẫu số tăng)
2. ✅ Borrow rate giảm (theo mô hình 2-slope)
3. ✅ Supply rate giảm (vì = borrowRate × U × (1-RF))

**Điều này có nghĩa:**
- 📉 **APR/APY giảm** khi supply tăng (nếu debt không đổi)
- 📈 **APR/APY tăng** khi borrow tăng (nếu supply không đổi)
- ⚖️ **APR/APY cân bằng** theo cung-cầu thị trường

### 🎯 Lợi ích của cơ chế này:

1. **Tự động điều chỉnh:**
   - Khi có nhiều người gửi → Lãi suất giảm → Khuyến khích vay
   - Khi có nhiều người vay → Lãi suất tăng → Khuyến khích gửi

2. **Bảo vệ protocol:**
   - Utilization thấp → Rủi ro thấp → Lãi suất thấp
   - Utilization cao → Rủi ro cao → Lãi suất cao

3. **Công bằng:**
   - Người gửi đầu tiên nhận lãi cao hơn (vì utilization cao hơn)
   - Người gửi sau nhận lãi thấp hơn (vì utilization thấp hơn)

---

## 🔍 KIỂM TRA TRONG CODE

### File: `contracts/core/InterestRateModel.sol`

```solidity
// Supply rate calculation
supplyRate = borrowRate × U × (1 - reserveFactor)
```

### File: `lendhub-frontend-nextjs/src/hooks/useSharedAPR.ts`

```typescript
// Utilization calculation
const utilization = sum > 0 ? (totalDebt / sum) * 100 : 0;

// Supply APR from contract
const supplyAPR = liquidityRatePerSec * SECONDS_PER_YEAR * 100;
```

**`liquidityRatePerSec`** được tính từ contract dựa trên:
- Utilization hiện tại
- Interest Rate Model (2-slope)
- Reserve Factor

---

## 📊 BIỂU ĐỒ MINH HỌA

```
Supply tăng → Utilization giảm → Borrow Rate giảm → Supply Rate giảm
     ↑              ↑                    ↑                    ↑
  1,000 DAI     33.3% → 20%        0.183% → 0.15%      0.055% → 0.027%
```

---

## ✅ TÓM TẮT

**Câu hỏi:** Tại sao APR/APY giảm khi supply tăng?

**Trả lời:**
1. ✅ Supply tăng → Utilization giảm
2. ✅ Utilization giảm → Borrow rate giảm (theo mô hình 2-slope)
3. ✅ Supply rate = borrowRate × U × (1-RF) → **Cả 2 đều giảm** → Supply rate giảm
4. ✅ Đây là hành vi **ĐÚNG** của lending protocol, không phải bug!

**Đây là cơ chế tự động điều chỉnh lãi suất theo cung-cầu thị trường!** 🎯



