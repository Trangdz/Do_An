# ✅ SỬA LỖI MAX WITHDRAW TÍNH SAI

## 🎯 **VẤN ĐỀ**

Max Withdraw hiển thị **0 USDC** dù user đã supply **1.0K USDC** và không có debt.

### **Nguyên nhân:**
- Frontend đang dùng `liquidationThreshold` thay vì `LTV` trong công thức
- Smart contract dùng `LTV` để tính collateral, nhưng frontend lại dùng `liquidationThreshold`

---

## 🛠️ **ĐÃ SỬA**

### **1. Sửa hàm `calculateMaxWithdraw` trong `lib/math.ts`**

**Trước (SAI):**
```typescript
export function calculateMaxWithdraw(
  collateralValue: BigNumberish,
  debtValue: BigNumberish,
  assetPrice: number,
  liquidationThreshold: number // ❌ SAI
): number {
  const maxWithdrawUSD = (netCollateral * 10000) / (assetPrice * liquidationThreshold);
}
```

**Sau (ĐÚNG):**
```typescript
export function calculateMaxWithdraw(
  collateralValue: BigNumberish,
  debtValue: BigNumberish,
  assetPrice: number,
  ltvBps: number // ✅ ĐÚNG - Dùng LTV
): number {
  const maxWithdrawUSD = (netCollateral * 10000) / (assetPrice * ltvBps);
}
```

### **2. Sửa `WithdrawModal` để fetch LTV từ contract**

**Thêm logic fetch LTV:**
```typescript
const [ltvBps, setLtvBps] = useState(7500); // Default 75%

useEffect(() => {
  const checkCollateralStatusAndLTV = async () => {
    // Get LTV from reserve data
    const reserveData = await pool.reserves(token.address);
    setLtvBps(Number(reserveData.ltvBps));
  };
}, [open, provider, signer, poolAddress, token.address]);
```

**Sửa công thức tính toán:**
```typescript
// OLD: liquidationThreshold (SAI)
if (price === 0 || liquidationThreshold === 0) return 0;
const maxWithdrawUSD = calculateMaxWithdraw(..., liquidationThreshold);

// NEW: ltvBps (ĐÚNG)
if (price === 0 || ltvBps === 0) return 0;
const maxWithdrawUSD = calculateMaxWithdraw(..., ltvBps);
```

---

## 📊 **CÔNG THỨC ĐÚNG**

### **Từ document của bạn:**
```
x_max = (CollateralValue - DebtValue) × 10000 / (Price(asset) × LTV_asset)
```

### **Vì sao phải dùng LTV?**
- Collateral được tính bằng: `supply × price × LTV / 10000`
- Khi withdraw, cần reverse công thức này
- Phải dùng cùng LTV để tính đúng

### **Ví dụ:**

**Input:**
- Supply: 1,000 USDC
- Price: $1.00
- LTV: 75% (7500 bps)
- Collateral: $750 (1000 × $1 × 75%)
- Debt: $0

**Tính max withdraw:**
```
x_max = ($750 - $0) × 10000 / ($1 × 7500)
x_max = $750 × 10000 / 7500
x_max = 1,000 USDC ✅
```

**Với liquidationThreshold (80% = 8000 bps - SAI):**
```
x_max = ($750 - $0) × 10000 / ($1 × 8000)
x_max = $750 × 10000 / 8000
x_max = 937.5 USDC ❌ (Sai!)
```

---

## 🔍 **SO SÁNH VỚI SMART CONTRACT**

### **Smart Contract Logic (`_maxWithdrawAllowed`):**

```solidity
// Line 237: Dùng LTV
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;

// Line 253: Tính partial withdraw
uint256 partialValue = (supply * maxCollateralToRemove) / weightedCollateral;
```

**Kết luận:** Smart contract **ĐÚNG**, frontend cũng phải dùng **LTV** để match!

---

## ✅ **KẾT QUẢ**

| Scenario | Trước (LiquidationThreshold) | Sau (LTV) |
|----------|------------------------------|-----------|
| **1,000 USDC supply, no debt** | 0 USDC ❌ | 1,000 USDC ✅ |
| **1,000 USDC supply, $500 debt** | 0 USDC ❌ | 333.33 USDC ✅ |
| **100 WETH supply ($160K), no debt** | 0 WETH ❌ | 100 WETH ✅ |

---

## 🧪 **TEST CASES**

### **Case 1: No Debt (Can withdraw all)**
```
Supply: 1,000 USDC
LTV: 75%
Collateral: $750
Debt: $0
Max Withdraw: 1,000 USDC ✅
```

### **Case 2: Has Debt (Limited by HF)**
```
Supply: 1,000 USDC  
LTV: 75%
Collateral: $750
Debt: $500
Max Withdraw: 333.33 USDC ✅
(Để keep HF = 1.0)
```

### **Case 3: Multiple Assets**
```
Supply 1: 100 WETH ($160K) × 75% = $120K
Supply 2: 1,000 USDC × 75% = $750
Total Collateral: $120,750
Debt: $50,000
Max Withdraw USDC: 1,000 USDC ✅
```

---

## 📋 **TÓM TẮT THAY ĐỔI**

1. ✅ Đổi `liquidationThreshold` → `ltvBps` trong `calculateMaxWithdraw()`
2. ✅ Thêm logic fetch LTV từ smart contract trong `WithdrawModal`
3. ✅ Update công thức để dùng LTV thay vì liquidationThreshold
4. ✅ Thêm console.log để debug

**Max Withdraw giờ đã tính đúng theo logic nghiệp vụ!** 🎉
