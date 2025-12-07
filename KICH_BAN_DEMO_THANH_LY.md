# 🎬 Kịch Bản Demo Chức Năng Thanh Lý - Chi Tiết

## 📋 Tổng Quan

Kịch bản này mô phỏng một tình huống thanh lý thực tế, từ khi user có vị thế an toàn đến khi bị thanh lý do giá tài sản thế chấp giảm.

---

## 🎯 Mục Tiêu Demo

1. ✅ Hiểu cách Health Factor hoạt động
2. ✅ Thấy được khi nào vị thế có thể bị thanh lý
3. ✅ Demo quy trình thanh lý từ đầu đến cuối
4. ✅ Thấy được phần thưởng cho liquidator

---

## 👥 Nhân Vật

- **Borrower (Người vay)**: User có vị thế vay
- **Liquidator (Người thanh lý)**: User thực hiện thanh lý
- **Protocol**: LendingPool contract

---

## 📊 Kịch Bản Chi Tiết

### **BƯỚC 1: Setup Ban Đầu**

#### 1.1. Thông Số Assets

```
DAI (Collateral):
- Address: 0x...
- Decimals: 18
- LTV: 75% (7500 bps)
- Liquidation Threshold: 80% (8000 bps)
- Liquidation Bonus: 5% (500 bps)
- Close Factor: 50% (5000 bps)
- Giá ban đầu: $1.00

USDC (Debt):
- Address: 0x...
- Decimals: 6
- Giá: $1.00
```

#### 1.2. Borrower Setup

```
Borrower cần:
- 100 DAI để supply
- Approve LendingPool để spend DAI
```

**Code:**
```javascript
const supplyAmount = ethers.parseUnits("100", 18); // 100 DAI
await dai.approve(LendingPoolAddress, supplyAmount);
await pool.lend(DAIAddress, supplyAmount);
await pool.setUserUseReserveAsCollateral(DAIAddress, true);
```

**Kết quả:**
- Borrower có 100 DAI trong pool
- DAI được enable làm collateral

---

### **BƯỚC 2: Borrower Vay**

#### 2.1. Tính Toán Số Tiền Có Thể Vay

```
Collateral Value = 100 DAI × $1.00 × 75% = $75
Max Borrow = $75 (theo LTV)
```

#### 2.2. Borrower Vay 60 USDC

```
Borrow Amount: 60 USDC = $60
```

**Code:**
```javascript
const borrowAmount = ethers.parseUnits("60", 6); // 60 USDC
await pool.borrow(USDCAddress, borrowAmount);
```

**Kết quả:**
- Borrower vay 60 USDC
- Health Factor ban đầu:
  ```
  Collateral Value = 100 × 1.00 × 0.75 = $75
  Debt Value = 60 × 1.00 = $60
  HF = 75 / 60 = 1.25 ✅ (An toàn)
  ```

**Trạng thái:**
```
📊 Borrower Account:
  Collateral: $75.00 (100 DAI × 75% LTV)
  Debt: $60.00 (60 USDC)
  Health Factor: 1.25 ✅
```

---

### **BƯỚC 3: Giá Tài Sản Giảm (Trigger Liquidation)**

#### 3.1. Giá DAI Giảm

**Kịch bản:** Giá DAI giảm từ $1.00 xuống $0.80

**Tính toán Health Factor mới:**
```
Collateral Value = 100 DAI × $0.80 × 75% = $60
Debt Value = 60 USDC × $1.00 = $60
HF = 60 / 60 = 1.00 ⚠️ (Nguy hiểm)
```

**Nếu giá tiếp tục giảm xuống $0.75:**
```
Collateral Value = 100 DAI × $0.75 × 75% = $56.25
Debt Value = 60 USDC × $1.00 = $60
HF = 56.25 / 60 = 0.9375 ❌ (Có thể thanh lý!)
```

**Code để giảm giá:**
```javascript
// Cần có quyền writer trong oracle
const targetPrice = 0.75; // $0.75
await aggregator.updatePrice("DAI", priceToInt(targetPrice));
```

**Trạng thái sau khi giá giảm:**
```
📊 Borrower Account (sau khi giá giảm):
  Collateral: $56.25 (100 DAI × $0.75 × 75% LTV)
  Debt: $60.00 (60 USDC)
  Health Factor: 0.9375 ❌ (Có thể thanh lý!)
```

---

### **BƯỚC 4: Liquidator Thực Hiện Thanh Lý**

#### 4.1. Liquidator Kiểm Tra Vị Thế

**Liquidator thấy:**
- HF = 0.9375 < 1.0 ✅ (Điều kiện thanh lý)
- Debt = 60 USDC
- Có thể thanh lý!

#### 4.2. Tính Toán Thanh Lý

