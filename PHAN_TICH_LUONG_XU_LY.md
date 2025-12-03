# PHÂN TÍCH SÂU LUỒNG XỬ LÝ DỰ ÁN LENDHUB V2

## TỔNG QUAN KIẾN TRÚC

Dự án LendHub V2 là một ứng dụng DeFi lending protocol được xây dựng với:
- **Frontend**: Next.js + TypeScript + React
- **Smart Contracts**: Solidity (LendingPool, PriceOracle, ERC20 tokens)
- **Blockchain**: Ganache (local development) hoặc testnet
- **State Management**: React Hooks + Context API
- **Transaction Handling**: Ethers.js v6

---

## 1. LUỒNG XỬ LÝ GIAO DỊCH (TRANSACTION FLOW)

### 1.1. Kiến trúc Transaction Service (`lib/tx.ts`)

File `tx.ts` là trung tâm xử lý tất cả các giao dịch blockchain với các lớp bảo vệ và xử lý lỗi:

#### **A. Hàm `sendWithToast()` - Core Transaction Handler**

```typescript
sendWithToast(txPromise, config, toastCallback)
```

**Luồng xử lý:**
1. **Pending State**: Hiển thị toast "pending" ngay khi bắt đầu
2. **Send Transaction**: Gửi transaction qua `txPromise`
3. **Hash Display**: Hiển thị transaction hash trong toast
4. **Wait for Confirmation**: Đợi transaction được confirm (`tx.wait()`)
5. **Success/Error Handling**:
   - Success: Hiển thị toast success với hash
   - Error: Phân tích lỗi và hiển thị message thân thiện
   - User Rejection: Không hiển thị toast (user đã biết họ hủy)

**Xử lý lỗi thông minh:**
- Phát hiện user rejection (code 4001, "denied", "rejected")
- Decode custom errors từ Solidity
- Extract error messages từ nhiều nguồn (reason, shortMessage, data.message)

#### **B. Hàm `approveIfNeeded()` - Token Approval Handler**

**Luồng xử lý:**
1. **Validation**: Kiểm tra token address không phải native ETH
2. **Check Contract Code**: Xác minh token là contract hợp lệ
3. **Check Allowance**: 
   - Lấy current allowance từ contract
   - Xử lý lỗi decode (BAD_DATA) → treat as 0
4. **Conditional Approval**:
   - Nếu `currentAllowance >= amount` → skip approval
   - Nếu không đủ → gọi `sendWithToast()` để approve
5. **Return**: Trả về `TxResult` với flag `isApproval: true`

**Defensive Guards:**
- Kiểm tra contract code trước khi gọi
- Xử lý lỗi decode gracefully
- Log chi tiết cho debugging

---

### 1.2. LUỒNG SUPPLY (LEND) - Chi tiết

#### **Component: `LendModal.tsx`**

**Bước 1: Khởi tạo Modal**
```typescript
useEffect(() => {
  // Load balance, allowance, price
  loadData()
}, [open, signer, provider, token.address])
```

**Bước 2: Load Data (Pre-flight Checks)**
1. **Network Validation**: Kiểm tra chainId đúng với CONFIG
2. **Provider Setup**: Sử dụng direct RPC provider (tránh MetaMask circuit breaker)
3. **Contract Validation**: 
   - Kiểm tra token contract có code
   - Kiểm tra pool contract có code
4. **Fetch Data**:
   - `getTokenBalance()`: Lấy balance từ ERC20 contract
   - `getTokenAllowance()`: Lấy allowance cho LendingPool
   - `getAssetPrice1e18()`: Lấy giá từ PriceOracle

**Bước 3: User Input Validation**
```typescript
handleAmountChange(value) {
  // Chỉ cho phép số và dấu chấm
  if (/^\d*\.?\d*$/.test(value)) {
    setAmount(value)
  }
}
```

**Bước 4: Submit Transaction (`handleLend`)**

**Luồng chi tiết:**
1. **Parse Amount**: 
   ```typescript
   amountBN = parseTokenAmount(amount, token.decimals)
   ```
   - Convert string → BigInt với đúng decimals
   - Validate không overflow

