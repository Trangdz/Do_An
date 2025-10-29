# 💰 CÁC LOẠI TIỀN CÓ THỂ THẾ CHẤP TRONG DỰ ÁN

## 📊 TRONG DỰ ÁN BẠN:

### File: `scripts/deploy_ganache_simple.cjs` (Lines 83-86)

```javascript
await pool.initReserve(await weth.getAddress(), 18, 1000, 7500, 8000, 500, 5000, false, 8000, base, s1, s2);
//                                         ↑    ↑   ↑   ↑   ↑   ↑   ↑   ↑
//                                         |    |   |   |   |   |   └─ LTV = 7500 (75%)
//                                         |    |   |   |   └─ Liq Threshold = 8000 (80%)
//                                         |    |   └─ Reserve Factor = 1000 (10%)
//                                         └─ Decimals

await pool.initReserve(await dai.getAddress(), 18, 1000, 7500, 8000, 500, 5000, true, ...);
await pool.initReserve(await usdc.getAddress(), 6, 1000, 7500, 8000, 500, 5000, true, ...);
await pool.initReserve(await link.getAddress(), 18, 1000, 7500, 8000, 500, 5000, true, ...);
```

---

## ✅ CÁC ASSETS CÓ THỂ THẾ CHẤP:

### Tiêu chí trong code (Line 243):
```solidity
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;
    // ✅ Asset có LTV > 0 → Auto-enable as collateral
}
```

**→ Chỉ cần LTV > 0 là có thể làm collateral!**

### Trong dự án hiện tại:

| Asset | LTV | Liq Threshold | Có thể thế chấp? |
|-------|-----|---------------|------------------|
| **WETH** | 75% (7500 bps) | 80% | ✅ CÓ |
| **DAI** | 75% (7500 bps) | 80% | ✅ CÓ |
| **USDC** | 75% (7500 bps) | 80% | ✅ CÓ |
| **LINK** | 75% (7500 bps) | 80% | ✅ CÓ |

---

## 🎯 ĐIỀU KIỆN CÓ THỂ THẾ CHẤP:

### 1. **LTV > 0**
```solidity
// Line 243
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;
}
```

**Logic:**
- LTV = 0% → KHÔNG thể thế chấp
- LTV > 0% → CÓ THỂ thế chấp

### 2. **User phải supply**
```solidity
// Line 183
if (supply > 0 && u.useAsCollateral) {
    // Chỉ tính collateral nếu user có supply VÀ enable collateral
}
```

**Logic:**
- Phải supply (gửi tiền) vào pool
- Auto-enable collateral nếu LTV > 0

### 3. **Có thể disable**
```solidity
// Line 467-508
function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) {
    // User có thể tắt/bật collateral cho từng asset
}
```

---

## 🔍 SO SÁNH VỚI THỰC TẾ (AAVE):

### Aave V3 Ethereum Mainnet:

| Asset | LTV | Liquidation Threshold | Note |
|-------|-----|----------------------|------|
| **WETH** | 80% | 82.5% | ✅ Collateral |
| **USDC** | 80% | 85% | ✅ Collateral |
| **DAI** | 75% | 80% | ✅ Collateral |
| **LINK** | 65% | 70% | ✅ Collateral |
| **USDT** | 75% | 80% | ✅ Collateral |
| **AAVE** | 55% | 62.5% | ✅ Collateral |

**→ Hầu hết các stablecoins và blue-chip tokens!**

---

## 💡 TRONG DỰ ÁN BẠN:

### Assets hiện tại (trong deploy_ganache_simple.cjs):

| Asset | LTV | Có thể vay? | Có thể thế chấp? |
|-------|-----|------------|------------------|
| WETH | 75% | ❌ No | ✅ YES |
| DAI | 75% | ✅ Yes | ✅ YES |
| USDC | 75% | ✅ Yes | ✅ YES |
| LINK | 75% | ✅ Yes | ✅ YES |

**Tất cả đều LTV = 75% → ĐỀU CÓ THỂ THẾ CHẤP!**

---

## 🎯 CÁCH KÍCH HOẠT COLLATERAL:

### Tự động (Line 243-246):
```solidity
// Khi user supply, nếu LTV > 0 → Auto-enable
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;
    emit CollateralEnabled(msg.sender, asset);
}
```

### Hoặc thủ công:
```javascript
// Disable
await pool.setUserUseReserveAsCollateral(wethAddress, false);

// Enable
await pool.setUserUseReserveAsCollateral(wethAddress, true);
```

---

## 📊 KẾT LUẬN:

### Trong dự án hiện tại:

**Assets có thể thế chấp:**
- ✅ WETH (LTV = 75%)
- ✅ DAI (LTV = 75%)
- ✅ USDC (LTV = 75%)
- ✅ LINK (LTV = 75%)

**Điều kiện:**
- LTV > 0
- User phải supply
- Auto-enable khi supply

**Logic:**
```
User supply → LTV > 0? → Yes → Auto-enable collateral → Có thể vay!
User supply → LTV = 0? → No → Không làm collateral
```

**→ TRONG DỰ ÁN BẠN: TẤT CẢ 4 ASSETS ĐỀU CÓ THỂ THẾ CHẤP (LTV = 75%)!**