**Tham số:**
- Close Factor: 50%
- Liquidation Bonus: 5%

**Tính toán:**
```
Max Repay = 60 USDC × 50% = 30 USDC
Liquidator chọn repay: 30 USDC

Repay USD = 30 × $1.00 = $30
Seize USD = $30 × (1 + 5%) = $31.50
Seize DAI = $31.50 / $0.75 = 42 DAI
```

**Code:**
```javascript
const liquidationAmount = ethers.parseUnits("30", 6); // 30 USDC

// Liquidator approve và transfer USDC
await usdc.approve(LendingPoolAddress, liquidationAmount);

// Thực hiện thanh lý
await pool.liquidationCall(
  USDCAddress,      // debtAsset
  DAIAddress,       // collateralAsset
  borrower.address,  // user
  liquidationAmount // repayRequested
);
```

#### 4.3. Quy Trình Thanh Lý (Trong Contract)

**Bước 1: Accrue Interest**
```solidity
_accrue(USDCAddress);
_accrue(DAIAddress);
```

**Bước 2: Kiểm tra HF**
```solidity
(, , uint256 hf) = _getAccountData(borrower);
require(hf < 1e18, "HF>=1"); // ✅ Pass: 0.9375 < 1.0
```

**Bước 3: Tính max repay**
```solidity
debtNow = 60 USDC (1e18 format)
maxRepay = 60 × 50% = 30 USDC
repay1e18 = 30 USDC
```

**Bước 4: Liquidator transfer USDC**
```solidity
// Liquidator transfer 30 USDC vào pool
IERC20(USDCAddress).safeTransferFrom(liquidator, pool, 30 USDC);
```

**Bước 5: Tính seize amount**
```solidity
priceDebt = $1.00 (1e18)
priceColl = $0.75 (1e18)
repayUsd = 30 × 1.00 = $30
seizeUsd = 30 × 1.05 = $31.50
seizeColl = 31.50 / 0.75 = 42 DAI
```

**Bước 6: Cập nhật vị thế**
```solidity
// Borrower debt giảm
debtNew = 60 - 30 = 30 USDC

// Borrower collateral giảm
collateralNew = 100 - 42 = 58 DAI
```

**Bước 7: Transfer collateral cho liquidator**
```solidity
IERC20(DAIAddress).safeTransfer(liquidator, 42 DAI);
```

---

### **BƯỚC 5: Kết Quả Sau Thanh Lý**

#### 5.1. Trạng Thái Borrower

```
📊 Borrower Account (sau thanh lý):
  Collateral: $43.50 (58 DAI × $0.75 × 75% LTV)
  Debt: $30.00 (30 USDC)
  Health Factor: 43.50 / 30 = 1.45 ✅ (An toàn lại!)
```

**So sánh:**
- Trước thanh lý: HF = 0.9375 ❌
- Sau thanh lý: HF = 1.45 ✅

#### 5.2. Trạng Thái Liquidator

```
💰 Liquidator:
  Đã trả: 30 USDC
  Nhận được: 42 DAI
  Giá trị nhận: 42 × $0.75 = $31.50
  Lợi nhuận: $31.50 - $30.00 = $1.50 (5% bonus)
```

#### 5.3. Trạng Thái Protocol

```
📊 Protocol:
  Debt Reserve (USDC):
    - Total Debt: 60 → 30 USDC
    - Reserve Cash: +30 USDC
  
  Collateral Reserve (DAI):
    - Reserve Cash: -42 DAI
    - (Collateral đã được transfer cho liquidator)
```

---

## 🔢 Ví Dụ Số Liệu Chi Tiết

### Scenario 1: Thanh Lý Một Phần (Partial Liquidation)

**Setup:**
```
Borrower:
  - Supply: 1000 USDC (LTV: 75%)
  - Borrow: 800 USDT
  - HF ban đầu: (1000 × 0.75) / 800 = 0.9375

Tham số:
  - Close Factor: 50%
  - Liquidation Bonus: 10%
  - Giá USDC: $1.00
  - Giá USDT: $1.00
```

**Giá USDC giảm xuống $0.90:**
```
HF mới = (1000 × 0.90 × 0.75) / 800 = 0.84375 ❌
```

**Liquidator thanh lý:**
```
Max Repay = 800 × 50% = 400 USDT
Repay: 400 USDT
Repay USD = 400 × $1.00 = $400
Seize USD = 400 × 1.10 = $440
Seize USDC = 440 / 0.90 = 488.89 USDC
```

**Kết quả:**
```
Borrower sau thanh lý:
  - Collateral: 1000 - 488.89 = 511.11 USDC
  - Debt: 800 - 400 = 400 USDT
  - HF = (511.11 × 0.90 × 0.75) / 400 = 0.8625

⚠️ Vẫn còn nguy hiểm! Có thể cần thanh lý tiếp.
```

