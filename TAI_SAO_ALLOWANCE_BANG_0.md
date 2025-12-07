# 🔍 Tại Sao Allowance Luôn Bằng 0?

## 📋 Tổng Quan

Allowance = 0 là **bình thường** nếu bạn chưa approve token cho LendingPool. Tuy nhiên, nếu bạn đã approve nhưng vẫn thấy 0, có thể có vấn đề.

---

## ✅ Lý Do Bình Thường (Không Phải Bug)

### 1. **Bạn Chưa Approve Bao Giờ**

**Đây là lý do phổ biến nhất!**

```
Allowance = 0 → Bạn chưa từng gọi approve()
```

**Giải pháp:**
- Khi bạn click "Supply", hệ thống sẽ tự động approve trước
- Hoặc bạn có thể approve thủ công

**Kiểm tra:**
```javascript
// Mở Console trong browser
// Xem log: "Allowance is 0 - this is normal. User hasn't approved yet."
```

### 2. **Bạn Đã Approve Nhưng Đã Dùng Hết**

**Scenario:**
```
1. Approve 1000 DAI
2. Supply 1000 DAI
3. Allowance giảm: 1000 → 0 DAI ✅
```

**Đây là hành vi bình thường!** Allowance giảm khi bạn supply/borrow.

**Kiểm tra:**
- Xem transaction history: Bạn đã supply/borrow chưa?
- Nếu đã supply → Allowance = 0 là đúng

---

## ⚠️ Lý Do Có Vấn Đề (Cần Kiểm Tra)

### 3. **Approve Sai Địa Chỉ Spender**

**Vấn đề:**
```javascript
// ❌ Sai: Approve cho địa chỉ khác
await dai.approve(wrongAddress, 1000);

// ✅ Đúng: Approve cho LendingPool
await dai.approve(LendingPoolAddress, 1000);
```

**Kiểm tra:**
1. Mở Console trong browser
2. Xem log: `Checking allowance for spender (LendingPool): 0x...`
3. So sánh với địa chỉ LendingPool trong `CONFIG.LENDING_POOL`

**Code kiểm tra:**
```javascript
// Trong browser console
const CONFIG = await import('./config');
console.log('LendingPool Address:', CONFIG.LENDING_POOL);
```

### 4. **Token Address Không Đúng**

**Vấn đề:**
- Token address trong config không khớp với token thực tế
- Token chưa được deploy

**Kiểm tra:**
1. Mở Console → Xem log: `Token contract has no code at 0x...`
2. Nếu thấy lỗi này → Token chưa được deploy hoặc sai address

**Code kiểm tra:**
```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const code = await provider.getCode(tokenAddress);
console.log('Token code exists:', code !== '0x');
```

### 5. **LendingPool Address Không Đúng**

**Vấn đề:**
- Pool address trong config không khớp
- Pool chưa được deploy

**Kiểm tra:**
1. Mở Console → Xem log: `Pool contract has no code at 0x...`
2. Nếu thấy lỗi này → Pool chưa được deploy hoặc sai address

**Code kiểm tra:**
```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const code = await provider.getCode(poolAddress);
console.log('Pool code exists:', code !== '0x');
```

### 6. **Network/Chain ID Không Khớp**

**Vấn đề:**
- Bạn đang kết nối network khác (Mainnet, Testnet, vs Local Ganache)
- Chain ID không khớp với config

**Kiểm tra:**
1. Mở Console → Xem log: `Network Chain ID: X, Expected: Y`
2. Nếu khác nhau → Cần switch network

**Code kiểm tra:**
```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const network = await provider.getNetwork();
console.log('Chain ID:', Number(network.chainId));
console.log('Expected:', CONFIG.CHAIN_ID);
```

### 7. **RPC Node Không Hoạt Động**

**Vấn đề:**
- Ganache không chạy
- RPC URL sai
- Không kết nối được đến blockchain

**Kiểm tra:**
1. Mở Console → Xem log: `Error checking network`
2. Kiểm tra Ganache có đang chạy không

