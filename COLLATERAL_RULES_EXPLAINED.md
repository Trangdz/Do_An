# 💎 QUY TẮC THẾ CHẤP TRONG LENDHUB V2

## 🎯 **CÂU HỎI: LOẠI TIỀN NÀO CÓ THỂ THẾ CHẤP?**

---

## ✅ **HIỆN TẠI TRONG DỰ ÁN CỦA BẠN**

### **Assets được deploy:**
```javascript
1. ETH (Native Ethereum)       - ❌ KHÔNG thế chấp được
2. WETH (Wrapped ETH)          - ✅ CÓ thế chấp được
3. DAI (Stablecoin)            - ✅ CÓ thế chấp được  
4. USDC (Stablecoin)           - ✅ CÓ thế chấp được
5. LINK (DeFi Token)           - ✅ CÓ thế chấp được
```

---

## 🔍 **PHÂN TÍCH CHI TIẾT**

### **1. ETH (Native) - ❌ KHÔNG THẾ CHẤP**

**Tại sao?**
```javascript
// ETH là native token (không phải ERC20)
// Smart contract KHÔNG thể hold ETH như ERC20
// Phải wrap thành WETH trước!

✅ Giải pháp: Wrap ETH → WETH
```

**Cách dùng:**
```javascript
// Step 1: User wrap ETH → WETH
await weth.deposit({ value: ethers.parseEther("10") });

// Step 2: Approve WETH
await weth.approve(lendingPool, ethers.parseEther("10"));

// Step 3: Supply WETH (now can use as collateral!)
await lendingPool.lend(WETH, ethers.parseEther("10"));
```

---

### **2. WETH - ✅ COLLATERAL (LTV 75%)**

**Configuration:**
```javascript
// From deploy_ganache.cjs:
await pool.initReserve(
  WETH,
  18,                    // decimals
  1000,                  // reserveFactorBps (10%)
  7500,                  // ltvBps = 75% ✅ COLLATERAL!
  8000,                  // liquidationThresholdBps (80%)
  10500,                 // liquidationBonusBps (105%)
  5000,                  // closeFactorBps (50%)
  false,                 // isBorrowable = false ❌ KHÔNG BORROW ĐƯỢC
  8000,                  // optimalUBps (80%)
  ...
);
```

**Ý nghĩa:**
```javascript
✅ ltvBps = 7500 (75%)
   → CÓ THỂ dùng làm collateral
   → Max borrow = 75% of collateral value

❌ isBorrowable = false
   → KHÔNG thể borrow WETH
   → Chỉ supply và dùng làm thế chấp
```

**Use case:**
```javascript
// Deposit 10 WETH @ $4,500 = $45,000
// Max borrow = $45,000 × 75% = $33,750 worth of other assets
// → Có thể borrow DAI, USDC, LINK (nhưng KHÔNG borrow WETH)
```

---

### **3. DAI - ✅ COLLATERAL (LTV 80%)**

**Configuration:**
```javascript
await pool.initReserve(
  DAI,
  18,                    // decimals
  1000,                  // reserveFactorBps (10%)
  8000,                  // ltvBps = 80% ✅ COLLATERAL!
  8500,                  // liquidationThresholdBps (85%)
  10500,                 // liquidationBonusBps (105%)
  5000,                  // closeFactorBps (50%)
  true,                  // isBorrowable = true ✅ BORROW ĐƯỢC!
  8000,                  // optimalUBps (80%)
  ...
);
```

**Ý nghĩa:**
```javascript
✅ ltvBps = 8000 (80%)
   → CÓ THỂ dùng làm collateral
   → Max borrow = 80% of DAI value

✅ isBorrowable = true
   → CÓ THỂ borrow DAI
   → Flexible: vừa collateral vừa borrowable
```

**Use case:**
```javascript
// Scenario 1: DAI as collateral
Deposit 10,000 DAI @ $1 = $10,000
Max borrow = $10,000 × 80% = $8,000 of WETH/USDC/LINK

// Scenario 2: Borrow DAI
Deposit 10 WETH @ $4,500 = $45,000 (collateral)
Borrow up to 30,000 DAI (depends on total collateral)
```

---

### **4. USDC - ✅ COLLATERAL (LTV 80%)**

**Configuration:**
```javascript
await pool.initReserve(
  USDC,
  6,                     // decimals (USDC is 6 decimals!)
  1000,                  // reserveFactorBps (10%)
  8000,                  // ltvBps = 80% ✅ COLLATERAL!
  8500,                  // liquidationThresholdBps (85%)
  10500,                 // liquidationBonusBps (105%)
  5000,                  // closeFactorBps (50%)
  true,                  // isBorrowable = true ✅ BORROW ĐƯỢC!
  8000,                  // optimalUBps (80%)
  ...
);
```

