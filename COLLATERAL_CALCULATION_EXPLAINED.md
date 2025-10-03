# 💰 CÁCH TÍNH THẾ CHẤP & VAY TRONG LENDHUB V2

## 🎯 **TRẢ LỜI CÂU HỎI CỦA BẠN**

### **Câu hỏi:** 
> "Khi vay thì hệ thống sẽ tính số tiền mình thế chấp thế nào để cho vay với 1 con số cụ thể? Ví dụ vay USDC thì nó tính tất cả số tiền mình thế chấp bao gồm của tất cả các token à?"

### **Trả lời:**
**✅ ĐÚNG RỒI! Hệ thống tính TỔNG TẤT CẢ các token bạn đã bật làm collateral!**

---

## 🆕 **TÍNH NĂNG MỚI: BẬT/TẮT THẾ CHẤP**

### **Tính năng vừa thêm:**

```solidity
function setUserUseReserveAsCollateral(
    address asset, 
    bool useAsCollateral
) external;

// Bật thế chấp:
lendingPool.setUserUseReserveAsCollateral(DAI, true);  ✅

// Tắt thế chấp:
lendingPool.setUserUseReserveAsCollateral(DAI, false); ❌
```

### **Cách hoạt động:**

```javascript
// 1. Khi supply → TỰ ĐỘNG BẬT làm collateral (nếu LTV > 0)
await lendingPool.lend(WETH, ethers.parseEther("10"));
// → WETH tự động được bật làm collateral ✅

// 2. Có thể TẮT nếu không muốn dùng làm collateral
await lendingPool.setUserUseReserveAsCollateral(WETH, false);
// → WETH không còn tính vào collateral ❌

// 3. Có thể BẬT lại bất cứ lúc nào
await lendingPool.setUserUseReserveAsCollateral(WETH, true);
// → WETH lại được tính vào collateral ✅
```

### **Quy tắc:**
```
✅ Bật: Chỉ cần có supply > 0 và LTV > 0
❌ Tắt: Phải đảm bảo Health Factor vẫn > 1 sau khi tắt!
```

---

## 📊 **CÁCH TÍNH COLLATERAL (CHI TIẾT)**

### **Formula đầy đủ:**

```solidity
function _getAccountData(address user) {
    uint256 totalCollateral = 0;
    uint256 totalDebt = 0;
    
    // Loop qua TẤT CẢ assets
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        
        // 1️⃣ CHỈ TÍNH NẾU USER BẬT "useAsCollateral" ✅
        if (userReserves[user][asset].useAsCollateral) {
            uint256 supply = _currentSupply(user, asset);
            uint256 price = oracle.getAssetPrice1e18(asset);
            uint256 ltvBps = reserves[asset].ltvBps;
            
            // Collateral weighted by LTV
            uint256 supplyValue = (supply * price) / 1e18;
            uint256 weighted = (supplyValue * ltvBps) / 10000;
            
            totalCollateral += weighted;
        }
        
        // 2️⃣ TÍNH DEBT (tất cả debt đều tính)
        uint256 debt = _currentDebt(user, asset);
        uint256 price = oracle.getAssetPrice1e18(asset);
        uint256 debtValue = (debt * price) / 1e18;
        
        totalDebt += debtValue;
    }
    
    // 3️⃣ TÍNH HEALTH FACTOR
    uint256 healthFactor = (totalCollateral * 1e18) / totalDebt;
    
    return (totalCollateral, totalDebt, healthFactor);
}
```

---

## 💡 **VÍ DỤ THỰC TẾ**

### **Scenario 1: Multi-Asset Collateral (TẤT CẢ BẬT)**