2. **Call `lend()` function** (từ `tx.ts`):
   
   **a. Network & Contract Validation:**
   - Kiểm tra network chainId
   - Tạo RPC provider riêng để validate contracts
   - Kiểm tra pool và token có code
   
   **b. Pre-flight Validation:**
   - Block native ETH (phải wrap thành WETH)
   - Validate amount > 0
   - Fetch reserve data từ contract
   - Log reserve cash, total debt, decimals
   
   **c. Approval Check:**
   ```typescript
   await approveIfNeeded(signer, tokenAddress, LENDING_POOL, amount, toastCallback)
   ```
   - Tự động approve nếu cần
   - Hiển thị toast cho approval transaction
   
   **d. Static Call Simulation:**
   ```typescript
   await poolContract.getFunction("lend").staticCall(tokenAddress, amount)
   ```
   - Simulate transaction trước khi gửi thật
   - Nếu fail → extract error message chi tiết
   - Xử lý overflow errors với message rõ ràng
   
   **e. Send Real Transaction:**
   ```typescript
   const txPromise = poolContract.lend(tokenAddress, amount)
   return await sendWithToast(txPromise, config, toastCallback)
   ```

3. **Post-Transaction:**
   - Reset form
   - Close modal
   - Trigger `onSuccess()` callback để refresh data

**Error Handling trong `lend()`:**
- **Overflow Errors**: Phân tích chi tiết reserveCash, totalSupply
- **Unknown Custom Error**: Decode error data, extract readable message
- **Common Revert Reasons**: Map thành message thân thiện
- **Static Call Errors**: Surface trước khi gửi transaction thật

---

### 1.3. LUỒNG WITHDRAW - Chi tiết

#### **Component: `WithdrawModal.tsx`**

**Bước 1: Load Account Data**
```typescript
useEffect(() => {
  fetchAccountData()
}, [open, provider, signer, poolAddress, token.address])
```

**Data fetched:**
- `getAccountData()`: collateralValue, debtValue, healthFactor
- `userReserves()`: supply principal, index, useAsCollateral
- `reserves()`: ltvBps, liquidationThreshold

**Bước 2: Calculate Max Withdraw (`xMax`)**

**Logic phức tạp:**
```typescript
const xMax = useMemo(() => {
  // Case 1: Không có supply → return 0
  if (userSupplyNum <= 0) return 0
  
  // Case 2: KHÔNG dùng làm collateral → withdraw all
  if (!isCollateral) {
    return Math.min(userSupplyNum, poolLiquidityNum)
  }
  
  // Case 3: Dùng làm collateral → check Health Factor
  // Formula: maxWithdraw = (collateralUSD * LTV - debtUSD) / price
  const maxWithdrawTokens = calculateMaxWithdraw(
    actualCollateralUSD,
    actualDebtUSD,
    userSupplyNum,
    price,
    ltvBps
  )
  
  // Clamp by pool liquidity
  return Math.min(maxWithdrawTokens, poolLiquidityNum)
}, [dependencies])
```

**Bước 3: Submit Transaction (`handleWithdraw`)**

1. **Amount Refinement:**
   ```typescript
   const refinedAmount = await dryRunWithdrawAmount(
     provider, userAddr, token.address, amountBN
   )
   ```
   - Static call để lấy exact amount contract sẽ withdraw
   - Trừ 1 wei để tránh dust rounding

2. **Call `withdraw()` function:**
   
   **a. Static Call Pre-flight:**
   ```typescript
   await poolContract.getFunction("withdraw").staticCall(tokenAddress, amount)
   ```
   - Map errors thành Vietnamese messages
   - "Health factor too low" → "Health Factor sẽ giảm dưới ngưỡng an toàn"
   
   **b. Gas Estimation:**
   ```typescript
   const gas = await poolContract.withdraw.estimateGas(tokenAddress, amount)
   overrides = { gasLimit: (gas * 12) / 10 } // 20% buffer
   ```
   
   **c. Send Transaction:**
   ```typescript
   const txPromise = poolContract.withdraw(tokenAddress, amount, overrides)
   await sendWithToast(txPromise, config)
   ```

3. **Post-Transaction Refresh:**
   ```typescript
   // Wait for next block
   await new Promise(resolve => setTimeout(resolve, 1500))
   
   // Trigger APR refresh
   await triggerAPRRefresh(provider, LENDING_POOL, tokenAddress)
   
   // Clear realtime interest cache
   localStorage.removeItem(`ri:${pool}:${user}:${tokenAddress}:s`)
   ```

**Tại sao cần refresh APR?**
- Sau withdraw, utilization thay đổi
- Interest rates cần update
- UI cần reflect changes ngay lập tức

---

### 1.4. LUỒNG BORROW - Chi tiết

#### **Component: `BorrowModal.tsx`**

