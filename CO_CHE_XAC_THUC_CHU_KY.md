# 🔐 Cơ Chế Xác Thực Chữ Ký Trong Dự Án LendHub

## 📋 Tổng Quan

Tài liệu này mô tả chi tiết cơ chế ký và xác thực chữ ký trong dự án LendHub, từ frontend (MetaMask) đến blockchain (Ethereum/EVM).

---

## 🔄 Flow Tổng Quan: Từ Ký Đến Xác Thực

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: User Click "Lend"                                  │
│    → Frontend tạo transaction object                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: Gọi signer.sendTransaction()                       │
│    → ethers.js tạo RLP-encoded transaction                     │
│    → Hash transaction: keccak256(RLP(tx))                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. METAMASK: Ký Transaction                                     │
│    → Hash transaction → ECDSA signature                        │
│    → Signature = (r, s, v)                                     │
│    → Attach signature vào transaction                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. METAMASK: Gửi Transaction Đã Ký Đến RPC                     │
│    → Transaction bao gồm: data + signature                     │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. RPC: Broadcast Transaction Lên Blockchain                   │
│    → Transaction được đưa vào mempool                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. BLOCKCHAIN: Miner/Validator Xác Thực                        │
│    → Extract signature từ transaction                         │
│    → Recover public key từ signature                           │
│    → Verify public key match với from address                  │
│    → Execute transaction nếu valid                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Phần 1: Frontend - Tạo và Ký Transaction

### 1.1. Tạo Transaction Object

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
// User click "Lend" → Frontend tạo transaction
const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);

// ✅ Transaction object được tạo bởi ethers.js
const txPromise = poolContract.lend(tokenAddress, amount);
```

**Transaction object bao gồm:**
```typescript
{
  to: "0x...",           // Contract address
  data: "0x...",         // Encoded function call (ABI encoding)
  value: 0n,             // ETH amount (0 for token operations)
  gasLimit: 500000n,     // Gas limit
  gasPrice: 20000000000n, // Gas price (optional in EIP-1559)
  nonce: 5,              // Transaction nonce
  chainId: 1337,         // Network chainId
}
```

### 1.2. RLP Encoding và Hashing

**Ethers.js tự động thực hiện:**

```typescript
// ✅ Step 1: RLP Encode transaction
const rlpEncoded = RLP.encode([
  nonce,
  gasPrice,
  gasLimit,
  to,
  value,
  data,
  chainId,  // EIP-155: Include chainId
  0,        // r (placeholder)
  0,        // s (placeholder)
]);

// ✅ Step 2: Hash transaction
const txHash = keccak256(rlpEncoded);
// txHash = 0x1234...abcd
```

**Ví dụ cụ thể:**
```
Transaction:
  to: 0x1234...5678
  data: 0xa9059cbb000000000000000000000000...
  value: 0
  nonce: 5
  gasLimit: 500000
  chainId: 1337

RLP Encoded:
  0xf86c0584... (binary data)

Hash (keccak256):
  0xabcd1234... (32 bytes)
```

### 1.3. MetaMask Ký Transaction

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

```typescript
// ✅ Get signer từ MetaMask
const provider = new ethers.BrowserProvider(ethereum);
const signer = await provider.getSigner();

// ✅ Gọi sendTransaction → MetaMask sẽ ký
const tx = await signer.sendTransaction({
  to: CONFIG.LENDING_POOL,
  data: encodedData,
  value: 0n,
});
```

**MetaMask thực hiện:**

```javascript
// ✅ Step 1: MetaMask nhận transaction hash từ ethers.js
const txHash = "0xabcd1234...";

// ✅ Step 2: MetaMask ký với private key của user
const privateKey = userPrivateKey; // Stored securely in MetaMask
const signature = secp256k1.sign(txHash, privateKey);

// ✅ Step 3: Signature được tách thành (r, s, v)
const r = signature.r;  // 32 bytes
const s = signature.s;  // 32 bytes
const v = signature.recovery + 27; // Recovery ID + 27 (or + 35 for EIP-155)

// ✅ Step 4: Attach signature vào transaction
transaction.r = r;
transaction.s = s;
transaction.v = v;
```

**ECDSA Signature Format:**
```
Signature = (r, s, v)