```javascript
// User supply 3 assets:
Supply 1: 10 WETH   @ $4,500 = $45,000
Supply 2: 10,000 DAI  @ $1    = $10,000
Supply 3: 1,000 LINK @ $22    = $22,000

// TẤT CẢ 3 assets đều TỰ ĐỘNG BẬT làm collateral ✅
useAsCollateral[WETH] = true  ✅
useAsCollateral[DAI]  = true  ✅
useAsCollateral[LINK] = true  ✅

// TÍNH COLLATERAL:
WETH collateral  = $45,000 × 75% = $33,750
DAI collateral   = $10,000 × 80% = $8,000
LINK collateral  = $22,000 × 70% = $15,400
─────────────────────────────────────────────
TOTAL COLLATERAL = $57,150 ✅

// User muốn vay USDC:
Max borrow = $57,150 / 1.1 = $51,954 USDC

→ HỆ THỐNG TÍNH TỔNG TẤT CẢ 3 ASSETS! ✅
```

---

### **Scenario 2: Chỉ Dùng 1 Phần Làm Collateral**

```javascript
// User supply 3 assets:
Supply 1: 10 WETH   @ $4,500 = $45,000
Supply 2: 10,000 DAI  @ $1    = $10,000
Supply 3: 1,000 LINK @ $22    = $22,000

// User TẮT DAI và LINK làm collateral:
await lendingPool.setUserUseReserveAsCollateral(DAI, false);  ❌
await lendingPool.setUserUseReserveAsCollateral(LINK, false); ❌

// CHỈ WETH được tính:
useAsCollateral[WETH] = true  ✅
useAsCollateral[DAI]  = false ❌
useAsCollateral[LINK] = false ❌

// TÍNH COLLATERAL:
WETH collateral  = $45,000 × 75% = $33,750
DAI collateral   = $0 (TẮT)
LINK collateral  = $0 (TẮT)
─────────────────────────────────────────────
TOTAL COLLATERAL = $33,750 ✅

// User muốn vay USDC:
Max borrow = $33,750 / 1.1 = $30,681 USDC

→ CHỈ TÍNH WETH VÌ CHỈ WETH BẬT COLLATERAL! ✅
```

---

### **Scenario 3: Vay USDC với Multi-Asset Collateral**

```javascript
// BƯỚC 1: Supply nhiều assets
await lendingPool.lend(WETH, ethers.parseEther("10"));     // $45,000
await lendingPool.lend(DAI, ethers.parseEther("10000"));   // $10,000
await lendingPool.lend(LINK, ethers.parseEther("1000"));   // $22,000

// TẤT CẢ TỰ ĐỘNG BẬT làm collateral ✅
// Total collateral = $57,150 (weighted)

// BƯỚC 2: Vay USDC
await lendingPool.borrow(USDC, ethers.parseUnits("20000", 6)); // $20,000

// TÍNH TOÁN:
Total Collateral = $57,150
Total Debt       = $20,000 USDC
Health Factor    = $57,150 / $20,000 = 2.86 ✅ SAFE!

→ HỆ THỐNG ĐÃ DÙNG CẢ 3 ASSETS ĐỂ CHO PHÉP VAY $20,000 USDC! ✅
```

---

### **Scenario 4: Vay Nhiều Loại Token**

```javascript
// User supply:
10 WETH @ $4,500 = $45,000 → Collateral: $33,750

// User vay NHIỀU loại:
Borrow 1: 5,000 DAI  @ $1 = $5,000
Borrow 2: 3,000 USDC @ $1 = $3,000
Borrow 3: 100 LINK @ $22  = $2,200

Total Debt = $5,000 + $3,000 + $2,200 = $10,200

// TÍNH HEALTH FACTOR:
HF = $33,750 / $10,200 = 3.31 ✅ SAFE!

→ CÓ THỂ VAY NHIỀU LOẠI TOKEN KHÁC NHAU! ✅
→ DEBT CŨNG TÍNH TỔNG TẤT CẢ! ✅
```

---

## 🔄 **FLOW CHART: CÁCH TÍNH KHI VAY**