**Bước 1: Fetch Account Data**
```typescript
useEffect(() => {
  // Fetch từ contract
  const accountData = await pool.getAccountData(userAddress)
  const fetchedCollateral = parseFloat(ethers.formatEther(accountData.collateralValue1e18))
  const fetchedDebt = parseFloat(ethers.formatEther(accountData.debtValue1e18))
  
  // Calculate max borrowable
  try {
    const maxBorrowAmount = await pool.getMaxBorrowable(userAddress, token.address)
  } catch {
    // Fallback: manual calculation
    const availableCollateral = fetchedCollateral - fetchedDebt
    const maxBorrowTokens = price > 0 ? availableCollateral / price : 0
  }
}, [open, signer, provider, poolAddress, token.address, price])
```

**Bước 2: Calculate Health Factor After**
```typescript
const calculateHFAfter = (borrowAmount: number) => {
  const debtAfterUSD = actualDebt + (borrowAmount * price)
  if (debtAfterUSD === 0) return Number.MAX_SAFE_INTEGER
  return actualCollateral / debtAfterUSD
}
```

**Bước 3: Submit Transaction (`handleBorrow`)**

1. **Call `borrow()` function:**
   
   **a. Pre-flight Validation:**
   ```typescript
   // Block invalid assets
   if (tokenAddress === ZeroAddress) throw Error('Cannot borrow native ETH')
   if (tokenAddress === WETH) throw Error('Cannot borrow WETH')
   
   // Verify contracts
   const poolCode = await provider.getCode(LENDING_POOL)
   const tokenCode = await provider.getCode(tokenAddress)
   ```
   
   **b. Static Call:**
   ```typescript
   await poolContract.getFunction("borrow").staticCall(tokenAddress, amount)
   ```
   - Surface revert reason trước khi gửi
   
   **c. Enhanced Validation:**
   ```typescript
   const reserve = await poolContract.reserves(tokenAddress)
   if (!reserve.isBorrowable) throw Error('Asset not borrowable')
   if (reserveCash <= 0) throw Error('No liquidity')
   if (amount > availableLiquidity) throw Error('Exceeds liquidity')
   
   const accountData = await poolContract.getAccountData(userAddress)
   if (collateralUSD <= 0) throw Error('No collateral')
   if (healthFactor < 1.1) throw Error('Health factor too low')
   ```
   
   **d. Gas Estimation:**
   ```typescript
   const gas = await poolContract.borrow.estimateGas(tokenAddress, amount)
   overrides = { gasLimit: (gas * 12) / 10 } // 20% buffer
   ```
   
   **e. Send Transaction:**
   ```typescript
   const txPromise = poolContract.borrow(tokenAddress, amount, overrides)
   return await sendWithToast(txPromise, config)
   ```

**Error Messages:**
- "not borrowable" → "This asset is not available for borrowing"
- "no liquidity" → "Pool has no liquidity for this asset"
- "exceeds available" → "Amount exceeds available liquidity"
- "No collateral" → "No collateral provided. Please supply assets first"
- "Health factor" → "Health factor too low. Please supply more collateral"

---

### 1.5. LUỒNG REPAY - Chi tiết

#### **Component: `RepayModal.tsx`**

**Bước 1: Load Balance**
```typescript
useEffect(() => {
  const balanceStr = await getTokenBalance(provider, token.address, userAddress, token.decimals)
  setBalance(balanceStr)
}, [open, signer, provider, token.address])
```

**Bước 2: Submit Transaction (`handleRepay`)**

**Đặc biệt: REPAY_ALL Mode**

```typescript
if (amount === 'REPAY_ALL') {
  // 1. Get exact debt from contract
  const userReserve = await poolContract.userReserves(userAddress, token.address)
  const principalRaw1e18 = userReserve.borrow.principal
  
  // 2. Convert từ 1e18 → token decimals (ROUND UP!)
  const conversionFactor = BigInt(10 ** (18 - token.decimals))
  let debtInTokenDecimals = principalRaw1e18 / conversionFactor
  const remainder = principalRaw1e18 % conversionFactor
  if (remainder > 0) {
    debtInTokenDecimals += BigInt(1) // Round up
  }
  
  // 3. Add 20% buffer for interest accrual
  const withBuffer = (debtInTokenDecimals * BigInt(120)) / BigInt(100)
  
  // 4. Cap to user balance
  if (withBuffer > userBalance) {
    amountBN = userBalance
  } else {
    amountBN = withBuffer
  }
}
```

