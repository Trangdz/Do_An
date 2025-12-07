# Quá Trình Xác Minh Transaction - Ví Dụ Chi Tiết

## 📋 Tổng Quan

Tài liệu này mô tả **chi tiết từng bước** quá trình ký và xác minh transaction, kèm **ví dụ cụ thể** với số liệu thực tế.

## 🎯 Ví Dụ: User Lend 100 DAI

### **Thông Tin Transaction:**

```
User: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Action: Lend 100 DAI
Token: 0x6B175474E89094C44Da98b954EedeAC495271d0F (DAI)
Amount: 100 DAI = 100 * 10^18 = 100000000000000000000 wei
LendingPool: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 📝 Bước 1: User Click "Lend" Button

### **Frontend Code:**

```typescript
// components/LendModal.tsx
const handleLend = async () => {
  const amount = parseUnits("100", 18); // 100 DAI = 100000000000000000000
  await lend(signer, tokenAddress, amount);
};
```

### **Transaction Function:**

```typescript
// lib/tx.ts
export async function lend(signer, tokenAddress, amount) {
  const poolContract = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3", // LendingPool
    POOL_ABI,
    signer
  );
  
  // Gọi function → MetaMask sẽ ký transaction
  const txPromise = poolContract.lend(
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI address
    BigInt("100000000000000000000") // 100 DAI
  );
  
  return await sendWithToast(txPromise, {...});
}
```

## 🔐 Bước 2: MetaMask Tạo Transaction Object

### **Transaction Object (Trước Khi Ký):**

```json
{
  "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "value": "0x0",
  "data": "0x6171d1c9100000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000056bc75e2d63100000",
  "gasLimit": "0x7a120",
  "gasPrice": "0x4a817c800",
  "nonce": "0x5",
  "chainId": "0x539"
}
```

### **Giải Thích:**

- **from**: Địa chỉ user (sẽ được verify từ signature)
- **to**: LendingPool contract address
- **value**: 0 (không gửi ETH, chỉ gọi function)
- **data**: Function call data
  - `0x6171d1c9` = function selector cho `lend(address,uint256)`
  - `0x6b175474e89094c44da98b954eedeac495271d0f` = DAI address (32 bytes, padded)
  - `0x56bc75e2d63100000` = 100 DAI in wei (32 bytes, padded)
- **gasLimit**: 500,000 gas
- **gasPrice**: 20 Gwei = 20,000,000,000 wei
- **nonce**: 5 (số transaction thứ 5 của user)
- **chainId**: 1337 (Ganache local network)

## 🔑 Bước 3: MetaMask Hash Transaction

### **RLP Encoding:**

```
Transaction được encode bằng RLP (Recursive Length Prefix):
rlp([nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0])
```

### **Hash Transaction:**

```javascript
// Pseudo-code (MetaMask làm điều này):
const txHash = keccak256(rlpEncode({
  nonce: "0x5",
  gasPrice: "0x4a817c800",
  gasLimit: "0x7a120",
  to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  value: "0x0",
  data: "0x6171d1c9...",
  chainId: "0x539"
}));

// Kết quả:
txHash = "0x8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b2c2d2e2f"
```

**Ví dụ thực tế:**
```
Input: RLP encoded transaction
Output: 0x8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b2c2d2e2f
```

## ✍️ Bước 4: MetaMask Ký Transaction (ECDSA)

### **ECDSA Signing Process:**

```javascript
// Pseudo-code (MetaMask làm điều này):
function ecdsaSign(txHash, privateKey) {
  // 1. Tạo random k (nonce)
  const k = generateRandomK();
  
  // 2. Tính điểm trên elliptic curve
  const point = k * G; // G là generator point
  const (x, y) = point;
  
  // 3. Tính r
  const r = x mod n; // n là order của curve
  
  // 4. Tính s
  const s = k^(-1) * (txHash + r * privateKey) mod n;
  
  // 5. Tính v (recovery id)
  const v = calculateRecoveryId(x, y);
  
  return { r, s, v };
}
```

### **Ví Dụ Cụ Thể:**

```
Input:
  txHash: 0x8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b2c2d2e2f
  privateKey: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

Output:
  r: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
  s: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
  v: 0x1b (27)
```

### **Signed Transaction Object:**

```json
{
  "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "value": "0x0",
  "data": "0x6171d1c9...",
  "gasLimit": "0x7a120",
  "gasPrice": "0x4a817c800",
  "nonce": "0x5",
  "chainId": "0x539",
  "r": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "s": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "v": "0x1b"
}
```

## 📤 Bước 5: Gửi Transaction Đến RPC

### **MetaMask Gửi:**

```javascript
// MetaMask gửi signed transaction đến RPC node
const response = await fetch("http://127.0.0.1:7545", {
  method: "POST",
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_sendRawTransaction",
    params: [
      "0xf86c058504a817c800827a1200945fbdb2315678afecb367f032d93f642f64180aa380a46171d1c9100000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000056bc75e2d631000001ba01234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefa0abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    ],
    id: 1
  })
});
```

### **RPC Node Nhận:**

```
RPC Node nhận signed transaction
  ↓
Kiểm tra format
  ↓
