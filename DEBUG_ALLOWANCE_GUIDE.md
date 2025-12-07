# 🔧 Hướng Dẫn Debug Allowance = 0

## 🎯 Bước 1: Kiểm Tra Console Logs

Mở Browser Console (F12) và tìm các log sau:

### ✅ Logs Bình Thường (Allowance = 0 là OK)

```
✅ [LendModal] User address valid: 0x...
✅ [LendModal] Network Chain ID correct!
✅ [LendModal] Token contract code exists (X bytes)
✅ [LendModal] Pool contract code exists (X bytes)
📊 [LendModal] Checking allowance for spender (LendingPool): 0x...
🔍 [getTokenAllowance] Checking allowance for token 0x..., user 0x..., spender 0x...
✅ [getTokenAllowance] Contract code exists (X bytes)
📊 [getTokenAllowance] Calling allowance(0x..., 0x...)
✅ [getTokenAllowance] Allowance: 0 (decimals: 18)
✅ [LendModal] Balance: X DAI, Allowance: 0 DAI
ℹ️ [LendModal] Allowance is 0 - this is normal. User hasn't approved yet.
```

**→ Nếu thấy log này → Bình thường, chưa approve!**

### ❌ Logs Có Vấn Đề

#### 1. Invalid User Address
```
❌ [LendModal] Invalid user address: 0x0000...
```
**Giải pháp:** Connect MetaMask wallet

#### 2. Network Mismatch
```
❌ [LendModal] Network mismatch! Expected Chain ID X, got Y
```
**Giải pháp:** 
- Switch network trong MetaMask
- Hoặc kiểm tra Ganache đang chạy đúng port

#### 3. Token Contract Không Tồn Tại
```
❌ [LendModal] Token contract has no code at 0x...
❌ [getTokenAllowance] Token contract has no code at 0x...
```
**Giải pháp:** 
- Deploy token contract
- Hoặc kiểm tra token address trong config

#### 4. Pool Contract Không Tồn Tại
```
❌ [LendModal] Pool contract has no code at 0x...
```
**Giải pháp:** 
- Deploy LendingPool contract
- Hoặc kiểm tra pool address trong config

#### 5. Decode Failed
```
⚠️ [getTokenAllowance] Decode failed: could not decode result
```
**Giải pháp:** 
- Token contract không implement đúng ERC20
- Hoặc có lỗi khi gọi allowance()

#### 6. RPC Connection Error
```
❌ [LendModal] Error checking network: ...
💡 [LendModal] Make sure Ganache is running on http://127.0.0.1:7545
```
**Giải pháp:** 
- Khởi động Ganache
- Kiểm tra RPC URL trong config

---

## 🎯 Bước 2: Chạy Script Debug

Tôi đã tạo script `scripts/check_allowance.cjs` để debug tự động:

```bash
# 1. Lấy địa chỉ user từ MetaMask
# 2. Chạy script
node scripts/check_allowance.cjs <userAddress> DAI

# Ví dụ:
node scripts/check_allowance.cjs 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb DAI
```

Script sẽ kiểm tra:
- ✅ Network connection
- ✅ Token contract
- ✅ Pool contract  
- ✅ Allowance hiện tại
- ✅ Approval events

---

## 🎯 Bước 3: Kiểm Tra Thủ Công

### 3.1. Kiểm Tra Config

**File:** `lendhub-frontend-nextjs/src/config/contracts.ts`

Kiểm tra:
- `CONFIG.LENDING_POOL` có đúng địa chỉ LendingPool không?
- `CONFIG.TOKENS.DAI` (hoặc token khác) có đúng không?
- `CONFIG.RPC_URL` có đúng không?
- `CONFIG.CHAIN_ID` có đúng không?

### 3.2. Kiểm Tra Bằng Browser Console

Mở Browser Console và chạy:

```javascript
// 1. Import config
const CONFIG = await import('./config/contracts');
console.log('Config:', CONFIG.CONFIG);

// 2. Kiểm tra addresses
console.log('LendingPool:', CONFIG.CONFIG.LENDING_POOL);
console.log('DAI Token:', CONFIG.CONFIG.TOKENS.DAI);
console.log('RPC URL:', CONFIG.CONFIG.RPC_URL);
console.log('Chain ID:', CONFIG.CONFIG.CHAIN_ID);

// 3. Kiểm tra network
const provider = new ethers.JsonRpcProvider(CONFIG.CONFIG.RPC_URL);
const network = await provider.getNetwork();
console.log('Current Chain ID:', Number(network.chainId));

// 4. Kiểm tra token contract
const tokenCode = await provider.getCode(CONFIG.CONFIG.TOKENS.DAI);
console.log('Token code exists:', tokenCode !== '0x');

// 5. Kiểm tra pool contract
const poolCode = await provider.getCode(CONFIG.CONFIG.LENDING_POOL);
console.log('Pool code exists:', poolCode !== '0x');

// 6. Kiểm tra allowance
const userAddress = '0x...'; // Thay bằng địa chỉ của bạn
const tokenContract = new ethers.Contract(
  CONFIG.CONFIG.TOKENS.DAI,
  ['function allowance(address, address) view returns (uint256)'],
  provider
);
const allowance = await tokenContract.allowance(
  userAddress,
  CONFIG.CONFIG.LENDING_POOL
);
console.log('Allowance:', ethers.formatUnits(allowance, 18));
```

### 3.3. Kiểm Tra Approval Events