**Code kiểm tra:**
```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
try {
  const blockNumber = await provider.getBlockNumber();
  console.log('✅ RPC connected, block:', blockNumber);
} catch (e) {
  console.error('❌ RPC not connected:', e);
}
```

### 8. **Lỗi Khi Đọc Allowance Từ Contract**

**Vấn đề:**
- Contract không implement đúng ERC20
- Lỗi decode response
- Contract revert khi gọi `allowance()`

**Kiểm tra:**
1. Mở Console → Xem log: `Decode failed` hoặc `Error:`
2. Kiểm tra token contract có implement `allowance()` không

**Code kiểm tra:**
```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const tokenContract = new ethers.Contract(
  tokenAddress,
  ['function allowance(address, address) view returns (uint256)'],
  provider
);

try {
  const allowance = await tokenContract.allowance(userAddress, poolAddress);
  console.log('✅ Allowance:', ethers.formatUnits(allowance, 18));
} catch (e) {
  console.error('❌ Error reading allowance:', e);
}
```

---

## 🔧 Cách Debug Chi Tiết

### Bước 1: Kiểm Tra Console Logs

**Mở Browser Console (F12) và xem các log:**

```
✅ [LendModal] User address valid: 0x...
✅ [LendModal] Network Chain ID correct!
✅ [LendModal] Token contract code exists (X bytes)
✅ [LendModal] Pool contract code exists (X bytes)
📊 [LendModal] Checking allowance for spender (LendingPool): 0x...
✅ [getTokenAllowance] Allowance: 0 DAI
```

**Nếu thấy lỗi:**
- `❌ Invalid user address` → Chưa connect wallet
- `❌ Network mismatch` → Sai network
- `❌ Token contract has no code` → Token chưa deploy
- `❌ Pool contract has no code` → Pool chưa deploy
- `❌ Error reading allowance` → Có lỗi khi đọc

### Bước 2: Kiểm Tra Bằng Code

**Tạo file test: `scripts/check_allowance.cjs`**

```javascript
const { ethers } = require('ethers');
const CONFIG = require('../lendhub-frontend-nextjs/src/config/config.js').default;

async function checkAllowance() {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  
  // Thay đổi các giá trị này
  const userAddress = '0x...'; // Địa chỉ của bạn
  const tokenAddress = CONFIG.TOKENS.DAI; // Hoặc token khác
  const poolAddress = CONFIG.LENDING_POOL;
  
  console.log('🔍 Checking Allowance...');
  console.log('User:', userAddress);
  console.log('Token:', tokenAddress);
  console.log('Pool:', poolAddress);
  
  // 1. Kiểm tra network
  try {
    const network = await provider.getNetwork();
    console.log('✅ Network Chain ID:', Number(network.chainId));
  } catch (e) {
    console.error('❌ Network error:', e.message);
    return;
  }
  
  // 2. Kiểm tra token contract
  const tokenCode = await provider.getCode(tokenAddress);
  if (!tokenCode || tokenCode === '0x') {
    console.error('❌ Token contract has no code');
    return;
  }
  console.log('✅ Token contract exists');
  
  // 3. Kiểm tra pool contract
  const poolCode = await provider.getCode(poolAddress);
  if (!poolCode || poolCode === '0x') {
    console.error('❌ Pool contract has no code');
    return;
  }
  console.log('✅ Pool contract exists');
  
  // 4. Kiểm tra allowance
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function allowance(address, address) view returns (uint256)'],
    provider
  );
  
  try {
    const allowance = await tokenContract.allowance(userAddress, poolAddress);
    const decimals = 18; // Thay đổi nếu token khác
    const formatted = ethers.formatUnits(allowance, decimals);
    console.log('📊 Allowance:', formatted);
    
    if (allowance === 0n) {
      console.log('ℹ️ Allowance is 0 - User needs to approve');
    } else {
      console.log('✅ Allowance exists!');
    }
  } catch (e) {
    console.error('❌ Error reading allowance:', e.message);
  }
}

checkAllowance().catch(console.error);
```

**Chạy script:**
```bash
node scripts/check_allowance.cjs
```

### Bước 3: Kiểm Tra Transaction History

**Xem bạn đã approve chưa:**