r: 32 bytes (256 bits) - X coordinate of point R
s: 32 bytes (256 bits) - Signature proof
v: 1 byte (8 bits) - Recovery ID + 27 (or + 35 for EIP-155)

Total: 65 bytes
```

### 1.4. ECDSA Signature Algorithm

**ECDSA (Elliptic Curve Digital Signature Algorithm) với secp256k1:**

```python
# Pseudo-code cho ECDSA signing
def ecdsa_sign(message_hash, private_key):
    # 1. Generate random nonce k
    k = random_number()
    
    # 2. Calculate point R = k * G (G is generator point)
    R = k * G
    r = R.x mod n  # n is curve order
    
    # 3. Calculate s = k^-1 * (hash + r * private_key) mod n
    s = (k^-1 * (message_hash + r * private_key)) mod n
    
    # 4. Return (r, s)
    return (r, s)
```

**Ví dụ cụ thể:**
```
Private Key: 0x1234...abcd (32 bytes)
Message Hash: 0xabcd...1234 (32 bytes)
Nonce k: 0x5678...efgh (random)

R = k * G
r = R.x = 0x9876...5432

s = k^-1 * (hash + r * privKey) mod n
s = 0xfedc...ba98

Signature = (r, s) = (0x9876...5432, 0xfedc...ba98)
```

---

## 🔍 Phần 2: Blockchain - Xác Thực Chữ Ký

### 2.1. Transaction Được Broadcast Lên Blockchain

**Sau khi MetaMask ký:**

```typescript
// ✅ Transaction đã ký được gửi đến RPC
const signedTx = {
  ...transaction,
  r: "0x9876...5432",
  s: "0xfedc...ba98",
  v: 27, // hoặc 35 (EIP-155)
};

// ✅ RPC broadcast lên blockchain
await rpc.sendRawTransaction(signedTx);
```

### 2.2. Miner/Validator Xác Thực

**Khi transaction được đưa vào block:**

```solidity
// ✅ EVM tự động xác thực signature khi execute transaction
// Code này KHÔNG cần viết trong contract - EVM tự động làm

// Pseudo-code của EVM:
function validateTransaction(tx) {
    // 1. Extract signature từ transaction
    bytes32 r = tx.r;
    bytes32 s = tx.s;
    uint8 v = tx.v;
    
    // 2. Recover transaction hash (RLP encode without signature)
    bytes32 txHash = keccak256(RLP.encode([
        tx.nonce,
        tx.gasPrice,
        tx.gasLimit,
        tx.to,
        tx.value,
        tx.data,
        tx.chainId,
    ]));
    
    // 3. Recover public key từ signature
    address recovered = ecrecover(txHash, v, r, s);
    
    // 4. Verify recovered address match với tx.from
    require(recovered == tx.from, "Invalid signature");
    
    // 5. Execute transaction nếu valid
    executeTransaction(tx);
}
```

### 2.3. Ecrecover Function

**EVM có built-in function `ecrecover`:**

```solidity
// ✅ ecrecover là precompiled contract (address 0x01)
function ecrecover(
    bytes32 hash,      // Message hash
    uint8 v,          // Recovery ID (27 or 28, or 35/36 for EIP-155)
    bytes32 r,        // Signature r
    bytes32 s         // Signature s
) returns (address) {
    // Recover public key từ signature
    // Return address derived from public key
}
```

**Cách hoạt động:**

```python
# Pseudo-code cho ecrecover
def ecrecover(message_hash, v, r, s):
    # 1. Determine recovery ID
    recovery_id = v - 27  # hoặc v - 35 cho EIP-155
    
    # 2. Recover point R từ r
    R = point_from_x(r, recovery_id)  # Có 2 điểm có cùng x, recovery_id chọn 1
    
    # 3. Calculate public key
    # Public key = (R - hash * G) * s^-1 * r^-1
    public_key = (R - hash * G) * mod_inverse(s) * mod_inverse(r)
    
    # 4. Derive address từ public key
    address = keccak256(public_key)[12:32]  # Last 20 bytes
    
    return address
```

**Ví dụ cụ thể:**
```
Message Hash: 0xabcd...1234
Signature:
  r = 0x9876...5432
  s = 0xfedc...ba98
  v = 27

