# 🔐 Code Ký Giao Dịch Trong Dự Án

## 📋 Tổng Quan

Dự án sử dụng **ethers.js v6** để ký giao dịch. Có 2 cách chính để ký giao dịch:

1. **Contract Method Calls** - Tự động ký khi gọi hàm contract
2. **Direct sendTransaction** - Gửi transaction thô

---

## 🔑 1. Khởi Tạo Signer

### File: `lendhub-frontend-nextjs/src/context/LendState.js`

```javascript
// Lấy provider từ MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);

// Lấy signer từ provider
const signer = await provider.getSigner();
```

**Giải thích:**
- `BrowserProvider` là wrapper của `window.ethereum` (MetaMask)
- `getSigner()` trả về signer object đại diện cho account hiện tại trong MetaMask
- Signer này sẽ tự động ký mọi transaction được gửi qua nó

---

## 📝 2. Cách 1: Contract Method Calls (Tự Động Ký)

### File: `lendhub-frontend-nextjs/src/lib/tx.ts`

#### 2.1. Hàm `lend()` - Supply Tokens

```typescript
export async function lend(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ✅ Tạo contract instance với signer
  const poolContract = new ethers.Contract(
    CONFIG.LENDING_POOL, 
    POOL_ABI, 
    signer  // ← Signer được truyền vào đây
  );
  
  // ✅ Gọi hàm contract → TỰ ĐỘNG KÝ
  const txPromise = poolContract.lend(tokenAddress, amount);
  // ↑ Khi gọi hàm này, ethers.js sẽ:
  //   1. Encode function call (lend(address, uint256))
  //   2. Tạo transaction object
  //   3. Gọi signer.signTransaction() → MetaMask popup
  //   4. Trả về TransactionResponse với hash
  
  // ✅ Gửi transaction đã ký
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  }, toastCallback);
}
```

**Flow ký giao dịch:**

```
1. User click "Lend" button
   ↓
2. Frontend gọi: poolContract.lend(tokenAddress, amount)
   ↓
3. ethers.js encode function call:
   - Function: lend(address, uint256)
   - Parameters: [tokenAddress, amount]
   - Data: 0x... (encoded)
   ↓
4. ethers.js tạo transaction object:
   {
     to: CONFIG.LENDING_POOL,
     data: 0x... (encoded function call),
     value: 0,
     gasLimit: ...,
     gasPrice: ...,
     nonce: ...,
     chainId: ...
   }
   ↓
5. ethers.js gọi signer.signTransaction(tx)
   ↓
6. MetaMask popup hiện lên:
   - Hiển thị transaction details
   - User approve/reject
   ↓
7. Nếu user approve:
   - MetaMask ký transaction với private key
   - Trả về signed transaction
   ↓
8. ethers.js gửi signed transaction đến RPC
   ↓
9. RPC broadcast transaction lên blockchain
   ↓
10. Trả về TransactionResponse với hash
```

#### 2.2. Hàm `borrow()` - Borrow Tokens

```typescript
export async function borrow(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ✅ Tạo contract instance với signer
  const poolContract = new ethers.Contract(
    CONFIG.LENDING_POOL, 
    POOL_ABI, 
    signer
  );
  
  // ✅ Gọi hàm contract → TỰ ĐỘNG KÝ
  const txPromise = poolContract.borrow(tokenAddress, amount, overrides);
  
  return await sendWithToast(txPromise, {
    pending: 'Borrowing tokens...',
    success: 'Tokens borrowed successfully!',
    error: 'Borrow failed'
  }, toastCallback);
}
```

#### 2.3. Hàm `repay()` - Repay Debt

```typescript
export async function repay(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  userAddress?: string
): Promise<TxResult> {
  // ✅ Tạo contract instance với signer
  const poolContract = new ethers.Contract(
    CONFIG.LENDING_POOL, 
    POOL_ABI, 
    signer
  );
  
  // ✅ Approve token trước (nếu cần)
  await approveIfNeeded(signer, tokenAddress, CONFIG.LENDING_POOL, amount);
  
  // ✅ Gọi hàm contract → TỰ ĐỘNG KÝ
  const txPromise = poolContract.repay(tokenAddress, amount, borrower);
  
  return await sendWithToast(txPromise, {
    pending: 'Repaying tokens...',
    success: 'Tokens repaid successfully!',
    error: 'Repay failed'
  });
}
```

#### 2.4. Hàm `withdraw()` - Withdraw Tokens