### Scenario 2: Thanh Lý Hoàn Toàn (Full Liquidation - Nhiều Lần)

**Setup:**
```
Borrower:
  - Supply: 2000 USDC
  - Borrow: 1600 USDT
  - HF: (2000 × 0.75) / 1600 = 0.9375
```

**Lần 1:**
```
Repay: 800 USDT (50% của 1600)
Seize: 880 USDC (với 10% bonus)
Borrower còn: 1120 USDC, 800 USDT
HF = (1120 × 0.75) / 800 = 1.05 ✅
```

**Nếu giá tiếp tục giảm:**
```
Giá USDC giảm xuống $0.80
HF = (1120 × 0.80 × 0.75) / 800 = 0.84 ❌
```

**Lần 2:**
```
Repay: 400 USDT (50% của 800)
Seize: 440 USDC
Borrower còn: 680 USDC, 400 USDT
HF = (680 × 0.80 × 0.75) / 400 = 1.02 ✅
```

---

## 🛠️ Script Demo Tự Động

### Script 1: Setup và Vay

```javascript
// scripts/demo_liquidation_setup.cjs
const { ethers } = require("hardhat");

async function setupBorrower() {
  const [borrower] = await ethers.getSigners();
  const pool = await ethers.getContractAt("LendingPool", LENDING_POOL_ADDRESS);
  const dai = await ethers.getContractAt("ERC20", DAI_ADDRESS);
  
  // 1. Supply 100 DAI
  const supplyAmount = ethers.parseUnits("100", 18);
  await dai.approve(LENDING_POOL_ADDRESS, supplyAmount);
  await pool.lend(DAI_ADDRESS, supplyAmount);
  
  // 2. Enable as collateral
  await pool.setUserUseReserveAsCollateral(DAI_ADDRESS, true);
  
  // 3. Borrow 60 USDC
  const borrowAmount = ethers.parseUnits("60", 6);
  await pool.borrow(USDC_ADDRESS, borrowAmount);
  
  // 4. Check HF
  const [coll, debt, hf] = await pool.getAccountData(borrower.address);
  console.log(`HF: ${ethers.formatUnits(hf, 18)}`);
}
```

### Script 2: Giảm Giá và Thanh Lý

```javascript
// scripts/demo_liquidation_execute.cjs
async function executeLiquidation() {
  const [borrower, liquidator] = await ethers.getSigners();
  const pool = await ethers.getContractAt("LendingPool", LENDING_POOL_ADDRESS);
  const aggregator = await ethers.getContractAt("MultiPriceAggregator", ORACLE_ADDRESS);
  const usdc = await ethers.getContractAt("ERC20", USDC_ADDRESS);
  
  // 1. Giảm giá DAI xuống $0.75
  await aggregator.updatePrice("DAI", ethers.parseUnits("0.75", 8));
  
  // 2. Check HF
  const [, , hf] = await pool.getAccountData(borrower.address);
  console.log(`HF sau khi giảm giá: ${ethers.formatUnits(hf, 18)}`);
  
  // 3. Liquidator thanh lý
  const repayAmount = ethers.parseUnits("30", 6);
  await usdc.connect(liquidator).approve(LENDING_POOL_ADDRESS, repayAmount);
  await pool.connect(liquidator).liquidationCall(
    USDC_ADDRESS,
    DAI_ADDRESS,
    borrower.address,
    repayAmount
  );
  
  // 4. Check HF sau thanh lý
  const [, , hfAfter] = await pool.getAccountData(borrower.address);
  console.log(`HF sau thanh lý: ${ethers.formatUnits(hfAfter, 18)}`);
}
```

---

## 📝 Checklist Demo

### Trước Khi Demo

- [ ] Deploy contracts (LendingPool, Oracle, Tokens)
- [ ] Setup assets (DAI, USDC) với tham số:
  - [ ] LTV: 75%
  - [ ] Liquidation Threshold: 80%
  - [ ] Liquidation Bonus: 5%
  - [ ] Close Factor: 50%
- [ ] Mint tokens cho borrower và liquidator
- [ ] Setup oracle prices (DAI: $1.00, USDC: $1.00)

### Bước 1: Setup Borrower

- [ ] Borrower approve DAI cho pool
- [ ] Borrower supply 100 DAI
- [ ] Enable DAI làm collateral
- [ ] Verify collateral value = $75

### Bước 2: Borrower Vay

- [ ] Borrower borrow 60 USDC
- [ ] Verify HF = 1.25
- [ ] Verify debt = $60

### Bước 3: Trigger Liquidation

- [ ] Giảm giá DAI xuống $0.75
- [ ] Verify HF < 1.0 (0.9375)
- [ ] Verify vị thế có thể thanh lý

