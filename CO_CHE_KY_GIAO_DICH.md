# 🔐 Cơ Chế Ký Giao Dịch Trong Dự Án LendHub

## 📋 Tổng Quan

Tài liệu này mô tả chi tiết cách ví (MetaMask) ký giao dịch trong dự án LendHub và liệu có tự động ký hay không.

---

## ❌ Kết Luận: Ví CHƯA Tự Ký Giao Dịch

**Trả lời ngắn gọn:** **CHƯA**, ví chưa tự ký giao dịch. User phải **manually approve** mỗi transaction trong MetaMask popup.

---

## 🔄 Flow Hiện Tại: User Phải Approve Manual

### 1. User Click Action (Ví dụ: "Lend")

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
// User click "Lend" button
export async function lend(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // ... validation ...
  
  // ✅ Tạo transaction promise
  const txPromise = poolContract.lend(tokenAddress, amount);
  
  // ✅ Gửi transaction → MetaMask sẽ hiện popup
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  }, toastCallback);
}
```

### 2. MetaMask Hiện Popup Yêu Cầu User Approve

**Khi `signer.sendTransaction()` được gọi:**

```typescript
// ✅ Ethers.js gọi MetaMask
const tx = await signer.sendTransaction({
  to: CONFIG.LENDING_POOL,
  data: encodedData,
  value: 0n,
});

// ⚠️ MetaMask sẽ:
// 1. Hiện popup với transaction details
// 2. User phải click "Confirm" hoặc "Reject"
// 3. Nếu user click "Reject" → Throw error USER_CANCELLED
```

**MetaMask Popup hiển thị:**
```
┌─────────────────────────────────────┐
│  MetaMask Transaction Request       │
├─────────────────────────────────────┤
│  From: 0x1234...5678                │
│  To: 0xabcd...efgh (LendingPool)   │
│  Amount: 0 ETH                      │
│  Gas Limit: 500,000                │
│  Gas Price: 20 Gwei                │
│                                     │
│  [Reject]  [Confirm]               │
└─────────────────────────────────────┘
```

### 3. Code Detect User Rejection

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
export async function sendWithToast(
  txPromise: Promise<ethers.TransactionResponse>,
  config: ToastConfig,
  toastCallback?: ToastCallback
): Promise<TxResult> {
  try {
    // ✅ Gửi transaction → MetaMask popup hiện
    const tx = await txPromise;
    
    // ✅ Nếu user approve → Transaction được ký và gửi
    console.log('📤 Transaction sent:', tx.hash);
    
    // ✅ Wait for confirmation
    const receipt = await tx.wait();
    
    return { hash: tx.hash, receipt };
    
  } catch (error: any) {
    // ✅ Detect user rejection
    const rawMsg = error?.reason || error?.shortMessage || error?.message || '';
    const code = error?.code ?? error?.info?.error?.code;
    
    // ✅ Check nếu user reject
    const isUserRejected = 
      /denied|user denied|ACTION_REJECTED|rejected/i.test(String(rawMsg)) || 
      code === 4001;
    
    if (isUserRejected) {
      // ✅ User đã reject → Throw error
      throw new Error('USER_CANCELLED');
    }
    
    // ... handle other errors ...
  }
}
```

---

## 📊 So Sánh: Manual Approve vs Auto Sign

### ❌ Hiện Tại: Manual Approve (Mỗi Transaction)

**Flow:**
```
1. User click "Lend"
2. Frontend tạo transaction
3. MetaMask popup hiện → User phải click "Confirm"
4. User approve → Transaction được ký và gửi
5. Transaction được confirm trên blockchain
```

**Ưu điểm:**
- ✅ User có control hoàn toàn
- ✅ User có thể review transaction trước khi approve
- ✅ Bảo mật cao (không có auto-approve)

**Nhược điểm:**
- ❌ User phải approve mỗi transaction (không tiện)
- ❌ UX không mượt (phải click nhiều lần)
- ❌ Không thể batch transactions

### ✅ Auto Sign (Nếu Implement)

**Flow (chưa có trong dự án):**
```
1. User approve một lần (grant permission)
2. Frontend có thể tự động ký và gửi transactions
3. Không cần popup mỗi lần
```

**Ưu điểm:**
- ✅ UX mượt hơn (không cần approve mỗi lần)
- ✅ Có thể batch transactions
- ✅ Tự động retry nếu fail