```javascript
// Kiểm tra xem đã approve chưa
const provider = new ethers.JsonRpcProvider(CONFIG.CONFIG.RPC_URL);
const tokenContract = new ethers.Contract(
  CONFIG.CONFIG.TOKENS.DAI,
  ['event Approval(address indexed owner, address indexed spender, uint256 value)'],
  provider
);

const userAddress = '0x...'; // Thay bằng địa chỉ của bạn
const filter = tokenContract.filters.Approval(
  userAddress,
  CONFIG.CONFIG.LENDING_POOL
);
const events = await tokenContract.queryFilter(filter);

console.log('Approval events:', events.length);
events.forEach((event, i) => {
  console.log(`Event ${i + 1}:`, {
    block: event.blockNumber,
    value: ethers.formatUnits(event.args.value, 18),
    txHash: event.transactionHash
  });
});
```

---

## 🎯 Bước 4: Test Approve Thủ Công

Nếu muốn test approve thủ công:

```javascript
// Trong Browser Console
const signer = await provider.getSigner();
const userAddress = await signer.getAddress();

const tokenContract = new ethers.Contract(
  CONFIG.CONFIG.TOKENS.DAI,
  [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ],
  signer
);

// Approve
const amount = ethers.parseUnits('1000', 18);
console.log('Approving...');
const tx = await tokenContract.approve(CONFIG.CONFIG.LENDING_POOL, amount);
console.log('Tx hash:', tx.hash);
await tx.wait();
console.log('✅ Approved!');

// Kiểm tra lại
const newAllowance = await tokenContract.allowance(
  userAddress,
  CONFIG.CONFIG.LENDING_POOL
);
console.log('New allowance:', ethers.formatUnits(newAllowance, 18));
```

---

## 🎯 Bước 5: Kiểm Tra Code Logic

### 5.1. Kiểm Tra getTokenAllowance()

**File:** `lendhub-frontend-nextjs/src/lib/tx.ts` (dòng 1059-1106)

Code có vẻ đúng, nhưng kiểm tra:
- ✅ Token address không phải ZeroAddress
- ✅ Token contract có code
- ✅ Gọi `allowance()` đúng cách
- ✅ Format units đúng decimals

### 5.2. Kiểm Tra LendModal

**File:** `lendhub-frontend-nextjs/src/components/LendModal.tsx` (dòng 166-184)

Kiểm tra:
- ✅ `poolAddress` được truyền đúng
- ✅ `token.address` đúng
- ✅ `userAddress` đúng
- ✅ `token.decimals` đúng

---

## 🔍 Checklist Debug

Đánh dấu các mục sau:

### Network & Connection
- [ ] Ganache đang chạy trên port đúng (7545)
- [ ] RPC URL trong config đúng (`http://127.0.0.1:7545`)
- [ ] Chain ID trong config đúng (thường là 1337 cho Ganache)
- [ ] MetaMask connect đúng network

### Contracts
- [ ] Token contract đã deploy
- [ ] LendingPool contract đã deploy
- [ ] Token address trong config đúng
- [ ] Pool address trong config đúng

### User
- [ ] User đã connect wallet (MetaMask)
- [ ] User address không phải ZeroAddress
- [ ] User có balance token > 0

### Allowance
- [ ] Đã approve chưa? (kiểm tra Approval events)
- [ ] Approve đúng spender address (LendingPool)
- [ ] Approve đúng token address
- [ ] Allowance chưa dùng hết (nếu đã approve)

---

## 🛠️ Các Lỗi Thường Gặp

### Lỗi 1: "Token contract has no code"

**Nguyên nhân:** Token chưa deploy hoặc sai address

**Giải pháp:**
```bash
# Deploy lại token
node scripts/deploy_tokens.cjs

# Hoặc kiểm tra address trong config
```

### Lỗi 2: "Pool contract has no code"

**Nguyên nhân:** LendingPool chưa deploy hoặc sai address

**Giải pháp:**
```bash
# Deploy lại LendingPool
node scripts/deploy_ganache_simple.cjs

# Hoặc kiểm tra address trong config
```

### Lỗi 3: "Network mismatch"

**Nguyên nhân:** Chain ID không khớp

**Giải pháp:**
- Kiểm tra Ganache chain ID (thường là 1337)
- Sửa `CONFIG.CHAIN_ID` trong config
- Hoặc switch network trong MetaMask

### Lỗi 4: "Decode failed"

**Nguyên nhân:** Token contract không implement đúng ERC20

**Giải pháp:**
- Kiểm tra token contract có function `allowance()` không
- Deploy lại token với code đúng

### Lỗi 5: Allowance = 0 sau khi approve

**Nguyên nhân:** 
- Approve sai spender address
- Approve sai token address
- Transaction chưa được confirm

**Giải pháp:**
- Kiểm tra Approval events
- Đảm bảo approve đúng `CONFIG.LENDING_POOL`
- Đợi transaction confirm

---

## 📝 Tóm Tắt

**Nếu Allowance = 0 và:**
- ✅ Console log bình thường → **Chưa approve, bình thường!**
- ❌ Có lỗi trong console → **Xem phần "Logs Có Vấn Đề" ở trên**

**Giải pháp nhanh:**
1. Chạy script `check_allowance.cjs`
2. Xem console logs
3. Kiểm tra config addresses
4. Test approve thủ công

**Nếu vẫn không được:**
- Gửi console logs cho tôi
- Hoặc chạy script và gửi output