**Tại sao cần buffer?**
- Interest accrues trong lúc transaction pending
- Buffer 20% đảm bảo đủ để repay all
- Contract sẽ chỉ lấy đúng số nợ, refund phần dư

**Bước 3: Call `repay()` function**

1. **Approval:**
   ```typescript
   await approveIfNeeded(signer, tokenAddress, LENDING_POOL, amount)
   ```

2. **Send Transaction:**
   ```typescript
   const txPromise = poolContract.repay(tokenAddress, amount, borrower)
   return await sendWithToast(txPromise, config)
   ```

---

## 2. LUỒNG QUẢN LÝ STATE VÀ DATA

### 2.1. APR Management (`useSharedAPR.ts`)

**Kiến trúc Shared Store:**
```typescript
const store: Map<APRKey, APRData> = new Map()
const listeners: Map<APRKey, Set<() => void>> = new Map()
const timers: Map<APRKey, any> = new Map()
```

**Key Format:** `${poolAddress}-${assetAddress}` (lowercase)

**Luồng Fetch APR:**
1. **Fetch từ Contract:**
   ```typescript
   const r = await pool.reserves(assetAddress)
   const liquidityRatePerSec = Number(r.liquidityRateRayPerSec) / RAY
   const supplyAPR = liquidityRatePerSec * SECONDS_PER_YEAR * 100
   ```

2. **Calculate Utilization:**
   ```typescript
   // CRITICAL: reserveCash stored với 18 decimals (WAD format)
   const reserveCash = Number(ethers.formatUnits(r.reserveCash, 18))
   const totalDebt = Number(ethers.formatUnits(r.totalDebtPrincipal, 18))
   const utilization = (totalDebt / (reserveCash + totalDebt)) * 100
   ```

3. **Polling Strategy:**
   - Default: 30 seconds interval
   - Align to wall clock (tất cả cards refresh cùng lúc)
   - Block polling: Check new blocks, trigger refresh (throttled)

**Manual Refresh:**
```typescript
triggerAPRRefresh(provider, poolAddress, assetAddress)
```
- Force fetch từ contract
- Update store
- Notify all listeners
- Log changes for debugging

**Tại sao cần shared store?**
- Nhiều components cùng fetch APR cho 1 asset
- Tránh duplicate requests
- Consistent data across UI
- Performance optimization

---

### 2.2. Toast Notification System

**Architecture:**
```typescript
ToastProvider (Context)
  └─ Toast[] state
  └─ showToast() function
```

**Flow:**
1. Component gọi `showToast({ type, title, message, hash })`
2. Toast được add vào array với unique ID
3. Toast tự động hide sau `duration` (default 5s)
4. User có thể close manually

**Types:**
- `success`: Green, ✅ icon
- `error`: Red, ❌ icon
- `pending`: Blue, ⏳ icon
- `info`: Gray, ℹ️ icon

**Integration với Transactions:**
- `sendWithToast()` tự động show toasts
- Components có thể pass `toastCallback` để customize
- User rejection không show toast (user đã biết)

---

### 2.3. Error Handling System (`errorHandler.ts`)

**Functions:**
1. **`isUserRejection(error)`**: Detect user cancellation
   - Check code 4001
   - Check message patterns: "rejected", "denied", "cancelled"

2. **`getFriendlyErrorMessage(error)`**: Convert technical errors → user-friendly
   - Extract từ nhiều sources
   - Remove technical prefixes
   - Limit length 200 chars

3. **`shouldShowError(error)`**: Decide if error should be shown
   - Return false cho user rejection

**Error Sources:**
- `error.message`
- `error.shortMessage`
- `error.reason`
- `error.info?.error?.message`
- `error.data?.message`

---

## 3. LUỒNG VALIDATION VÀ PRE-FLIGHT CHECKS

### 3.1. Network Validation

**Mọi transaction đều check:**
```typescript
const network = await provider.getNetwork()
if (network.chainId !== CONFIG.CHAIN_ID) {
  throw Error(`Wallet connected to wrong network`)
}
```

### 3.2. Contract Validation

**Pattern:**
```typescript
const code = await provider.getCode(address)
if (!code || code === '0x') {
  throw Error('Address is not a contract')
}
```

**Applied to:**
- LendingPool address
- Token address
- PriceOracle address

### 3.3. Static Call Simulation

**Pattern:**
```typescript
try {
  await contract.getFunction("method").staticCall(...args)
} catch (err) {
  // Extract error message
  // Map to friendly message
  throw new Error(friendlyMessage)
}
```

