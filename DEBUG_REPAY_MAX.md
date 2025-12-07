# 🔍 Debug: Repay Max Không Trả Hết Nợ

## 📋 Vấn Đề

Khi nhấn "Repay Max", vẫn không trả hết được nợ.

## 🔍 Phân Tích Code

### 1. Frontend Logic (RepayModal.tsx)

**Dòng 91-150:** Khi nhấn MAX (REPAY_ALL mode)

```typescript
// 1. Lấy current debt từ contract (1e18 format)
const currentDebt1e18 = await poolContract.getCurrentDebtBalance(userAddress, token.address);

// 2. Convert từ 1e18 sang token decimals
const conversionFactor = BigInt(10 ** (18 - token.decimals));
let debtInTokenDecimals = currentDebt1e18 / conversionFactor;
const remainder = currentDebt1e18 % conversionFactor;
if (remainder > BigInt(0)) {
  debtInTokenDecimals += BigInt(1); // Round up
}

// 3. Thêm 5% buffer
const withBuffer = (debtInTokenDecimals * BigInt(105)) / BigInt(100);

// 4. Cap to user balance
if (withBuffer > userBalance) {
  amountBN = userBalance;
} else {
  amountBN = withBuffer;
}
```

### 2. Smart Contract Logic (LendingPool.sol)

**Dòng 673-749:** Function `repay()`

```solidity
function repay(address asset, uint256 amount, address onBehalfOf) external {
    _accrue(asset); // ⚠️ Tính interest TRƯỚC
    
    uint256 currentDebt = _currentDebt(onBehalfOf, asset);
    if (currentDebt == 0) return 0;
    
    uint256 repayAmount1e18 = _to1e18(amount, r.decimals);
    if (repayAmount1e18 > currentDebt) repayAmount1e18 = currentDebt; // Cap
    
    // Transfer và update...
}
```

## ⚠️ Vấn Đề Phát Hiện

### Vấn Đề 1: Race Condition - Interest Tăng Trong Lúc Transaction

**Timeline:**
```
T0: Frontend gọi getCurrentDebtBalance() → Debt = 1000 DAI
T1: User approve transaction
T2: Transaction được submit
T3: Transaction chờ trong mempool (có thể vài giây)
T4: Transaction được execute
    → _accrue() được gọi → Interest tăng → Debt = 1005 DAI
T5: Repay với amount = 1000 DAI → Còn lại 5 DAI
```

**Giải pháp hiện tại:** Buffer 5% (dòng 135)
```typescript
const withBuffer = (debtInTokenDecimals * BigInt(105)) / BigInt(100);
```

**Vấn đề:** Buffer 5% có thể không đủ nếu:
- Interest rate cao
- Transaction chờ lâu trong mempool
- Nhiều block đã pass

### Vấn Đề 2: Conversion Precision Loss

**Vấn đề:**
```typescript
// Ví dụ: DAI (18 decimals)
currentDebt1e18 = 1000000000000000000 (1 DAI in 1e18)
conversionFactor = 10 ** (18 - 18) = 1
debtInTokenDecimals = 1000000000000000000 / 1 = 1000000000000000000 ✅

// Ví dụ: USDC (6 decimals)
currentDebt1e18 = 1000000000000000000 (1 USDC in 1e18)
conversionFactor = 10 ** (18 - 6) = 10^12
debtInTokenDecimals = 1000000000000000000 / 1000000000000 = 1000000 ✅

// Nhưng nếu có remainder:
currentDebt1e18 = 1000000000000000001 (1.000000000000000001 USDC)
debtInTokenDecimals = 1000000000000000001 / 1000000000000 = 1000000 (mất 1 wei)
remainder = 1 → Round up → 1000001 ✅
```

**Code hiện tại đã xử lý round up, nhưng có thể có edge case.**

### Vấn Đề 3: Contract Cap Logic

**Trong contract (dòng 685):**
```solidity
if (repayAmount1e18 > currentDebt) repayAmount1e18 = currentDebt;
```

**Vấn đề:** Nếu frontend gửi amount > currentDebt, contract sẽ cap về currentDebt. Nhưng nếu currentDebt đã tăng (do interest), thì amount có thể < currentDebt mới.

### Vấn Đề 4: Dust Cleanup

**Trong contract (dòng 706-719):**
```solidity
uint256 newDebt = currentDebt - repayAmount1e18;

// DUST CLEANUP
if (newDebt > 0 && newDebt < dustThreshold) {
    newDebt = 0;
}
```

**Vấn đề:** Nếu còn lại một lượng nhỏ (< dustThreshold), contract sẽ clear về 0. Nhưng nếu amount gửi không đủ, thì newDebt vẫn > dustThreshold.

## 🔧 Giải Pháp Đề Xuất