**Nhược điểm:**
- ❌ Rủi ro bảo mật cao hơn
- ❌ User mất control
- ❌ Có thể bị exploit nếu frontend bị compromise

---

## 🔍 Chi Tiết: Cách MetaMask Ký Transaction

### 1. Frontend Gọi sendTransaction

**Code:**
```typescript
const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
const txPromise = poolContract.lend(tokenAddress, amount);
```

**Ethers.js thực hiện:**
```typescript
// ✅ Ethers.js encode function call
const data = poolContract.interface.encodeFunctionData("lend", [tokenAddress, amount]);

// ✅ Tạo transaction object
const tx = {
  to: CONFIG.LENDING_POOL,
  data: data,
  value: 0n,
  gasLimit: 500000n,
  nonce: await provider.getTransactionCount(userAddress),
  chainId: 1337,
};

// ✅ Gọi MetaMask để ký
const signedTx = await signer.sendTransaction(tx);
```

### 2. MetaMask Nhận Request

**MetaMask nhận request qua JSON-RPC:**
```javascript
// ✅ Frontend gửi request đến MetaMask
ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: '0x1234...5678',
    to: '0xabcd...efgh',
    data: '0xa9059cbb...',
    value: '0x0',
    gas: '0x7a120', // 500000
    gasPrice: '0x4a817c800', // 20 Gwei
  }]
});

// ⚠️ MetaMask sẽ:
// 1. Hiện popup với transaction details
// 2. User phải click "Confirm" hoặc "Reject"
// 3. Nếu user click "Confirm" → MetaMask ký transaction
// 4. Nếu user click "Reject" → Throw error với code 4001
```

### 3. MetaMask Ký Transaction (Sau Khi User Approve)

**Sau khi user click "Confirm":**
```javascript
// ✅ MetaMask ký transaction với private key
const privateKey = userPrivateKey; // Stored securely in MetaMask
const txHash = keccak256(RLP.encode([...]));
const signature = secp256k1.sign(txHash, privateKey);

// ✅ Attach signature vào transaction
transaction.r = signature.r;
transaction.s = signature.s;
transaction.v = signature.recovery + 27;

// ✅ Gửi signed transaction đến RPC
await rpc.sendRawTransaction(signedTransaction);
```

### 4. User Rejection Handling

**Nếu user click "Reject":**
```javascript
// ✅ MetaMask throw error
throw {
  code: 4001, // User rejected request
  message: 'User rejected the request',
};

// ✅ Frontend catch error
catch (error) {
  if (error.code === 4001) {
    // ✅ User rejected → Show message
    throw new Error('USER_CANCELLED');
  }
}
```

---

## 🚀 Cách Implement Auto Sign (Nếu Muốn)

### Option 1: MetaMask Permissions API (Chưa được hỗ trợ rộng rãi)

**MetaMask có thể hỗ trợ permissions API trong tương lai:**
```typescript
// ⚠️ Chưa được hỗ trợ rộng rãi
await ethereum.request({
  method: 'wallet_requestPermissions',
  params: [{
    eth_accounts: {
      autoApprove: true, // ✅ Auto approve transactions
    }
  }]
});
```

### Option 2: Session Keys (Phức tạp, cần smart contract)

**Implement session keys để auto sign:**
```solidity
// ✅ Smart contract để quản lý session keys
contract SessionKeyManager {
    mapping(address => mapping(address => bool)) public sessionKeys;
    mapping(address => uint256) public sessionExpiry;
    
    function grantSessionKey(address sessionKey, uint256 expiry) external {
        sessionKeys[msg.sender][sessionKey] = true;
        sessionExpiry[sessionKey] = expiry;
    }
    
    function revokeSessionKey(address sessionKey) external {
        sessionKeys[msg.sender][sessionKey] = false;
    }
}
```

**Frontend:**
```typescript
// ✅ User approve session key một lần
await sessionKeyManager.grantSessionKey(sessionKeyAddress, expiry);

// ✅ Frontend có thể dùng session key để ký transactions
const sessionSigner = new ethers.Wallet(sessionKeyPrivateKey, provider);
const tx = await poolContract.connect(sessionSigner).lend(tokenAddress, amount);
```

**⚠️ Rủi ro:**
- Session key có thể bị compromise
- Cần implement carefully với giới hạn và expiry

### Option 3: Meta-Transactions (Gasless Transactions)