### Bước 4: Thanh Lý

- [ ] Liquidator approve USDC
- [ ] Liquidator gọi liquidationCall(30 USDC)
- [ ] Verify transaction thành công
- [ ] Verify event Liquidated được emit

### Bước 5: Verify Kết Quả

- [ ] Borrower debt giảm: 60 → 30 USDC
- [ ] Borrower collateral giảm: 100 → 58 DAI
- [ ] HF tăng: 0.9375 → 1.45
- [ ] Liquidator nhận 42 DAI
- [ ] Liquidator profit = $1.50

---

## 🎬 Demo Flow (Trực Quan)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Borrower Setup                                  │
├─────────────────────────────────────────────────────────┤
│ Supply: 100 DAI                                         │
│ Collateral Value: $75 (100 × $1.00 × 75%)              │
│ HF: ∞ (chưa có debt)                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Borrower Borrows                               │
├─────────────────────────────────────────────────────────┤
│ Borrow: 60 USDC                                         │
│ Collateral: $75                                         │
│ Debt: $60                                               │
│ HF: 1.25 ✅ (An toàn)                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Price Drops                                     │
├─────────────────────────────────────────────────────────┤
│ DAI Price: $1.00 → $0.75                                │
│ Collateral: $75 → $56.25                                │
│ Debt: $60 (không đổi)                                   │
│ HF: 1.25 → 0.9375 ❌ (Có thể thanh lý!)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Liquidation                                     │
├─────────────────────────────────────────────────────────┤
│ Liquidator repays: 30 USDC (50% max)                    │
│ Seize: 42 DAI (với 5% bonus)                            │
│ Liquidator profit: $1.50                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: After Liquidation                               │
├─────────────────────────────────────────────────────────┤
│ Borrower:                                               │
│   - Collateral: 58 DAI ($43.50)                         │
│   - Debt: 30 USDC ($30)                                 │
│   - HF: 1.45 ✅ (An toàn lại!)                           │
│                                                          │
│ Liquidator:                                             │
│   - Received: 42 DAI ($31.50)                            │
│   - Paid: 30 USDC ($30)                                 │
│   - Profit: $1.50                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Debug và Troubleshooting

### Vấn Đề 1: HF Không Giảm Dưới 1.0

**Nguyên nhân:**
- Giá chưa giảm đủ
- LTV quá cao

**Giải pháp:**
```javascript
// Giảm giá mạnh hơn
await aggregator.updatePrice("DAI", ethers.parseUnits("0.70", 8));

// Hoặc tăng debt
await pool.borrow(USDC_ADDRESS, ethers.parseUnits("70", 6));
```

### Vấn Đề 2: "insufficient collateral"

**Nguyên nhân:**
- User không có đủ collateral
- Seize amount > user collateral

**Giải pháp:**
```javascript
// Giảm repay amount
const repayAmount = ethers.parseUnits("20", 6); // Thay vì 30
```

### Vấn Đề 3: "HF>=1"

**Nguyên nhân:**
- HF đã tăng lại trên 1.0
- Có thể do giá tăng lại

**Giải pháp:**
```javascript
// Kiểm tra lại HF trước khi thanh lý
const [, , hf] = await pool.getAccountData(user);
if (hf >= ethers.parseUnits("1", 18)) {
  console.log("HF >= 1.0, không thể thanh lý");
}
```

---

## 📊 Bảng So Sánh Trước/Sau

| Metric | Trước Thanh Lý | Sau Thanh Lý | Thay Đổi |
|--------|----------------|--------------|----------|
| **Borrower Collateral** | 100 DAI | 58 DAI | -42 DAI |
| **Borrower Debt** | 60 USDC | 30 USDC | -30 USDC |
| **Health Factor** | 0.9375 | 1.45 | +0.5125 |
| **Collateral Value** | $56.25 | $43.50 | -$12.75 |
| **Debt Value** | $60.00 | $30.00 | -$30.00 |
| **Liquidator Balance** | 0 DAI | 42 DAI | +42 DAI |
| **Liquidator Profit** | - | $1.50 | +$1.50 |

---

## 🎯 Kết Luận

Kịch bản này minh họa:

1. ✅ **Cách HF hoạt động**: HF phụ thuộc vào giá tài sản
2. ✅ **Khi nào thanh lý**: HF < 1.0
3. ✅ **Quy trình thanh lý**: Từ kiểm tra đến transfer
4. ✅ **Lợi ích cho liquidator**: Nhận bonus khi thanh lý
5. ✅ **Bảo vệ protocol**: Đảm bảo vị thế luôn đảm bảo

**Demo này giúp hiểu rõ cơ chế thanh lý trong DeFi lending protocol!** 🎯