```javascript
// Trong browser console
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const userAddress = '0x...'; // Địa chỉ của bạn
const tokenAddress = CONFIG.TOKENS.DAI;

// Lấy tất cả events Approval
const tokenContract = new ethers.Contract(
  tokenAddress,
  ['event Approval(address indexed owner, address indexed spender, uint256 value)'],
  provider
);

const filter = tokenContract.filters.Approval(userAddress, CONFIG.LENDING_POOL);
const events = await tokenContract.queryFilter(filter);

console.log('Approval events:', events.length);
events.forEach((event, i) => {
  console.log(`Event ${i + 1}:`, {
    owner: event.args.owner,
    spender: event.args.spender,
    value: ethers.formatUnits(event.args.value, 18)
  });
});
```

---

## 🎯 Giải Pháp

### Giải Pháp 1: Approve Thủ Công

**Nếu bạn muốn approve trước:**

```javascript
// Trong browser console
const signer = await provider.getSigner();
const tokenContract = new ethers.Contract(
  tokenAddress,
  ['function approve(address spender, uint256 amount) returns (bool)'],
  signer
);

const amount = ethers.parseUnits('1000', 18); // 1000 token
const tx = await tokenContract.approve(CONFIG.LENDING_POOL, amount);
await tx.wait();

console.log('✅ Approved!');
```

### Giải Pháp 2: Để Hệ Thống Tự Động Approve

**Khi bạn click "Supply":**
1. Hệ thống tự động kiểm tra allowance
2. Nếu chưa đủ → Tự động approve
3. Sau đó mới supply

**Không cần làm gì thêm!** ✅

### Giải Pháp 3: Kiểm Tra và Sửa Config

**Nếu có lỗi về address:**

1. Kiểm tra `lendhub-frontend-nextjs/src/config/config.js`
2. Đảm bảo `LENDING_POOL` và `TOKENS` đúng
3. Kiểm tra network/chain ID

---

## 📊 Checklist Debug

**Đánh dấu các mục sau:**

- [ ] **User đã connect wallet?** → Kiểm tra MetaMask
- [ ] **Network đúng chưa?** → Chain ID khớp với config
- [ ] **Ganache đang chạy?** → Port 7545
- [ ] **Token đã deploy?** → Kiểm tra token address
- [ ] **Pool đã deploy?** → Kiểm tra pool address
- [ ] **Đã approve chưa?** → Kiểm tra transaction history
- [ ] **Allowance đã dùng hết?** → Nếu đã supply thì = 0 là đúng
- [ ] **Console có lỗi?** → Xem log chi tiết

---

## 🎨 Sơ Đồ Debug

```
Allowance = 0?
    │
    ├─> User chưa approve? → ✅ Bình thường, sẽ tự động approve khi supply
    │
    ├─> Đã approve nhưng dùng hết? → ✅ Bình thường, approve lại nếu cần
    │
    ├─> Approve sai address? → ❌ Kiểm tra CONFIG.LENDING_POOL
    │
    ├─> Token chưa deploy? → ❌ Deploy token contract
    │
    ├─> Pool chưa deploy? → ❌ Deploy LendingPool contract
    │
    ├─> Network sai? → ❌ Switch network hoặc sửa CONFIG.CHAIN_ID
    │
    └─> RPC không kết nối? → ❌ Khởi động Ganache
```

---

## 💡 Kết Luận

**Allowance = 0 thường là bình thường nếu:**
- ✅ Bạn chưa approve bao giờ
- ✅ Bạn đã approve nhưng đã dùng hết

**Allowance = 0 là vấn đề nếu:**
- ❌ Bạn đã approve nhưng vẫn = 0 (kiểm tra address)
- ❌ Token/Pool chưa deploy
- ❌ Network/Chain ID sai
- ❌ RPC không kết nối

**Giải pháp:**
1. Kiểm tra Console logs
2. Chạy script `check_allowance.cjs`
3. Để hệ thống tự động approve khi supply (khuyến nghị)

---

**Lưu ý:** Trong dự án LendHub, hệ thống tự động kiểm tra và approve nếu cần, nên bạn không cần lo lắng về allowance = 0! 🎉

