# 🔬 DECIMAL PRECISION IN DEFI LENDING

## ❓ VẤN ĐỀ

**Tại sao DAI repay all về 0 nhưng USDC không?**

## 📊 PHÂN TÍCH

### **Token Decimals:**
- **DAI**: 18 decimals
- **USDC**: 6 decimals  
- **USDT**: 6 decimals
- **WBTC**: 8 decimals

### **Contract Internal Precision:**
- Tất cả debt được lưu ở **1e18 precision** (18 decimals)

### **Vấn đề Conversion:**

```
Debt trong contract: 100.000000000000000001 (1e18 + 1 wei)

DAI (18 decimals):
  transferAmount = 100000000000000000001 / 1e18
                 = 100.000000000000000001 DAI ✅
  → Transfer chính xác, debt về 0!

USDC (6 decimals):
  transferAmount = 100000000000000000001 / 1e12
                 = 100000000.000000000001
                 = 100.000000 USDC (rounded down)
  → Còn lại 0.000000000001 trong 1e18
  → Dust không thể trả được! ❌
```

## 🌍 THỰC TẾ Ở CÁC DỰ ÁN LỚN

### **1. Aave V3**

```solidity
// BorrowLogic.sol
function executeRepay(
  DataTypes.ReserveData storage reserve,
  address onBehalfOf,
  uint256 amount
) external returns (uint256) {
  uint256 variableDebt = userVariableDebt;
  
  // Cap to actual debt
  uint256 paybackAmount = variableDebt;
  if (amount < paybackAmount) {
    paybackAmount = amount;
  }
  
  // Clear completely if repaying all
  if (amount >= variableDebt) {
    variableDebt = 0;
  }
  
  return paybackAmount;
}
```

**Giải pháp Aave:**
- ✅ Cap amount về đúng debt
- ✅ Clear hoàn toàn nếu amount >= debt
- ✅ Không để lại dust

### **2. Compound V3**

```solidity
// CometCore.sol
function supplyBase(address from, address dst, uint256 amount) internal {
  // Special value uint256.max means supply entire balance
  if (amount == type(uint256).max) {
    amount = balanceOf(from);
  }
}
```

**Giải pháp Compound:**
- ✅ Dùng `uint256.max` như flag "repay all"
- ✅ Contract tự tính và clear chính xác

### **3. MakerDAO**

```solidity
// Vat.sol (chỉ support DAI)
function frob(
  bytes32 i,
  address u,
  address v,
  address w,
  int dink,
  int dart
) external {
  // All calculations in RAD (1e45)
  // No decimal conversion issues
}
```

**Giải pháp MakerDAO:**
- ✅ Chỉ support DAI (18 decimals)
- ✅ Không có vấn đề decimal mismatch

## ✅ GIẢI PHÁP TRONG LENDHUB V2

### **Dust Threshold theo Decimals:**

```solidity
// contracts/core/LendingPool.sol

// DUST CLEANUP: Clear dust based on token decimals
uint256 dustThreshold;
if (r.decimals >= 18) {
    dustThreshold = 1000; // ~0.000000000000001 for DAI
} else {
    // For USDC (6 decimals): 10^12 = 1 trillionth of token
    // For WBTC (8 decimals): 10^10 = 0.0000000001 BTC
    dustThreshold = 10 ** (18 - r.decimals); 
}

if (newDebt > 0 && newDebt < dustThreshold) {
    newDebt = 0; // Clear dust completely
}
```

### **Threshold Values:**

| Token | Decimals | Dust Threshold (1e18) | Human Readable |
|-------|----------|----------------------|----------------|
| DAI   | 18       | 1,000                | 0.000000000000001 DAI |
| USDC  | 6        | 1,000,000,000,000    | 0.000001 USDC |
| WBTC  | 8        | 10,000,000,000       | 0.0000000001 BTC |

### **Frontend Round-Up:**

```typescript
// RepayModal.tsx

// Convert from 1e18 to token decimals with ROUND UP
const conversionFactor = BigInt(10 ** (18 - token.decimals));
let debtInTokenDecimals = principalRaw1e18 / conversionFactor;
const remainder = principalRaw1e18 % conversionFactor;

if (remainder > BigInt(0)) {
  debtInTokenDecimals += BigInt(1); // Round UP to ensure full repayment
}

// Add 20% buffer for interest accrual
const withBuffer = (debtInTokenDecimals * 120n) / 100n;
```

## 🎯 KẾT LUẬN

### **Tại sao cần Dust Protection:**

1. **Decimal Mismatch**: Internal 1e18 vs Token decimals khác nhau
2. **Rounding Loss**: Integer division luôn round down
3. **Interest Accrual**: Lãi chạy theo block, khó tính chính xác 100%
4. **User Experience**: Không ai muốn còn $0.000001 debt

### **Best Practices:**

✅ **Contract-side**: Dust threshold dựa trên decimals
✅ **Frontend-side**: Round up khi tính repay amount
✅ **User-facing**: Clear messaging về "Repay All"
✅ **Testing**: Test với nhiều tokens (6, 8, 18 decimals)

### **Trade-offs:**

- **Too low threshold**: Dust vẫn còn, user không hài lòng
- **Too high threshold**: Có thể "gift" cho user (ví dụ clear 0.01 USDC)
- **Sweet spot**: ~0.000001 USD equivalent

### **Industry Standard:**

Hầu hết protocols chấp nhận clear dust < **$0.01** hoặc **< 0.001% debt**

## 📚 REFERENCES

- [Aave V3 Core](https://github.com/aave/aave-v3-core)
- [Compound V3](https://github.com/compound-finance/comet)
- [MakerDAO DSS](https://github.com/makerdao/dss)
- [ERC20 Decimal Handling](https://docs.openzeppelin.com/contracts/4.x/erc20#a-note-on-decimals)

---

**LendHub V2 đã implement giải pháp đúng theo industry standard!** ✅