```typescript
export async function withdraw(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
): Promise<TxResult> {
  // ✅ Tạo contract instance với signer
  const poolContract = new ethers.Contract(
    CONFIG.LENDING_POOL, 
    POOL_ABI, 
    signer
  );
  
  // ✅ Gọi hàm contract → TỰ ĐỘNG KÝ
  const txPromise = poolContract.withdraw(tokenAddress, amount, overrides);
  
  return await sendWithToast(txPromise, {
    pending: 'Withdrawing tokens...',
    success: 'Tokens withdrawn successfully!',
    error: 'Withdraw failed'
  });
}
```

#### 2.5. Hàm `approveIfNeeded()` - Approve Token

```typescript
export async function approveIfNeeded(
  signer: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ✅ Tạo token contract instance với signer
  const tokenContract = new ethers.Contract(
    tokenAddress, 
    ERC20_ABI, 
    signer
  );
  
  // ✅ Gọi hàm approve → TỰ ĐỘNG KÝ
  const txPromise = tokenContract.approve(spender, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Approving token...',
    success: 'Token approved successfully!',
    error: 'Approval failed'
  }, toastCallback);
}
```

---

## 📝 3. Cách 2: Direct sendTransaction (Gửi Transaction Thô)

### File: `lendhub-frontend-nextjs/src/components/WrapEthModal.tsx`

#### 3.1. Wrap ETH to WETH

```typescript
// ✅ Lấy signer
const signer = await provider.getSigner();

// ✅ Tạo transaction object thủ công
const tx = {
  to: CONFIG.WETH,
  value: amountWei,  // Amount ETH to wrap
  data: '0xd0e30db0'  // deposit() function selector
};

console.log('📋 Transaction object:', tx);

// ✅ Gửi transaction → TỰ ĐỘNG KÝ
const txResponse = await signer.sendTransaction(tx);
// ↑ Khi gọi này, ethers.js sẽ:
//   1. Tạo transaction object với các field trên
//   2. Thêm nonce, gasLimit, gasPrice, chainId
//   3. Gọi signer.signTransaction() → MetaMask popup
//   4. Gửi signed transaction đến RPC
//   5. Trả về TransactionResponse với hash

setTxHash(txResponse.hash);

// ✅ Đợi confirmation
const receipt = await txResponse.wait();
```

**Giải thích:**
- `sendTransaction()` tự động:
  - Lấy nonce từ provider
  - Estimate gas (nếu không có gasLimit)
  - Lấy gas price từ provider
  - Thêm chainId (EIP-155)
  - Ký transaction với MetaMask
  - Gửi đến RPC

### File: `lendhub-frontend-nextjs/src/context/LendState.js`

#### 3.2. Wrap ETH (Cách khác)

```javascript
const wrapEth = useCallback(async (amountEth) => {
  if (!metamaskDetails.signer) {
    throw new Error("No signer available");
  }

  try {
    // ✅ Tạo transaction object
    const data = '0xd0e30db0'; // deposit() function selector
    const tx = await metamaskDetails.signer.sendTransaction({
      to: WETHAddress,
      value: ethers.parseEther(amountEth),
      data
    });
    
    // ✅ Đợi confirmation
    await tx.wait();
    
    return { 
      status: 200, 
      message: "Transaction Successful...", 
      hash: tx.hash 
    };
  } catch (error) {
    reportError(error);
    return { status: 500, message: error.message || error.reason };
  }
}, [metamaskDetails.signer]);
```

---

## 🔍 4. Chi Tiết Quá Trình Ký

### 4.1. Khi Gọi Contract Method

```typescript
// Step 1: Tạo contract instance
const poolContract = new ethers.Contract(
  CONFIG.LENDING_POOL,  // Contract address
  POOL_ABI,              // Contract ABI
  signer                 // Signer (có private key)
);

// Step 2: Gọi hàm contract
const txPromise = poolContract.lend(tokenAddress, amount);

// Step 3: Bên trong ethers.js (tự động):
//   a. Encode function call:
//      - Function selector: keccak256("lend(address,uint256)")[:4]
//      - Encode parameters: ABI encode [tokenAddress, amount]
//      - Data: selector + encoded params
//
//   b. Tạo transaction object:
//      {
//        to: CONFIG.LENDING_POOL,
//        data: "0x..." (encoded function call),
//        value: 0,
//        nonce: await provider.getTransactionCount(signer.address),
//        gasLimit: await provider.estimateGas({...}),
//        gasPrice: await provider.getFeeData(),
//        chainId: await provider.getNetwork().chainId
//      }
//
//   c. Ký transaction:
//      - RLP encode transaction
//      - Hash transaction (keccak256)
//      - Sign hash với ECDSA (secp256k1)
//      - Thêm signature (r, s, v) vào transaction
//
//   d. Gửi signed transaction đến RPC:
//      - eth_sendRawTransaction(signedTx)
//
//   e. Trả về TransactionResponse:
//      {
//        hash: "0x...",
//        from: signer.address,
//        to: CONFIG.LENDING_POOL,
//        ...
//      }
```