**Ý nghĩa:**
```javascript
✅ ltvBps = 8000 (80%)
   → CÓ THỂ dùng làm collateral
   → Max borrow = 80% of USDC value

✅ isBorrowable = true
   → CÓ THỂ borrow USDC
   → Giống DAI

⚠️ decimals = 6
   → Contract tự động normalize về 1e18 internally
```

**Use case:**
```javascript
// Deposit 10,000 USDC @ $1 = $10,000
// Max borrow = $10,000 × 80% = $8,000 of other assets
```

---

### **5. LINK - ✅ COLLATERAL (LTV 70%)**

**Configuration:**
```javascript
await pool.initReserve(
  LINK,
  18,                    // decimals
  1000,                  // reserveFactorBps (10%)
  7000,                  // ltvBps = 70% ✅ COLLATERAL!
  7500,                  // liquidationThresholdBps (75%)
  10500,                 // liquidationBonusBps (105%)
  5000,                  // closeFactorBps (50%)
  true,                  // isBorrowable = true ✅ BORROW ĐƯỢC!
  8000,                  // optimalUBps (80%)
  ...
);
```

**Ý nghĩa:**
```javascript
✅ ltvBps = 7000 (70%)
   → CÓ THỂ dùng làm collateral
   → Max borrow = 70% of LINK value
   → Lower LTV vì volatile hơn stablecoins

✅ isBorrowable = true
   → CÓ THỂ borrow LINK
```

**Use case:**
```javascript
// Deposit 1,000 LINK @ $22 = $22,000
// Max borrow = $22,000 × 70% = $15,400 of other assets
// Lower LTV vì LINK volatile hơn USDC/DAI
```

---

## 📊 **BẢNG TỔNG HỢP**

| Asset | Collateral? | Borrowable? | LTV | Why Different LTV? |
|-------|-------------|-------------|-----|-------------------|
| **ETH** | ❌ No | ❌ No | N/A | Native token, wrap to WETH |
| **WETH** | ✅ Yes | ❌ No | **75%** | Blue chip but not borrowable |
| **DAI** | ✅ Yes | ✅ Yes | **80%** | Stablecoin = less risk |
| **USDC** | ✅ Yes | ✅ Yes | **80%** | Stablecoin = less risk |
| **LINK** | ✅ Yes | ✅ Yes | **70%** | More volatile = higher risk |

---

## 🎯 **QUY TẮC XÁC ĐỊNH COLLATERAL**

### **Rule 1: LTV > 0 → Có thể làm collateral**
```javascript
if (reserve.ltvBps > 0) {
  // Asset này có thể dùng làm collateral
  // Collateral value = supply × price × ltvBps / 10000
}
```

### **Rule 2: isBorrowable → Có thể borrow**
```javascript
if (reserve.isBorrowable == true) {
  // Asset này có thể borrow
}
```

### **Rule 3: Multi-Asset Collateral**
```solidity
// Code trong _getAccountData():
for (uint256 i = 0; i < _allAssets.length; i++) {
    address asset = _allAssets[i];
    ReserveData storage r = reserves[asset];
    
    // Calculate collateral (weighted by LTV)
    uint256 supply = _currentSupply(user, asset);
    if (supply > 0 && r.ltvBps > 0) {
        uint256 supplyValueUSD = (supply * price) / 1e18;
        uint256 weightedCollateral = (supplyValueUSD * r.ltvBps) / 10000;
        collateralValue1e18 += weightedCollateral;
    }
}
```

---

## 💡 **EXAMPLES**

### **Example 1: Single Collateral**
```javascript
// User supplies 10 WETH
Supply: 10 WETH @ $4,500 = $45,000
Collateral value (weighted): $45,000 × 75% = $33,750

// Max borrow:
Can borrow up to $33,750 / 1.1 ≈ $30,681 (with 10% safety buffer)
```

### **Example 2: Multi-Asset Collateral** ⭐
```javascript
// User supplies multiple assets
Supply 1: 10 WETH @ $4,500 = $45,000 × 75% = $33,750
Supply 2: 10,000 DAI @ $1 = $10,000 × 80% = $8,000
Supply 3: 1,000 LINK @ $22 = $22,000 × 70% = $15,400

Total collateral value = $33,750 + $8,000 + $15,400 = $57,150

// Max borrow:
Can borrow up to $57,150 / 1.1 ≈ $51,954 (with 10% safety buffer)

// User can borrow:
✅ DAI (isBorrowable = true)
✅ USDC (isBorrowable = true)
✅ LINK (isBorrowable = true)
❌ WETH (isBorrowable = false)
```