Thêm vào mempool (chờ được mine)
```

## ⛏️ Bước 6: Miner Verify Signature

### **Verification Process:**

```javascript
// Pseudo-code (EVM làm điều này):
function verifyTransaction(signedTx) {
  // 1. Extract signature
  const { r, s, v } = signedTx.signature;
  
  // 2. Recreate transaction hash (không có signature)
  const txHash = keccak256(rlpEncode({
    nonce: signedTx.nonce,
    gasPrice: signedTx.gasPrice,
    gasLimit: signedTx.gasLimit,
    to: signedTx.to,
    value: signedTx.value,
    data: signedTx.data,
    chainId: signedTx.chainId
  }));
  
  // 3. Recover public key từ signature
  const publicKey = ecrecover(txHash, v, r, s);
  
  // 4. Derive address từ public key
  const address = keccak256(publicKey).slice(12, 32);
  
  // 5. Verify
  if (address === signedTx.from) {
    return true; // ✅ Signature hợp lệ
  } else {
    return false; // ❌ Signature không hợp lệ
  }
}
```

### **Ví Dụ Cụ Thể:**

```
Input:
  txHash: 0x8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b2c2d2e2f
  r: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
  s: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
  v: 0x1b

Process:
  1. ecrecover(txHash, v, r, s)
     → publicKey: 0x04a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
  
  2. keccak256(publicKey)
     → hash: 0x...742d35cc6634c0532925a3b844bc9e7595f0beb...
  
  3. address = hash[12:32]
     → 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  
  4. Verify:
     address === signedTx.from
     → 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb === 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
     → ✅ TRUE (Signature hợp lệ)
```

## ✅ Bước 7: Execute Transaction

### **Sau Khi Signature Được Verify:**

```solidity
// contracts/core/LendingPool.sol
function lend(address token, uint256 amount) external nonReentrant {
    // ✅ msg.sender = 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb (đã được verify)
    
    require(amount > 0, "Invalid amount");
    // ✅ amount = 100000000000000000000 (100 DAI) > 0
    
    _requireInited(token);
    // ✅ token = 0x6B175474E89094C44Da98b954EedeAC495271d0F (DAI) đã được init
    
    // Transfer tokens từ user đến contract
    IERC20(token).safeTransferFrom(
        msg.sender, // 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb (đã verify)
        address(this), // LendingPool
        100000000000000000000 // 100 DAI
    );
    
    // Update state
    _updateReserve(token);
    _updateUserSupply(token, msg.sender, 100000000000000000000);
}
```

### **State Changes:**

```
Before:
  userReserves[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb][DAI].supply.principal = 0
  reserves[DAI].reserveCash = 5000000000000000000000 (5000 DAI)

After:
  userReserves[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb][DAI].supply.principal = 100000000000000000000 (100 DAI)
  reserves[DAI].reserveCash = 5100000000000000000000 (5100 DAI)
```

## 🔍 Ví Dụ: Nếu Signature Không Hợp Lệ

### **Scenario: Attacker Cố Gắng Giả Mạo**

```javascript
// Attacker cố gắng tạo transaction với signature giả:
const fakeTx = {
  from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  data: "0x6171d1c9...",
  r: "0x0000000000000000000000000000000000000000000000000000000000000000", // Fake
  s: "0x0000000000000000000000000000000000000000000000000000000000000000", // Fake
  v: "0x1b"
};

// Verification:
const txHash = keccak256(rlpEncode(fakeTx));
const publicKey = ecrecover(txHash, fakeTx.v, fakeTx.r, fakeTx.s);
const address = keccak256(publicKey).slice(12, 32);

// Result:
address = 0x0000000000000000000000000000000000000000 // Invalid address
address !== fakeTx.from
→ ❌ FALSE (Signature không hợp lệ)
→ Transaction bị REJECT
```

## 📊 Diagram Luồng Xác Minh

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Click "Lend"                                         │
│    Frontend: poolContract.lend(token, amount)                │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MetaMask Tạo Transaction Object                           │
│    {                                                         │
│      from: "0x742d35...",                                   │
│      to: "0x5FbDB2...",                                     │
│      data: "0x6171d1c9...",                                │
│      nonce: 5,                                              │
│      chainId: 1337                                           │
│    }                                                         │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. MetaMask Hash Transaction                                 │
│    txHash = keccak256(rlpEncode(tx))                       │
│    → 0x8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e0f...           │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. MetaMask Ký Transaction (ECDSA)                          │
│    signature = ecdsaSign(txHash, privateKey)                 │
│    → { r, s, v }                                            │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Gửi Signed Transaction Đến RPC                            │
│    eth_sendRawTransaction(signedTx)                          │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Miner Verify Signature                                   │
│    publicKey = ecrecover(txHash, v, r, s)                  │
│    address = keccak256(publicKey)[12:32]                    │
│    if (address === tx.from) ✅                              │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Execute Transaction                                      │
│    LendingPool.lend(token, amount)                          │
│    msg.sender = verified address                            │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Tóm Tắt

### **Quá Trình:**

1. ✅ **User ký transaction** → MetaMask tạo signature (ECDSA)
2. ✅ **Gửi signed transaction** → RPC node nhận
3. ✅ **Miner verify signature** → ecrecover để recover address
4. ✅ **So sánh address** → address === tx.from
5. ✅ **Execute transaction** → Smart contract nhận msg.sender đã verify

### **Bảo Vệ:**

- ✅ **ECDSA cryptography** → Không thể giả mạo signature
- ✅ **Hash function** → Transaction không thể thay đổi
- ✅ **EVM verification** → Mọi transaction đều được verify
- ✅ **Smart contract validation** → Additional checks

### **Ví Dụ:**

- User: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Action: Lend 100 DAI
- Signature: `{ r, s, v }`
- Verification: `ecrecover` → address match → ✅ Valid

**Tóm lại: Quá trình xác minh đảm bảo chỉ người có private key mới có thể tạo transaction hợp lệ, và mọi transaction đều được verify trước khi execute.**





