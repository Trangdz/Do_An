# Giải Thích Mô Hình Lãi Suất (Interest Rate Model)

## Tổng Quan

Hệ thống sử dụng **mô hình lãi suất 2-slope (kinked interest rate model)** - tương tự như AAVE. Mô hình này điều chỉnh lãi suất dựa trên **tỷ lệ sử dụng vốn (Utilization Rate)** của pool.

---

## 1. Các Tham Số Đầu Vào

### 1.1. Trạng Thái Pool
- **`cash`**: Số tiền còn trống trong pool (đã normalize 1e18 - WAD)
  - Ví dụ: 1,000,000 USDC = 1,000,000 * 1e18
  
- **`debtNow`**: Tổng số tiền đang được cho vay (đã normalize 1e18 - WAD)
  - Ví dụ: 800,000 USDC = 800,000 * 1e18

### 1.2. Tham Số Cấu Hình
- **`reserveFactorBps`**: Tỷ lệ dự trữ (0-10000 bps)
  - 100 bps = 1%
  - Ví dụ: 1000 bps = 10% (10% lợi nhuận được giữ lại, 90% trả cho người gửi)
  
- **`optimalUBps`**: Tỷ lệ sử dụng vốn tối ưu (0-10000 bps)
  - Ví dụ: 8000 bps = 80%
  - Đây là điểm "kink" - khi vượt quá điểm này, lãi suất tăng mạnh

- **`baseRateRayPerSec`**: Lãi suất cơ bản (RAY/second)
  - RAY = 1e27
  - Ví dụ: 0.01% APR = 0.0001/year = 0.0001 / (365*24*3600) ≈ 3.17e-12 RAY/second
  
- **`slope1RayPerSec`**: Độ dốc 1 - tốc độ tăng lãi suất khi U < U*
  - Áp dụng khi utilization < optimalU
  
- **`slope2RayPerSec`**: Độ dốc 2 - tốc độ tăng lãi suất khi U > U*
  - Áp dụng khi utilization > optimalU
  - Thường lớn hơn slope1 để khuyến khích trả nợ khi pool cạn kiệt

---

## 2. Công Thức Tính Toán

### 2.1. Bước 1: Tính Utilization Rate (U)

```
U = debtNow / (cash + debtNow)
```

**Ví dụ:**
- cash = 1,000,000 USDC
- debtNow = 800,000 USDC
- U = 800,000 / (1,000,000 + 800,000) = 0.4444 = 44.44%

**Ý nghĩa:** Tỷ lệ vốn đang được sử dụng. U càng cao → pool càng cạn kiệt → lãi suất càng cao.

---

### 2.2. Bước 2: Tính Borrow Rate (Lãi Suất Cho Vay)

Công thức phụ thuộc vào việc U có vượt quá U* hay không:

#### Trường hợp 1: U ≤ U* (Pool còn dư thừa)

```
borrowRate = baseRate + slope1 × (U / U*)
```

**Ví dụ:**
- baseRate = 0.01% APR = 3.17e-12 RAY/second
- slope1 = 5% APR = 1.58e-9 RAY/second
- U = 0.6 (60%)
- U* = 0.8 (80%)
- ratio = 0.6 / 0.8 = 0.75
- borrowRate = 3.17e-12 + 1.58e-9 × 0.75 ≈ 1.19e-9 RAY/second ≈ 3.75% APR

#### Trường hợp 2: U > U* (Pool gần cạn kiệt)

```
borrowRate = baseRate + slope1 + slope2 × ((U - U*) / (1 - U*))
```

**Ví dụ:**
- baseRate = 0.01% APR
- slope1 = 5% APR
- slope2 = 50% APR = 1.58e-8 RAY/second
- U = 0.9 (90%)
- U* = 0.8 (80%)
- ratio = (0.9 - 0.8) / (1 - 0.8) = 0.1 / 0.2 = 0.5
- borrowRate = 3.17e-12 + 1.58e-9 + 1.58e-8 × 0.5 ≈ 9.58e-9 RAY/second ≈ 30.2% APR

**Ý nghĩa:** Khi pool gần cạn kiệt (U > U*), lãi suất tăng mạnh để:
- Khuyến khích người vay trả nợ
- Khuyến khích người gửi thêm tiền
- Giảm rủi ro thanh lý

---

### 2.3. Bước 3: Tính Supply Rate (Lãi Suất Gửi Tiền)

```
supplyRate = borrowRate × U × (1 - reserveFactor)
```

**Giải thích:**
- Người gửi chỉ nhận được phần lãi từ người vay
- Tỷ lệ nhận được = U (vì chỉ có U% tiền được cho vay)
- Sau đó trừ đi reserveFactor (phần dự trữ)

**Ví dụ:**
- borrowRate = 10% APR
- U = 0.8 (80%)
- reserveFactor = 10% (1000 bps)
- supplyRate = 10% × 0.8 × (1 - 0.1) = 10% × 0.8 × 0.9 = 7.2% APR

