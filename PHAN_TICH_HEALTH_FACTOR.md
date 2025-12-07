# 🔍 Phân Tích Logic Health Factor và Cơ Chế Thanh Lý

## ⚠️ Vấn Đề

User báo: Giá LINK hiện tại là 7 USD/LINK, nhưng position vẫn nằm trong danh sách thanh lý.

**Dữ liệu từ UI:**
- Debt: 300 USDC
- Collateral: 55.009 LINK
- LINK Price: 7 USD/LINK
- Collateral Bonus: 5.00%
- Close Factor: 50.00%

## 📊 Tính Toán Health Factor

### Công Thức Hiện Tại (trong Contract)

```solidity
// LendingPool.sol - _getAccountData()
function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    // ...
    // Calculate collateral value (weighted by LTV)
    uint256 supplyValueUSD = (supply * price) / 1e18;
    uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
    collateralValue1e18 += weightedCollateral;
    
    // Calculate debt value
    uint256 debtValueUSD = (debt * price) / 1e18;
    debtValue1e18 += debtValueUSD;
    
    // Health Factor
    healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
}
```

### Tính Toán Với Dữ Liệu Thực Tế

**Input:**
- Debt: 300 USDC
- Collateral: 55.009 LINK
- LINK Price: 7 USD/LINK
- LTV: 75% (giả định)

**Tính toán:**
1. Collateral Value (raw) = 55.009 LINK × 7 USD/LINK = **385.063 USD**
2. Collateral Value (weighted by LTV) = 385.063 × 0.75 = **288.797 USD**
3. Debt Value = 300 USDC × 1 USD/USDC = **300 USD**
4. **Health Factor = 288.797 / 300 = 0.9626 < 1.0** ❌

**Kết luận:** Position **CÓ THỂ THANH LÝ** vì Health Factor < 1.0

## 🔍 Phân Tích Vấn Đề

### Vấn Đề 1: Health Factor Dùng LTV Thay Vì Liquidation Threshold

**Hiện tại:**
```solidity
// Dùng LTV để tính weighted collateral
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
```

**Vấn đề:**
- LTV (Loan-to-Value) thường thấp hơn Liquidation Threshold
- Ví dụ: LTV = 75%, Liquidation Threshold = 80%
- Health Factor nên dùng Liquidation Threshold, không phải LTV

**Công thức đúng:**
```solidity
// Nên dùng Liquidation Threshold
uint256 weightedCollateral = (supplyValueUSD * uint256(r.liqThresholdBps)) / 10000;
```

### Vấn Đề 2: So Sánh Với Các Protocol Khác

**Aave/Compound:**
- Health Factor = (Collateral × Liquidation Threshold) / Debt
- Position có thể thanh lý khi HF < 1.0

**LendHub hiện tại:**
- Health Factor = (Collateral × LTV) / Debt
- Điều này làm cho HF thấp hơn thực tế, dẫn đến thanh lý sớm hơn

### Vấn Đề 3: Logic Thanh Lý

**Contract check:**
```solidity
// LendingPool.sol - liquidationCall()
(, , uint256 hf) = _getAccountData(user);
require(hf < 1e18, "HF>=1"); // HF < 1.0 mới cho phép thanh lý
```

**Logic này đúng**, nhưng vấn đề là cách tính HF.

## 🔧 Giải Pháp

### Giải Pháp 1: Sửa Health Factor Dùng Liquidation Threshold

**Thay đổi trong `_getAccountData()`:**

```solidity
// Trước:
uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;

// Sau:
uint256 weightedCollateral = (supplyValueUSD * uint256(r.liqThresholdBps)) / 10000;
```

**Kết quả với dữ liệu:**
- Nếu Liquidation Threshold = 80%:
  - Collateral Value (weighted) = 385.063 × 0.80 = **308.05 USD**
  - Health Factor = 308.05 / 300 = **1.027 > 1.0** ✅
  - Position **KHÔNG THỂ THANH LÝ**

### Giải Pháp 2: Kiểm Tra Lại LTV và Liquidation Threshold

**Cần kiểm tra:**
1. LTV của LINK là bao nhiêu? (có thể không phải 75%)
2. Liquidation Threshold của LINK là bao nhiêu?
3. Giá LINK thực tế trên chain là bao nhiêu?

### Giải Pháp 3: Thêm Debug Log

**Thêm log để debug:**
```typescript
console.log('Collateral (raw):', collateralAmount, 'LINK');
console.log('LINK Price:', linkPrice, 'USD');
console.log('Collateral Value (raw):', collateralValueRaw, 'USD');
console.log('LTV:', ltv, '%');
console.log('Liquidation Threshold:', liqThreshold, '%');
console.log('Collateral Value (weighted by LTV):', collateralValueLTV, 'USD');
console.log('Collateral Value (weighted by LiqThreshold):', collateralValueLiq, 'USD');
console.log('Debt:', debt, 'USDC');
console.log('Health Factor (LTV):', hfLTV);
console.log('Health Factor (LiqThreshold):', hfLiq);
```

## 📝 Tóm Tắt

1. **Vấn đề:** Health Factor đang dùng LTV thay vì Liquidation Threshold
2. **Hệ quả:** HF thấp hơn thực tế → thanh lý sớm hơn
3. **Giải pháp:** Sửa `_getAccountData()` để dùng `liqThresholdBps` thay vì `ltvBps`
4. **Cần kiểm tra:** LTV và Liquidation Threshold thực tế của LINK

## 🎯 Next Steps

1. Kiểm tra LTV và Liquidation Threshold của LINK trong contract
2. Kiểm tra giá LINK thực tế trên chain
3. Quyết định: Sửa Health Factor dùng Liquidation Threshold hay giữ nguyên logic hiện tại
4. Nếu sửa: Cần update contract và redeploy