### Giải Pháp 1: Tăng Buffer

**Thay đổi buffer từ 5% lên 10-15%:**

```typescript
// Dòng 135 trong RepayModal.tsx
// Từ:
const withBuffer = (debtInTokenDecimals * BigInt(105)) / BigInt(100);

// Thành:
const withBuffer = (debtInTokenDecimals * BigInt(110)) / BigInt(100); // 10%
// Hoặc:
const withBuffer = (debtInTokenDecimals * BigInt(115)) / BigInt(100); // 15%
```

### Giải Pháp 2: Lấy Debt Ngay Trước Khi Repay

**Thay vì lấy debt một lần, lấy lại ngay trước khi gửi transaction:**

```typescript
// Trong handleRepay, trước khi gọi repay()
const latestDebt1e18 = await poolContract.getCurrentDebtBalance(userAddress, token.address);
// Recalculate amountBN từ latestDebt1e18
```

### Giải Pháp 3: Repay Với Type(uint256).max

**Gửi amount = type(uint256).max, contract sẽ tự động cap về currentDebt:**

```typescript
// Thay vì tính toán phức tạp, gửi max value
amountBN = ethers.MaxUint256;
// Contract sẽ tự động cap về currentDebt (dòng 685)
```

**⚠️ Lưu ý:** Cần đảm bảo user có đủ balance, nếu không sẽ fail.

### Giải Pháp 4: Repay 2 Lần (Nếu Cần)

**Nếu lần đầu không trả hết, tự động repay lần 2:**

```typescript
// Sau khi repay lần 1
const remainingDebt = await poolContract.getCurrentDebtBalance(userAddress, token.address);
if (remainingDebt > 0) {
  // Repay lần 2 với remainingDebt
}
```

## 🎯 Giải Pháp Tốt Nhất

**Kết hợp Giải Pháp 2 + 3:**

1. Lấy debt ngay trước khi gửi transaction
2. Nếu user có đủ balance → Gửi `ethers.MaxUint256`, contract tự cap
3. Nếu user không đủ balance → Tính toán với buffer 10%

## 📝 Code Sửa Đề Xuất

```typescript
// Trong handleRepay, thay thế phần REPAY_ALL mode:

if (amount === 'REPAY_ALL') {
  console.log('🔄 REPAY ALL MODE: Getting exact current debt including interest...');
  
  const poolContract = new ethers.Contract(
    poolAddress,
    [
      'function getCurrentDebtBalance(address user, address asset) external view returns (uint256)'
    ],
    provider
  );

  // Lấy debt ngay trước khi gửi transaction
  const currentDebt1e18 = await poolContract.getCurrentDebtBalance(userAddress, token.address);
  
  if (currentDebt1e18 === BigInt(0)) {
    showToast({
      type: 'info',
      title: 'No Debt',
      message: 'You have no debt to repay'
    });
    setIsLoading(false);
    return;
  }

  // Kiểm tra user balance
  const tokenContract = new ethers.Contract(
    token.address,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const userBalance = await tokenContract.balanceOf(userAddress);
  
  // Convert debt từ 1e18 sang token decimals
  const conversionFactor = BigInt(10 ** (18 - token.decimals));
  let debtInTokenDecimals = currentDebt1e18 / conversionFactor;
  const remainder = currentDebt1e18 % conversionFactor;
  if (remainder > BigInt(0)) {
    debtInTokenDecimals += BigInt(1); // Round up
  }
  
  // Thêm 10% buffer để handle interest accrual
  const withBuffer = (debtInTokenDecimals * BigInt(110)) / BigInt(100);
  
  // Nếu user có đủ balance (bao gồm buffer) → Gửi MaxUint256
  if (userBalance >= withBuffer) {
    amountBN = ethers.MaxUint256; // Contract sẽ tự cap về currentDebt
    displayAmount = ethers.formatUnits(debtInTokenDecimals, token.decimals);
  } else {
    // Nếu không đủ, gửi hết balance
    amountBN = userBalance;
    displayAmount = ethers.formatUnits(userBalance, token.decimals);
  }
}
```

## 🧪 Test Cases

1. **Test với interest rate cao:**
   - Borrow 1000 DAI
   - Đợi vài block để interest tăng
   - Repay Max → Kiểm tra có trả hết không

2. **Test với USDC (6 decimals):**
   - Borrow 1000 USDC
   - Repay Max → Kiểm tra precision

3. **Test với balance không đủ:**
   - Borrow 1000 DAI
   - Chỉ có 500 DAI trong wallet
   - Repay Max → Kiểm tra trả được bao nhiêu

4. **Test với transaction delay:**
   - Borrow 1000 DAI
   - Repay Max nhưng transaction chờ lâu
   - Kiểm tra có trả hết không