### 4.2. Khi Gọi sendTransaction

```typescript
// Step 1: Tạo transaction object
const tx = {
  to: CONFIG.WETH,
  value: amountWei,
  data: '0xd0e30db0'
};

// Step 2: Gửi transaction
const txResponse = await signer.sendTransaction(tx);

// Step 3: Bên trong ethers.js (tự động):
//   a. Bổ sung các field còn thiếu:
//      - nonce: await provider.getTransactionCount(signer.address)
//      - gasLimit: await provider.estimateGas(tx) (nếu không có)
//      - gasPrice: await provider.getFeeData() (nếu không có)
//      - chainId: await provider.getNetwork().chainId
//
//   b. Ký transaction:
//      - RLP encode transaction
//      - Hash transaction (keccak256)
//      - Sign hash với ECDSA (secp256k1)
//      - Thêm signature (r, s, v) vào transaction
//
//   c. Gửi signed transaction đến RPC:
//      - eth_sendRawTransaction(signedTx)
//
//   d. Trả về TransactionResponse
```

---

## 🔐 5. Signature Format (ECDSA)

### 5.1. ECDSA Signature Components

Khi MetaMask ký transaction, nó tạo signature với format:

```typescript
// Signature components:
{
  r: "0x..." (32 bytes, hex),
  s: "0x..." (32 bytes, hex),
  v: 27 | 28 | 0 | 1  // Recovery ID
}

// EIP-155 (chainId protection):
v = chainId * 2 + 35 + recoveryId
// Ví dụ: chainId = 1337, recoveryId = 0
// v = 1337 * 2 + 35 + 0 = 2709
```

### 5.2. Transaction Hash Calculation

```typescript
// Transaction hash được tính từ:
// 1. RLP encode transaction (bao gồm signature)
// 2. Keccak256 hash của RLP encoded data

const txHash = keccak256(rlpEncode({
  nonce,
  gasPrice,
  gasLimit,
  to,
  value,
  data,
  v,  // Signature v (với chainId)
  r,  // Signature r
  s   // Signature s
}));
```

---

## 📊 6. So Sánh 2 Cách

| Tiêu Chí | Contract Method Calls | Direct sendTransaction |
|----------|----------------------|------------------------|
| **Độ phức tạp** | Thấp (tự động encode) | Cao (phải encode thủ công) |
| **Type safety** | Có (TypeScript types) | Không (phải tự validate) |
| **Error handling** | Tốt (decode revert reason) | Kém (generic errors) |
| **Use case** | Gọi hàm contract | Gửi ETH, gọi hàm đơn giản |
| **Ví dụ** | `poolContract.lend(...)` | `signer.sendTransaction({...})` |

---

## 🎯 7. Ví Dụ Đầy Đủ: Flow Ký Giao Dịch

### Scenario: User Supply 100 USDC

```typescript
// 1. User click "Supply" button với 100 USDC
// 2. Frontend gọi:
const result = await lend(signer, USDC_ADDRESS, parseUnits("100", 6));

// 3. Bên trong hàm lend():
//    a. Tạo contract instance:
const poolContract = new ethers.Contract(
  CONFIG.LENDING_POOL,
  POOL_ABI,
  signer
);

//    b. Check và approve token:
await approveIfNeeded(signer, USDC_ADDRESS, CONFIG.LENDING_POOL, amount);
//       → Gọi tokenContract.approve(...)
//       → MetaMask popup #1: Approve USDC
//       → User approve
//       → Transaction #1 được ký và gửi

//    c. Gọi hàm lend:
const txPromise = poolContract.lend(USDC_ADDRESS, amount);
//       → ethers.js encode: lend(address, uint256)
//       → Tạo transaction object
//       → MetaMask popup #2: Supply 100 USDC
//       → User approve
//       → Transaction #2 được ký và gửi

// 4. Đợi confirmation:
const receipt = await txPromise.wait();
//    → Transaction được mine vào block
//    → Receipt có status = 1 (success)

// 5. Return result:
return {
  hash: tx.hash,
  receipt: receipt
};
```

---

## 🔒 8. Security Considerations

### 8.1. ChainId Protection (EIP-155)