**Benefits:**
- Surface revert reasons trước khi gửi transaction
- Tránh waste gas
- Better UX với error messages rõ ràng

### 3.4. Gas Estimation

**Pattern:**
```typescript
try {
  const gas = await contract.method.estimateGas(...args)
  overrides = { gasLimit: (gas * 12) / 10 } // 20% buffer
} catch {
  overrides = { gasLimit: FALLBACK_GAS_LIMIT }
}
```

**Tại sao cần buffer?**
- Gas estimation không chính xác 100%
- Buffer 20% tránh "out of gas" errors
- Fallback cho trường hợp estimate fail

---

## 4. LUỒNG REFRESH DATA SAU TRANSACTION

### 4.1. Component Level Refresh

**Pattern:**
```typescript
const handleLend = async () => {
  await lend(signer, token.address, amountBN)
  
  // Reset form
  setAmount('')
  onClose()
  
  // Trigger refresh
  setTimeout(() => {
    onSuccess?.() // Callback từ parent
  }, 1000)
}
```

### 4.2. APR Refresh

**Trong `withdraw()`:**
```typescript
// Wait for next block
await new Promise(resolve => setTimeout(resolve, 1500))

// Trigger APR refresh
await triggerAPRRefresh(provider, LENDING_POOL, tokenAddress)

// Delayed refresh
setTimeout(() => {
  await triggerAPRRefresh(provider, LENDING_POOL, tokenAddress)
}, 3000)
```

**Tại sao cần delay?**
- Contract state update sau khi block được mine
- Rates cần time để recalculate
- Multiple refreshes đảm bảo UI sync

### 4.3. Cache Clearing

**Realtime Interest Cache:**
```typescript
const supplyKey = `ri:${pool}:${user}:${tokenAddress}:s`
localStorage.removeItem(supplyKey)
```

**Tại sao clear?**
- Tránh hiển thị stale data
- Force refetch từ contract
- Accurate balance display

---

## 5. CÁC ĐIỂM QUAN TRỌNG VÀ BEST PRACTICES

### 5.1. Provider Strategy

**Problem:** MetaMask circuit breaker khi quá nhiều requests

**Solution:**
- **Read operations**: Dùng direct RPC provider
  ```typescript
  const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)
  ```
- **Write operations**: Dùng MetaMask signer
  ```typescript
  const signer = await provider.getSigner()
  ```

**Applied in:**
- `LendModal`: Load balance/allowance với RPC
- `useSharedAPR`: Fetch APR với RPC
- Transactions: Dùng signer từ MetaMask

### 5.2. Decimal Handling

**Critical:** Contract stores amounts với 18 decimals (WAD format)

**Examples:**
- `reserveCash`: uint128, 18 decimals
- `totalDebtPrincipal`: uint128, 18 decimals
- User principal: uint128, 18 decimals

**Conversion:**
```typescript
// From contract (18 decimals) → token decimals
const conversionFactor = BigInt(10 ** (18 - tokenDecimals))
const amountInTokenDecimals = amount1e18 / conversionFactor

// Round up for repay all
if (remainder > 0) {
  amountInTokenDecimals += BigInt(1)
}
```

### 5.3. Amount Validation

**Layers:**
1. **UI Level**: Check parseFloat(amount) > 0
2. **Component Level**: Check amountBN > 0
3. **Transaction Level**: Static call validation
4. **Contract Level**: Revert nếu invalid

**Overflow Protection:**
- Check reasonable limits (1 billion tokens)
- Contract handles uint128 overflow
- Pre-validation logs warnings

### 5.4. Error Message Mapping

**Strategy:**
- Extract từ nhiều sources
- Map technical errors → friendly messages
- Vietnamese messages cho common errors
- Preserve original error cho debugging

**Examples:**
- "Health factor too low" → "Health Factor sẽ giảm dưới ngưỡng an toàn"
- "Insufficient liquidity" → "Thanh khoản pool không đủ"
- "No collateral enabled" → "Bạn chưa bật tài sản làm tài sản thế chấp"

---

## 6. LUỒNG TỔNG THỂ - TỪNG BƯỚC

### 6.1. User muốn Supply tokens