### **Example 3: Complex Scenario**
```javascript
// User position:
Supplied:
- 5 WETH @ $4,500 = $22,500 → Collateral: $16,875 (75%)
- 5,000 DAI @ $1 = $5,000 → Collateral: $4,000 (80%)
- 500 LINK @ $22 = $11,000 → Collateral: $7,700 (70%)

Total Collateral: $28,575

Borrowed:
- 8,000 DAI @ $1 = $8,000
- 2,000 USDC @ $1 = $2,000

Total Debt: $10,000

Health Factor = $28,575 / $10,000 = 2.86 ✅ Safe!

// User can still borrow more:
Max additional borrow = ($28,575 / 1.1) - $10,000 = $15,977
```

---

## 🔥 **SO SÁNH VỚI AAVE**

### **Aave V3:**
```javascript
// More assets & higher LTVs
ETH:   82.5% LTV ✅ (vs your 75%)
WBTC:  75% LTV ✅
USDC:  80% LTV ✅ (same as yours!)
DAI:   75% LTV (vs your 80%)
LINK:  70% LTV ✅ (same as yours!)
```

### **Your Project:**
```javascript
WETH:  75% LTV ✅ Conservative & safe
DAI:   80% LTV ✅ Realistic for stablecoins
USDC:  80% LTV ✅ Realistic for stablecoins
LINK:  70% LTV ✅ Realistic for volatile assets
```

**→ Your LTVs are VERY realistic! 🎉**

---

## 🎓 **KEY TAKEAWAYS**

### **1. Collateral Requirements:**
```
✅ ltvBps > 0 → Can be used as collateral
✅ Higher LTV → More borrowing power
✅ Multi-asset collateral → Sum all weighted values
```

### **2. Borrowable Requirements:**
```
✅ isBorrowable = true → Can borrow this asset
❌ WETH: isBorrowable = false (supply only, use as collateral)
✅ DAI, USDC, LINK: isBorrowable = true
```

### **3. Risk-based LTV:**
```
🔵 Stablecoins (DAI, USDC):  80% LTV (low volatility)
🟢 Blue chips (WETH):        75% LTV (moderate volatility)
🟡 DeFi tokens (LINK):       70% LTV (higher volatility)
```

### **4. Your Project = Realistic! ✅**
```
✅ 4 collateral assets (WETH, DAI, USDC, LINK)
✅ Realistic LTV ratios
✅ Multi-asset support
✅ Flexible borrowable config
✅ Matches real-world protocols (Aave, Compound)
```

---

## 🚀 **ACTION ITEMS (Optional Expansions)**

### **If you want to add more assets:**

**Phase 2:**
```javascript
✅ WBTC (Wrapped Bitcoin)
   - ltvBps: 7500 (75%)
   - isBorrowable: false
   - Use case: Bitcoin holders get liquidity

✅ USDT (Tether)
   - ltvBps: 7750 (77.5%)
   - isBorrowable: true
   - Use case: Another stablecoin option

✅ stETH (Lido Staked ETH)
   - ltvBps: 8000 (80%)
   - isBorrowable: false
   - Use case: Liquid staking derivative (HOT! 🔥)
```

**Phase 3:**
```javascript
✅ AAVE (Governance token)
   - ltvBps: 6600 (66%)
   - isBorrowable: true
   - Use case: DeFi governance exposure

✅ UNI (Uniswap)
   - ltvBps: 6500 (65%)
   - isBorrowable: true
   - Use case: DEX token
```

---

## 📋 **SUMMARY**

### **Trong dự án của bạn:**

```
╔════════════════════════════════════════════╗
║  💎 COLLATERAL ASSETS                      ║
║                                            ║
║  ✅ WETH  - LTV 75%  - Collateral only     ║
║  ✅ DAI   - LTV 80%  - Collateral + Borrow ║
║  ✅ USDC  - LTV 80%  - Collateral + Borrow ║
║  ✅ LINK  - LTV 70%  - Collateral + Borrow ║
║                                            ║
║  → 4 assets, all can be collateral! ✅     ║
║  → Multi-asset support ✅                  ║
║  → Realistic LTVs ✅                       ║
║  → Production-ready logic ✅               ║
╚════════════════════════════════════════════╝
```

**TẤT CẢ 4 ASSETS ĐỀU CÓ THỂ DÙNG LÀM COLLATERAL!** 🎊

**Khác biệt duy nhất:**
- **WETH**: Chỉ collateral (không borrow được)
- **DAI, USDC, LINK**: Vừa collateral vừa borrow được

---

**Built with ❤️ for LendHub v2**
**Your collateral system = Perfect! 🚀**