```
┌─────────────────────────────────────────────┐
│  USER MUỐN VAY 5,000 USDC                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  1️⃣ HỆ THỐNG TÍNH TỔNG COLLATERAL          │
│                                             │
│  Loop qua TẤT CẢ assets:                   │
│  ┌──────────────────────────────┐          │
│  │ WETH (useAsCollateral=true)  │ ✅       │
│  │ → $45,000 × 75% = $33,750    │          │
│  └──────────────────────────────┘          │
│  ┌──────────────────────────────┐          │
│  │ DAI (useAsCollateral=true)   │ ✅       │
│  │ → $10,000 × 80% = $8,000     │          │
│  └──────────────────────────────┘          │
│  ┌──────────────────────────────┐          │
│  │ LINK (useAsCollateral=false) │ ❌       │
│  │ → $0 (bị tắt)                │          │
│  └──────────────────────────────┘          │
│                                             │
│  TOTAL = $41,750                            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2️⃣ HỆ THỐNG TÍNH TỔNG DEBT HIỆN TẠI       │
│                                             │
│  Loop qua TẤT CẢ assets:                   │
│  DAI debt:  $3,000                          │
│  USDC debt: $0                              │
│  LINK debt: $0                              │
│                                             │
│  TOTAL DEBT = $3,000                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3️⃣ TÍNH NEW DEBT SAU KHI VAY              │
│                                             │
│  Current debt: $3,000                       │
│  New borrow:   $5,000 USDC                  │
│  NEW TOTAL:    $8,000                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4️⃣ CHECK HEALTH FACTOR                    │
│                                             │
│  Collateral: $41,750                        │
│  New Debt:   $8,000                         │
│                                             │
│  Required: $8,000 × 1.1 = $8,800            │
│  Available: $41,750                         │
│                                             │
│  $41,750 >= $8,800 ? ✅ YES!                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  ✅ CHO PHÉP VAY 5,000 USDC!                │
│                                             │
│  Transfer 5,000 USDC to user ✅             │
│  Update debt: $3,000 → $8,000 ✅            │
│  Health Factor = 5.22 ✅                    │
└─────────────────────────────────────────────┘
```

---

## 📐 **CÔNG THỨC TỔNG QUÁT**

### **1. Total Collateral (Tổng Thế Chấp):**

```javascript
Total Collateral = Σ (Supply[i] × Price[i] × LTV[i] / 100)
                   for all assets WHERE useAsCollateral[i] = true

Ví dụ:
= (WETH_supply × WETH_price × 75%)
+ (DAI_supply × DAI_price × 80%)
+ (USDC_supply × USDC_price × 80%)
+ (LINK_supply × LINK_price × 70%)

CHỈ TÍNH NẾU useAsCollateral = true! ✅
```

### **2. Total Debt (Tổng Nợ):**

```javascript
Total Debt = Σ (Borrow[i] × Price[i])
             for all assets

Ví dụ:
= (DAI_borrow × DAI_price)
+ (USDC_borrow × USDC_price)
+ (LINK_borrow × LINK_price)

TẤT CẢ DEBT ĐỀU TÍNH! ✅
```

### **3. Max Borrow (Vay Tối Đa):**

```javascript
Max Borrow = Total Collateral / 1.1

Ví dụ:
Total Collateral = $57,150
Max Borrow = $57,150 / 1.1 = $51,954

→ Có thể vay bất kỳ asset nào (DAI, USDC, LINK) 
   miễn TỔNG không vượt quá $51,954! ✅
```

### **4. Health Factor:**

```javascript
Health Factor = Total Collateral / Total Debt

Safe if HF > 1.0
Liquidated if HF < 1.0

Ví dụ:
Collateral = $57,150
Debt = $20,000
HF = $57,150 / $20,000 = 2.86 ✅ SAFE!
```

---

## 🎮 **TEST CASES**

### **Test 1: Vay với 1 Collateral**

```javascript
// Setup
await lendingPool.lend(WETH, ethers.parseEther("10")); // $45,000

// Calculate
Collateral = $45,000 × 75% = $33,750
Max borrow = $33,750 / 1.1 = $30,681

// Action
await lendingPool.borrow(USDC, ethers.parseUnits("20000", 6)); // $20,000 ✅

// Result
HF = $33,750 / $20,000 = 1.69 ✅ SAFE!
```

---

### **Test 2: Vay với Multi Collateral**

