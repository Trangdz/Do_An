# ✅ CÁC LOẠI TIỀN CÓ THỂ THẾ CHẤP

## 💰 TRONG DỰ ÁN BẠN (4 assets):

| Asset | LTV | Liquidate Threshold | Có thể vay? | Có thể thế chấp? |
|-------|-----|---------------------|-------------|------------------|
| **WETH** | 75% | 80% | ❌ No | ✅ YES |
| **DAI** | 75% | 80% | ✅ Yes | ✅ YES |
| **USDC** | 75% | 80% | ✅ Yes | ✅ YES |
| **LINK** | 75% | 80% | ✅ Yes | ✅ YES |

---

## 🎯 CÁCH THỨC HOẠT ĐỘNG:

### Auto-enable (Line 243-246):

```solidity
// Khi user supply vào pool
if (r.ltvBps > 0 && !u.useAsCollateral) {
    u.useAsCollateral = true;  // ✅ TỰ ĐỘNG ENABLE!
}
```

**→ TẤT CẢ 4 ASSETS ĐỀU CÓ LTV = 75% → ĐỀU CÓ THỂ THẾ CHẤP!**

---

## 📋 SO SÁNH VỚI AAVE:

### Aave V3 Mainnet:

| Asset | LTV | Note |
|-------|-----|------|
| WETH | 80% | Stable |
| USDC | 80% | Stable |
| DAI | 75% | Stable |
| LINK | 65% | Stable |
| USDT | 75% | Stable |

### Dự án bạn:

| Asset | LTV | Note |
|-------|-----|------|
| WETH | 75% | ✅ Collateral only |
| DAI | 75% | ✅ Collateral |
| USDC | 75% | ✅ Collateral |
| LINK | 75% | ✅ Collateral |

**→ Tất cả đều LTV = 75%, có thể thế chấp!**

---

**Xem chi tiết trong `COLLATERAL_ASSETS.md`** ✅