**Implement meta-transactions với relayer:**
```solidity
// ✅ Contract hỗ trợ meta-transactions
contract MetaTransactionReceiver {
    function executeMetaTransaction(
        address user,
        bytes calldata data,
        bytes calldata signature
    ) external {
        // ✅ Verify signature
        bytes32 hash = keccak256(abi.encodePacked(user, data, nonce));
        address signer = ecrecover(hash, signature);
        require(signer == user, "Invalid signature");
        
        // ✅ Execute transaction
        (bool success, ) = address(this).call(data);
        require(success, "Execution failed");
    }
}
```

**Frontend:**
```typescript
// ✅ User ký message (không phải transaction)
const message = keccak256(abi.encodePacked(userAddress, data, nonce));
const signature = await signer.signMessage(message);

// ✅ Relayer gửi transaction thay user
await relayer.executeMetaTransaction(userAddress, data, signature);
```

**⚠️ Rủi ro:**
- Cần trust relayer
- Relayer phải trả gas fee
- Phức tạp hơn

---

## 📊 Tóm Tắt

### ✅ **Hiện Tại:**

| Aspect | Status |
|--------|--------|
| Auto Sign | ❌ **CHƯA** |
| Manual Approve | ✅ **CÓ** (Mỗi transaction) |
| User Control | ✅ **CAO** (User phải approve mỗi lần) |
| Security | ✅ **CAO** (Không có auto-approve) |
| UX | ⚠️ **TRUNG BÌNH** (Phải click nhiều lần) |

### 🎯 **Kết Luận:**

**Dự án của bạn:**
- ✅ **Ví CHƯA tự ký giao dịch**
- ✅ **User phải manually approve mỗi transaction**
- ✅ **Đây là cách an toàn và chuẩn trong DeFi**

**Nếu muốn implement auto sign:**
- ⚠️ Cần cân nhắc rủi ro bảo mật
- ⚠️ Cần implement session keys hoặc meta-transactions
- ⚠️ Không khuyến nghị cho production (trừ khi có use case cụ thể)

---

## 💡 Khuyến Nghị

### ✅ **Nên Giữ Nguyên:**

1. **Manual approve mỗi transaction** → Bảo mật cao
2. **User có control hoàn toàn** → Tránh exploit
3. **Standard DeFi pattern** → User quen thuộc

### ⚠️ **Nếu Muốn Cải Thiện UX:**

1. **Batch Approvals:**
   - User approve một lần với amount lớn
   - Có thể dùng nhiều transactions mà không cần approve lại

2. **Transaction Preview:**
   - Hiển thị transaction details trước khi gửi
   - User có thể review trước khi approve

3. **Gas Optimization:**
   - Estimate gas chính xác
   - Suggest optimal gas price

---

## 🔒 Security Best Practices

### ✅ **Đã Implement:**

1. ✅ User phải approve mỗi transaction
2. ✅ Detect user rejection
3. ✅ Validate transaction parameters trước khi gửi
4. ✅ Error handling tốt

### ⚠️ **Nên Thêm:**

1. ⚠️ Transaction preview với details đầy đủ
2. ⚠️ Warning cho high-value transactions
3. ⚠️ Rate limiting để tránh spam
4. ⚠️ Transaction history tracking

---

## 📝 Code Examples

### ✅ **Hiện Tại (Manual Approve):**

```typescript
// ✅ User phải approve mỗi transaction
const tx = await poolContract.lend(tokenAddress, amount);
// MetaMask popup hiện → User click "Confirm"
await tx.wait();
```

### ⚠️ **Nếu Muốn Auto Sign (Không Khuyến Nghị):**

```typescript
// ⚠️ Session key approach (phức tạp, rủi ro cao)
const sessionKey = await grantSessionKey();
const sessionSigner = new ethers.Wallet(sessionKey, provider);
const tx = await poolContract.connect(sessionSigner).lend(tokenAddress, amount);
// Không cần popup → Auto sign
```

---

## 🎯 Kết Luận Cuối Cùng

**Câu trả lời:** **CHƯA**, ví chưa tự ký giao dịch. User phải manually approve mỗi transaction trong MetaMask popup.

**Đây là cách đúng và an toàn** cho DeFi applications. Không nên implement auto sign trừ khi có use case cụ thể và đã cân nhắc rủi ro bảo mật.