```
1. User mở LendModal
   ↓
2. Component load data:
   - Balance từ ERC20 contract
   - Allowance từ ERC20 contract
   - Price từ PriceOracle
   ↓
3. User nhập amount, click "Supply"
   ↓
4. handleLend():
   a. Parse amount → BigInt
   b. Gọi lend(signer, tokenAddress, amountBN)
   ↓
5. lend() function:
   a. Validate network, contracts
   b. approveIfNeeded() → auto approve nếu cần
   c. Static call để validate
   d. Send transaction qua sendWithToast()
   ↓
6. sendWithToast():
   a. Show pending toast
   b. Send transaction
   c. Show hash trong toast
   d. Wait for confirmation
   e. Show success toast
   ↓
7. Post-transaction:
   a. Reset form
   b. Close modal
   c. Trigger onSuccess() → refresh data
```

### 6.2. User muốn Withdraw tokens

```
1. User mở WithdrawModal
   ↓
2. Component load account data:
   - getAccountData() → collateral, debt, HF
   - userReserves() → supply, useAsCollateral
   - reserves() → ltvBps
   ↓
3. Calculate xMax (max withdraw):
   - Nếu không collateral → min(supply, liquidity)
   - Nếu collateral → calculateMaxWithdraw() với LTV
   ↓
4. User nhập amount, click "Withdraw"
   ↓
5. handleWithdraw():
   a. Refine amount với dryRunWithdrawAmount()
   b. Gọi withdraw(signer, tokenAddress, amountBN)
   ↓
6. withdraw() function:
   a. Static call validation
   b. Gas estimation với buffer
   c. Send transaction
   ↓
7. Post-transaction:
   a. Wait for next block
   b. triggerAPRRefresh() → update rates
   c. Clear interest cache
   d. Refresh UI
```

### 6.3. User muốn Borrow tokens

```
1. User mở BorrowModal
   ↓
2. Component load data:
   - getAccountData() → collateral, debt
   - getMaxBorrowable() hoặc manual calculation
   ↓
3. Calculate max borrow:
   - availableCollateral = collateral - debt
   - maxBorrow = availableCollateral / price
   - Clamp by pool liquidity
   ↓
4. Calculate HF after:
   - debtAfter = debt + borrowAmount * price
   - HF_after = collateral / debtAfter
   - Disable nếu HF_after < 1
   ↓
5. User nhập amount, click "Borrow"
   ↓
6. handleBorrow():
   a. Parse amount
   b. Gọi borrow(signer, tokenAddress, amountBN)
   ↓
7. borrow() function:
   a. Validate asset (không ETH, không WETH)
   b. Validate contracts
   c. Static call
   d. Enhanced validation (isBorrowable, liquidity, HF)
   e. Gas estimation
   f. Send transaction
   ↓
8. Post-transaction:
   a. Refresh data
   b. Update UI
```

---

## 7. CÁC VẤN ĐỀ ĐÃ ĐƯỢC GIẢI QUYẾT

### 7.1. MetaMask Circuit Breaker

**Problem:** Quá nhiều requests → MetaMask block

**Solution:**
- Dùng RPC provider cho read operations
- Polling thay vì event listeners
- Throttle block polling

### 7.2. Unknown Custom Error (-32603)

**Problem:** Generic error code, không biết lý do revert

**Solution:**
- Static call trước khi gửi transaction
- Decode error data từ revert
- Extract readable messages
- Map common errors

### 7.3. APR Không Update Sau Transaction

**Problem:** UI không reflect changes ngay

**Solution:**
- `triggerAPRRefresh()` sau transaction
- Wait for next block
- Multiple refreshes với delay
- Clear cache

### 7.4. Decimal Confusion

**Problem:** Contract dùng 18 decimals, tokens có decimals khác

**Solution:**
- Document rõ: reserveCash = 18 decimals
- Conversion functions với round up
- Logging để debug

### 7.5. Withdraw Calculation Phức Tạp

**Problem:** Max withdraw phụ thuộc nhiều factors

**Solution:**
- `calculateMaxWithdraw()` function
- Check collateral status
- Apply LTV constraints
- Clamp by liquidity

---

## 8. KẾT LUẬN

Dự án LendHub V2 có kiến trúc xử lý transaction rất robust với:

✅ **Defensive Programming**: Nhiều lớp validation
✅ **Error Handling**: User-friendly messages
✅ **State Management**: Shared stores, efficient polling
✅ **UX**: Toast notifications, loading states
✅ **Performance**: RPC provider strategy, caching
✅ **Maintainability**: Clear separation of concerns

**Key Takeaways:**
1. Luôn validate trước khi gửi transaction
2. Dùng static call để surface errors sớm
3. Separate read/write providers
4. Handle decimals carefully
5. Refresh data sau transactions
6. User-friendly error messages