```typescript
// ✅ ethers.js tự động thêm chainId vào transaction
// ✅ Ngăn replay attack cross-chain

// Ví dụ:
// - Transaction trên chainId 1337 không thể replay trên chainId 1
// - v = chainId * 2 + 35 + recoveryId
```

### 8.2. Nonce Management

```typescript
// ✅ ethers.js tự động lấy nonce từ provider
// ✅ Đảm bảo nonce tăng dần, không duplicate

const nonce = await provider.getTransactionCount(signer.address);
```

### 8.3. Gas Estimation

```typescript
// ✅ ethers.js tự động estimate gas nếu không có gasLimit
// ✅ Tránh transaction bị revert do out of gas

const gasLimit = await provider.estimateGas(tx);
```

### 8.4. User Approval

```typescript
// ✅ Mọi transaction đều cần user approve qua MetaMask
// ✅ User có thể reject transaction
// ✅ Frontend detect rejection:

const isUserRejected = 
  /denied|user denied|ACTION_REJECTED|rejected/i.test(error.message) || 
  error.code === 4001;
```

---

## 📝 9. Code Examples Từ Dự Án

### 9.1. Supply Tokens (lend.ts)

```typescript
// File: lendhub-frontend-nextjs/src/lib/tx.ts

export async function lend(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ✅ Tạo contract với signer
  const poolContract = new ethers.Contract(
    CONFIG.LENDING_POOL, 
    POOL_ABI, 
    signer
  );
  
  // ✅ Approve token trước
  await approveIfNeeded(signer, tokenAddress, CONFIG.LENDING_POOL, amount);
  
  // ✅ Gọi hàm contract → TỰ ĐỘNG KÝ
  const txPromise = poolContract.lend(tokenAddress, amount);
  
  // ✅ Gửi và đợi confirmation
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  }, toastCallback);
}
```

### 9.2. Wrap ETH (WrapEthModal.tsx)

```typescript
// File: lendhub-frontend-nextjs/src/components/WrapEthModal.tsx

const handleWrap = async () => {
  const signer = await provider.getSigner();
  
  // ✅ Tạo transaction object
  const tx = {
    to: CONFIG.WETH,
    value: amountWei,
    data: '0xd0e30db0' // deposit() function selector
  };
  
  // ✅ Gửi transaction → TỰ ĐỘNG KÝ
  const txResponse = await signer.sendTransaction(tx);
  setTxHash(txResponse.hash);
  
  // ✅ Đợi confirmation
  const receipt = await txResponse.wait();
};
```

### 9.3. Approve Token (tx.ts)

```typescript
// File: lendhub-frontend-nextjs/src/lib/tx.ts

export async function approveIfNeeded(
  signer: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ✅ Tạo token contract với signer
  const tokenContract = new ethers.Contract(
    tokenAddress, 
    ERC20_ABI, 
    signer
  );
  
  // ✅ Check current allowance
  const currentAllowance = await tokenContract.allowance(
    await signer.getAddress(), 
    spender
  );
  
  if (currentAllowance >= amount) {
    return null; // Đã approve đủ
  }
  
  // ✅ Gọi hàm approve → TỰ ĐỘNG KÝ
  const txPromise = tokenContract.approve(spender, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Approving token...',
    success: 'Token approved successfully!',
    error: 'Approval failed'
  }, toastCallback);
}
```

---

## 🎓 10. Tóm Tắt

### ✅ **Cách Ký Giao Dịch:**

1. **Contract Method Calls:**
   ```typescript
   const contract = new ethers.Contract(address, abi, signer);
   const tx = await contract.functionName(...args);
   // ↑ Tự động ký và gửi
   ```

2. **Direct sendTransaction:**
   ```typescript
   const tx = await signer.sendTransaction({
     to: address,
     value: amount,
     data: encodedData
   });
   // ↑ Tự động ký và gửi
   ```

### ✅ **Quá Trình Ký:**

1. Tạo transaction object (nonce, gas, chainId, ...)
2. RLP encode transaction
3. Hash transaction (keccak256)
4. Sign hash với ECDSA (MetaMask)
5. Thêm signature vào transaction
6. Gửi signed transaction đến RPC

### ✅ **Security:**

- ✅ EIP-155 chainId protection
- ✅ Nonce management tự động
- ✅ Gas estimation tự động
- ✅ User approval required (MetaMask popup)
- ✅ Error handling cho user rejection

---

## 📚 References

- [ethers.js Documentation - Signers](https://docs.ethers.org/v6/api/wallet/)
- [EIP-155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155)
- [ECDSA Signature Format](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)