Recovery:
  recovery_id = 27 - 27 = 0
  R = point_from_x(0x9876...5432, 0)
  public_key = (R - hash * G) * s^-1 * r^-1
  address = keccak256(public_key)[12:32] = 0x1234...5678

Verify:
  address == tx.from → ✅ Valid signature
```

### 2.4. Xác Thực Trong Smart Contract

**Trong dự án LendHub, contract KHÔNG cần verify signature vì:**

1. **EVM tự động verify** khi transaction được execute
2. **Contract chỉ cần check `msg.sender`:**

```solidity
// contracts/core/LendingPool.sol
function lend(address asset, uint256 amount) external {
    // ✅ msg.sender đã được EVM verify là address đã ký transaction
    // Không cần verify signature thủ công
    
    ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];
    // msg.sender = address đã ký transaction (đã được EVM verify)
    
    // ... logic ...
}
```

**Tại sao `msg.sender` đã được verify?**

```
Flow:
1. User ký transaction với private key
2. EVM recover address từ signature → tx.from
3. EVM verify tx.from match với signature
4. Nếu valid → Execute transaction
5. Trong contract, msg.sender = tx.from (đã được verify)
```

---

## 🔐 Phần 3: Chi Tiết Kỹ Thuật

### 3.1. EIP-155: Replay Attack Protection

**EIP-155 thêm chainId vào transaction để tránh replay attack:**

```typescript
// ✅ EIP-155 transaction format
const tx = {
  nonce: 5,
  gasPrice: 20000000000,
  gasLimit: 500000,
  to: "0x...",
  value: 0,
  data: "0x...",
  chainId: 1337,  // ✅ EIP-155: Include chainId
};

// ✅ RLP encode với chainId
const rlpEncoded = RLP.encode([
  nonce,
  gasPrice,
  gasLimit,
  to,
  value,
  data,
  chainId,  // ✅ ChainId được include
  0,        // r (placeholder)
  0,        // s (placeholder)
]);

// ✅ Hash transaction
const txHash = keccak256(rlpEncoded);

// ✅ Signature v = recovery_id + 35 (thay vì 27)
// v = 27 + recovery_id → Mainnet (chainId = 1)
// v = 35 + recovery_id → chainId = 1 (EIP-155)
// v = 35 + recovery_id + chainId * 2 → Other chains
```

**Tại sao cần EIP-155?**

```
Vấn đề (không có EIP-155):
- Transaction trên Mainnet có thể được replay trên Testnet
- Attacker có thể copy transaction và replay

Giải pháp (EIP-155):
- ChainId được include trong transaction hash
- Transaction chỉ valid trên chain có chainId tương ứng
- Replay attack không thể xảy ra
```

### 3.2. Nonce Management

**Nonce đảm bảo transaction được execute đúng thứ tự:**

```typescript
// ✅ Frontend: Get current nonce
const nonce = await provider.getTransactionCount(userAddress, 'pending');

// ✅ Transaction với nonce
const tx = {
  nonce: nonce,  // ✅ Nonce tăng dần: 0, 1, 2, 3, ...
  // ... other fields
};

// ✅ Blockchain: Verify nonce
// Nonce phải = account.nonce + 1
// Nếu nonce < account.nonce → Reject (already executed)
// Nếu nonce > account.nonce + 1 → Reject (gap in nonce)
```

**Ví dụ:**
```
Account nonce = 5

Transaction 1: nonce = 5 → ✅ Accept → Account nonce = 6
Transaction 2: nonce = 6 → ✅ Accept → Account nonce = 7
Transaction 3: nonce = 5 → ❌ Reject (nonce too low)
Transaction 4: nonce = 8 → ❌ Reject (nonce too high, gap)
```

### 3.3. Gas Price và Gas Limit

**Gas price và limit được include trong transaction hash:**

```typescript
// ✅ Transaction với gas
const tx = {
  gasPrice: 20000000000,  // 20 Gwei
  gasLimit: 500000,        // Max gas
  // ... other fields
};

