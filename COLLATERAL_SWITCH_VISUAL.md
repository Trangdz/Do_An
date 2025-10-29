# 🎨 COLLATERAL SWITCH - HÌNH ẢNH MÔ TẢ

## 📊 TRẠNG THÁI HIỂN THỊ:

### 🔴 Collateral = OFF:
```
┌────────────────────────────┐
│  USDC                     │
│  0x635...367c             │
│                           │
│  Collateral: [━●] OFF     │ ← Switch OFF (gray)
│                           │
│  Your Position            │
│  Supplied: 1000 USDC      │
│  💰 Nhận lãi supply       │
│  ❌ KHÔNG dùng để vay      │
└────────────────────────────┘
```

### 🟢 Collateral = ON:
```
┌────────────────────────────┐
│  USDC                     │
│  0x635...367c             │
│                           │
│  Collateral: [●━] ON      │ ← Switch ON (green)
│                           │
│  Your Position            │
│  Supplied: 1000 USDC      │
│  💰 Nhận lãi supply       │
│  ✅ Dùng để vay token khác│
│  ✅ Có thể vay DAI, WETH  │
└────────────────────────────┘
```

---

## 🔄 QUÁ TRÌNH KHI TOGGLE:

### Step 1: Click Switch OFF → ON

```
Before:
Collateral: [━●] OFF  (Gray)

Click ↓

After:
Collateral: [●━] ON  (Green)
```

### Step 2: Smart Contract Actions

```solidity
// 1. Mark flag
u.useAsCollateral = true;

// 2. Recalculate collateral
uint256 weightedCollateral = (supply * price * ltvBps) / 10000;
totalCollateral += weightedCollateral;

// 3. Update HF
HF = totalCollateral / totalDebt
```

### Step 3: User Can Now Borrow

```
Before toggle (OFF):
- Collateral value: $0 (not counted)
- Max borrow: 0 tokens
- Cannot borrow

After toggle (ON):
- Collateral value: $750 (1000 USDC × 0.75 LTV)
- Max borrow: Up to $750
- Can borrow DAI, WETH, etc.
```

---

## 🎯 SWITCH LOCATION:

```
┌─────────────────────────────┐
│  USDC                       │
│  0x635...367c               │
│  ━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  Collateral: [━●] OFF       │ ← SWITCH ĐÂY!
│        ^                    │
│        │                     │
│        Click to toggle       │
│                             │
│  Your Position              │
│  Supplied: 1000 USDC        │
└─────────────────────────────┘
```

---

## 💡 USAGE FLOW:

### Scenario: Enable USDC Collateral

1. **Current State:**
   - 1000 USDC supplied
   - Collateral: OFF
   - Cannot borrow

2. **Click Toggle:**
   - Send transaction
   - Wait confirmation
   - State updated

3. **Result:**
   - Collateral: ON
   - Collateral value: $750
   - Can now borrow up to $750
   - Can borrow DAI, WETH, etc.

### Scenario: Borrow Using USDC

1. **With Collateral ON:**
   - Supply 1000 USDC
   - Collateral value: $750
   - Borrow 500 DAI ✅

2. **With Collateral OFF:**
   - Supply 1000 USDC
   - Collateral value: $0
   - Cannot borrow ❌

---

## ✅ SUMMARY:

- ✅ Switch OFF → Only supply interest
- ✅ Switch ON → Supply interest + Can borrow
- ✅ Smooth iOS-style toggle
- ✅ Real-time visual feedback
- ✅ Color coding (gray ↔ green)

**Switch đã hoạt động như mô tả!** 🎉