```javascript
// Setup
await lendingPool.lend(WETH, ethers.parseEther("5"));     // $22,500
await lendingPool.lend(DAI, ethers.parseEther("10000"));  // $10,000
await lendingPool.lend(LINK, ethers.parseEther("500"));   // $11,000

// Calculate
WETH:  $22,500 × 75% = $16,875
DAI:   $10,000 × 80% = $8,000
LINK:  $11,000 × 70% = $7,700
TOTAL = $32,575

Max borrow = $32,575 / 1.1 = $29,613

// Action
await lendingPool.borrow(USDC, ethers.parseUnits("25000", 6)); // $25,000 ✅

// Result
HF = $32,575 / $25,000 = 1.30 ✅ SAFE!
```

---

### **Test 3: Tắt Collateral**

```javascript
// Setup (giống Test 2)
WETH:  $16,875
DAI:   $8,000
LINK:  $7,700
TOTAL = $32,575

// User tắt LINK collateral
await lendingPool.setUserUseReserveAsCollateral(LINK, false); ❌

// New calculation
WETH:  $16,875 ✅
DAI:   $8,000 ✅
LINK:  $0 (TẮT) ❌
TOTAL = $24,875

// Existing debt: $25,000
// HF = $24,875 / $25,000 = 0.995 ❌ BELOW 1!

→ KHÔNG CHO PHÉP TẮT! ✅
→ Error: "Health factor would be < 1" ✅
```

---

### **Test 4: Vay Nhiều Loại Token**

```javascript
// Setup
await lendingPool.lend(WETH, ethers.parseEther("20")); // $90,000

// Collateral
$90,000 × 75% = $67,500

// Vay nhiều loại:
await lendingPool.borrow(DAI, ethers.parseEther("20000"));      // $20,000
await lendingPool.borrow(USDC, ethers.parseUnits("15000", 6));  // $15,000
await lendingPool.borrow(LINK, ethers.parseEther("500"));       // $11,000

// Total debt
$20,000 + $15,000 + $11,000 = $46,000

// Health Factor
HF = $67,500 / $46,000 = 1.47 ✅ SAFE!

→ CÓ THỂ VAY NHIỀU LOẠI! ✅
→ HỆ THỐNG TÍNH TỔNG TẤT CẢ! ✅
```

---

## 🔑 **KEY POINTS**

### **1. Multi-Asset Collateral:**
```
✅ Hệ thống TÍNH TỔNG TẤT CẢ assets có useAsCollateral = true
✅ Weighted by LTV (mỗi asset có LTV khác nhau)
✅ Giống Aave/Compound thật sự
```

### **2. Collateral Toggle:**
```
✅ Tự động BẬT khi supply (nếu LTV > 0)
✅ Có thể TẮT nếu HF vẫn > 1
✅ Có thể BẬT lại bất cứ lúc nào
```

### **3. Borrowing Power:**
```
✅ Tính từ TỔNG TẤT CẢ collateral
✅ Có thể vay BẤT KỲ asset nào (DAI, USDC, LINK)
✅ Tổng debt phải < Total Collateral / 1.1
```

### **4. Safety:**
```
✅ Health Factor phải > 1.0
✅ Liquidation nếu HF < 1.0
✅ Không cho tắt collateral nếu HF sẽ < 1
```

---

## 🏆 **TÓM TẮT**

### **Câu trả lời cho câu hỏi của bạn:**

```
╔════════════════════════════════════════════╗
║  KHI VAY USDC:                             ║
║                                            ║
║  ✅ HỆ THỐNG TÍNH TỔNG TẤT CẢ:            ║
║     - WETH collateral                      ║
║     - DAI collateral                       ║
║     - USDC collateral                      ║
║     - LINK collateral                      ║
║                                            ║
║  → NHƯNG CHỈ TÍNH NẾU useAsCollateral=true║
║                                            ║
║  ✅ Weighted by LTV:                       ║
║     WETH × 75%                             ║
║     DAI  × 80%                             ║
║     USDC × 80%                             ║
║     LINK × 70%                             ║
║                                            ║
║  → TỔNG COLLATERAL = Max Borrowing Power! ║
╚════════════════════════════════════════════╝
```

**GIỐNG AAVE/COMPOUND 100%! 🎉**

---

**Built with ❤️ for LendHub v2**
**Your collateral system = Production-ready! 🚀**