// ✅ Gas price được include trong hash
// Nếu gas price thay đổi → Hash thay đổi → Cần ký lại
```

**Tại sao cần gas price trong hash?**

```
- Gas price ảnh hưởng đến transaction fee
- Attacker không thể thay đổi gas price sau khi ký
- User được bảo vệ khỏi gas price manipulation
```

---

## 🔒 Phần 4: Bảo Mật

### 4.1. Private Key Security

**Private key được lưu trữ an toàn trong MetaMask:**

```javascript
// ✅ MetaMask lưu private key trong secure storage
// - Encrypted với user password
// - Không bao giờ expose ra frontend
// - Chỉ dùng để ký transaction

// ❌ KHÔNG BAO GIỜ làm:
const privateKey = "0x1234..."; // ❌ Expose private key
const wallet = new ethers.Wallet(privateKey); // ❌ Unsafe
```

**Best practices:**
- ✅ Luôn dùng MetaMask hoặc hardware wallet
- ✅ Không bao giờ hardcode private key
- ✅ Không gửi private key qua network
- ✅ Sử dụng mnemonic phrase backup

### 4.2. Signature Verification

**EVM tự động verify, nhưng có thể verify thủ công:**

```solidity
// ✅ Verify signature trong contract (nếu cần)
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignatureVerifier {
    using ECDSA for bytes32;
    
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) public pure returns (bool) {
        // ✅ Recover signer từ signature
        address signer = messageHash.recover(signature);
        
        // ✅ Verify signer match với expected
        return signer == expectedSigner;
    }
}
```

**Khi nào cần verify signature trong contract?**

```
1. Meta-transactions (gasless transactions)
2. Off-chain signatures (sign message, verify on-chain)
3. Permit pattern (ERC-20 permit)
4. Multi-sig wallets
```

### 4.3. Replay Attack Protection

**Các cơ chế bảo vệ:**

1. **EIP-155 (ChainId)**
   - Transaction chỉ valid trên chain có chainId tương ứng

2. **Nonce**
   - Mỗi transaction chỉ được execute 1 lần
   - Nonce tăng dần, không thể reuse

3. **Timestamp/Block Number (nếu cần)**
   ```solidity
   // ✅ Thêm timestamp vào message để tránh replay
   bytes32 messageHash = keccak256(abi.encodePacked(
       message,
       block.timestamp,
       nonce
   ));
   ```

---

## 📊 Tóm Tắt: Flow Hoàn Chỉnh

### ✅ **Frontend (User → MetaMask)**

```
1. User click "Lend"
2. Frontend tạo transaction object
3. ethers.js RLP encode transaction
4. ethers.js hash transaction (keccak256)
5. MetaMask nhận transaction hash
6. MetaMask ký với private key (ECDSA)
7. MetaMask attach signature (r, s, v)
8. MetaMask gửi signed transaction đến RPC
```

### ✅ **Blockchain (RPC → EVM)**

```
1. RPC nhận signed transaction
2. RPC broadcast lên blockchain
3. Miner/Validator nhận transaction
4. EVM extract signature (r, s, v)
5. EVM recover transaction hash
6. EVM recover public key từ signature (ecrecover)
7. EVM derive address từ public key
8. EVM verify address match với tx.from
9. Nếu valid → Execute transaction
10. Contract nhận msg.sender (đã được verify)
```

### ✅ **Security Guarantees**

```
1. ✅ Private key không bao giờ rời khỏi MetaMask
2. ✅ Signature không thể giả mạo (cần private key)
3. ✅ Transaction không thể thay đổi sau khi ký
4. ✅ Replay attack được prevent bởi nonce và chainId
5. ✅ msg.sender trong contract đã được EVM verify
```

---

## 🎯 Kết Luận

**Cơ chế xác thực chữ ký trong dự án LendHub:**

1. ✅ **Frontend:** MetaMask ký transaction với ECDSA (secp256k1)
2. ✅ **Blockchain:** EVM tự động verify signature khi execute
3. ✅ **Contract:** Chỉ cần check `msg.sender` (đã được verify)
4. ✅ **Security:** EIP-155, nonce, và private key protection

**Điểm mạnh:**
- ✅ EVM tự động verify → Không cần code thủ công
- ✅ Private key được bảo vệ trong MetaMask
- ✅ Replay attack được prevent

**Lưu ý:**
- ⚠️ Contract không cần verify signature vì EVM đã làm
- ⚠️ Chỉ cần verify signature nếu dùng meta-transactions hoặc off-chain signatures