**Tại sao supplyRate < borrowRate?**
- Người gửi chỉ nhận lãi từ phần tiền được cho vay (U)
- Một phần lãi được giữ lại làm dự trữ (reserveFactor)
- Phần còn lại mới được phân phối cho người gửi

---

## 3. Đơn Vị Tính Toán

### WAD (1e18)
- Dùng cho: cash, debtNow, U, các tỷ lệ phần trăm
- Ví dụ: 1 USDC = 1e18 WAD

### RAY (1e27)
- Dùng cho: lãi suất (rate)
- Lý do: Cần độ chính xác cao khi tính lãi suất theo giây
- Ví dụ: 1% APR = 0.01/year = 0.01 / (365×24×3600) ≈ 3.17e-10 RAY/second

### BPS (Basis Points)
- 1 bps = 0.01%
- 10000 bps = 100%
- Dùng cho: reserveFactor, optimalUBps

---

## 4. Ví Dụ Thực Tế

### Scenario 1: Pool Dư Thừa Vốn

**Input:**
- cash = 2,000,000 USDC
- debtNow = 500,000 USDC
- reserveFactor = 10% (1000 bps)
- optimalU = 80% (8000 bps)
- baseRate = 0.01% APR
- slope1 = 5% APR
- slope2 = 50% APR

**Tính toán:**
1. U = 500,000 / (2,000,000 + 500,000) = 0.2 = 20%
2. U < U* (20% < 80%) → Dùng công thức 1
3. borrowRate = baseRate + slope1 × (U/U*) = 0.01% + 5% × (0.2/0.8) = 1.26% APR
4. supplyRate = borrowRate × U × (1-RF) = 1.26% × 0.2 × 0.9 = 0.23% APR

**Kết quả:** Lãi suất thấp vì pool còn nhiều tiền.

---

### Scenario 2: Pool Gần Cạn Kiệt

**Input:**
- cash = 200,000 USDC
- debtNow = 1,800,000 USDC
- (Các tham số khác giống Scenario 1)

**Tính toán:**
1. U = 1,800,000 / (200,000 + 1,800,000) = 0.9 = 90%
2. U > U* (90% > 80%) → Dùng công thức 2
3. borrowRate = baseRate + slope1 + slope2 × ((U-U*)/(1-U*))
   = 0.01% + 5% + 50% × ((0.9-0.8)/(1-0.8))
   = 0.01% + 5% + 50% × 0.5
   = 30.01% APR
4. supplyRate = 30.01% × 0.9 × 0.9 = 24.31% APR

**Kết quả:** Lãi suất cao để khuyến khích trả nợ và gửi thêm tiền.

---

## 5. Tại Sao Mô Hình Này Hiệu Quả?

### 5.1. Điều Chỉnh Tự Động
- Pool dư thừa → Lãi suất thấp → Khuyến khích vay
- Pool cạn kiệt → Lãi suất cao → Khuyến khích trả nợ và gửi tiền

### 5.2. Bảo Vệ Người Gửi
- Luôn có tiền dự trữ (reserveFactor)
- Lãi suất cao khi pool cạn → Người gửi được hưởng lợi

### 5.3. Giảm Rủi Ro Thanh Lý
- Lãi suất cao khi U > U* → Giảm khả năng pool hết tiền
- Tạo động lực để người vay trả nợ sớm

---

## 6. Code Implementation

```solidity
function getRates(...) external pure returns (uint64, uint64) {
    // 1. Tính U
    uint256 U = (debtNow * WAD) / (cash + debtNow);
    
    // 2. Tính borrowRate
    uint256 borrow;
    if (U <= Ustar) {
        // U ≤ U*: Tăng tuyến tính
        uint256 ratioWAD = (U * 1e18) / Ustar;
        borrow = base + (s1 * ratioWAD) / 1e18;
    } else {
        // U > U*: Tăng mạnh
        uint256 ratioWAD = ((U - Ustar) * 1e18) / (1e18 - Ustar);
        borrow = base + s1 + (s2 * ratioWAD) / 1e18;
    }
    
    // 3. Tính supplyRate
    uint256 oneMinusRF = (10000 - reserveFactorBps) * 1e18 / 10000;
    uint256 supply = (borrow * U) / 1e18;
    supply = (supply * oneMinusRF) / 1e18;
    
    return (uint64(borrow), uint64(supply));
}
```

---

## 7. Tóm Tắt

| Khái Niệm | Công Thức | Ý Nghĩa |
|-----------|-----------|---------|
| **Utilization (U)** | `debtNow / (cash + debtNow)` | Tỷ lệ vốn được sử dụng |
| **Borrow Rate (U ≤ U*)** | `base + slope1 × (U/U*)` | Tăng tuyến tính |
| **Borrow Rate (U > U*)** | `base + slope1 + slope2 × ((U-U*)/(1-U*))` | Tăng mạnh |
| **Supply Rate** | `borrowRate × U × (1-RF)` | Lãi từ người vay, trừ dự trữ |

**Mục tiêu:** Điều chỉnh lãi suất tự động để cân bằng cung-cầu vốn trong pool.



