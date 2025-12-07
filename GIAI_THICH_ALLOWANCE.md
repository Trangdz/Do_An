# 🔐 Giải Thích Allowance - Chỉ Số Phép Dùng Token

## 📋 Tổng Quan

**Allowance** là một cơ chế bảo mật trong ERC20 token standard, cho phép bạn **ủy quyền** cho một địa chỉ khác (thường là smart contract) được **sử dụng một số lượng token nhất định** từ tài khoản của bạn.

---

## 🎯 Allowance Là Gì?

### Định Nghĩa

**Allowance** = Số lượng token mà bạn cho phép một địa chỉ khác (spender) được sử dụng từ tài khoản của bạn.

### Công Thức

```solidity
allowance(owner, spender) = số lượng token mà owner cho phép spender sử dụng
```

**Ví dụ:**
```
Owner: 0xABC... (bạn)
Spender: 0xDEF... (LendingPool contract)
Allowance: 1000 DAI

→ LendingPool có thể sử dụng tối đa 1000 DAI từ tài khoản của bạn
```

---

## 💡 Tại Sao Cần Allowance?

### 1. **Bảo Mật**

**Không có Allowance:**
```
❌ Bất kỳ contract nào cũng có thể lấy hết token của bạn
❌ Không kiểm soát được ai được dùng bao nhiêu
❌ Rủi ro bị hack rất cao
```

**Có Allowance:**
```
✅ Bạn kiểm soát chính xác ai được dùng bao nhiêu
✅ Chỉ những contract bạn tin tưởng mới được phép
✅ Giới hạn số lượng token có thể bị lấy
```

### 2. **Kiểm Soát**

**Ví dụ thực tế:**
```
Bạn có: 10,000 DAI
Bạn muốn: Supply 1,000 DAI vào LendingPool

Không có allowance:
  ❌ LendingPool có thể lấy hết 10,000 DAI

Có allowance:
  ✅ Bạn chỉ approve 1,000 DAI
  ✅ LendingPool chỉ có thể lấy tối đa 1,000 DAI
  ✅ 9,000 DAI còn lại an toàn
```

### 3. **Quy Trình 2 Bước (Two-Step Process)**

**Bước 1: Approve (Ủy quyền)**
```
User → approve(LendingPool, 1000 DAI)
→ Allowance = 1000 DAI
```

**Bước 2: Transfer (Sử dụng)**
```
LendingPool → transferFrom(user, pool, 1000 DAI)
→ Kiểm tra: allowance >= 1000 DAI ✅
→ Transfer thành công
→ Allowance giảm: 1000 → 0 DAI
```

---

## 🔧 Cách Hoạt Động

### 1. ERC20 Standard Functions

#### `approve(spender, amount)`

**Mục đích:** Cho phép spender sử dụng `amount` token từ tài khoản của bạn.

**Code:**
```solidity
function approve(address spender, uint256 amount) external returns (bool);
```

**Ví dụ:**
```javascript
// Cho phép LendingPool sử dụng 1000 DAI
await dai.approve(LendingPoolAddress, ethers.parseUnits("1000", 18));
```

#### `allowance(owner, spender)`

**Mục đích:** Kiểm tra số lượng token mà owner cho phép spender sử dụng.

**Code:**
```solidity
function allowance(address owner, address spender) external view returns (uint256);
```

**Ví dụ:**
```javascript
// Kiểm tra allowance hiện tại
const allowance = await dai.allowance(userAddress, LendingPoolAddress);
console.log(`Allowance: ${ethers.formatUnits(allowance, 18)} DAI`);
```

#### `transferFrom(from, to, amount)`

**Mục đích:** Spender sử dụng token từ `from` để chuyển cho `to`.

**Code:**
```solidity
function transferFrom(address from, address to, uint256 amount) external returns (bool);
```

**Điều kiện:**
- `allowance(from, spender) >= amount` ✅
- `balanceOf(from) >= amount` ✅

**Ví dụ:**
```solidity
// LendingPool chuyển 1000 DAI từ user vào pool
IERC20(DAI).transferFrom(user, pool, 1000 DAI);
```

---

## 📊 Ví Dụ Cụ Thể

### Scenario 1: Supply Token vào LendingPool

**Bước 1: User có 1000 DAI**
```
Balance: 1000 DAI
Allowance: 0 DAI
```

**Bước 2: User approve 1000 DAI**
```javascript
await dai.approve(LendingPoolAddress, ethers.parseUnits("1000", 18));
```

**Kết quả:**
```
Balance: 1000 DAI
Allowance: 1000 DAI ✅
```

**Bước 3: User gọi lend()**
```javascript
await pool.lend(DAIAddress, ethers.parseUnits("1000", 18));
```

**Trong contract:**
```solidity
// LendingPool.sol
IERC20(DAI).transferFrom(user, address(this), 1000 DAI);
```

**Kết quả:**
```
Balance: 0 DAI (đã chuyển vào pool)
Allowance: 0 DAI (đã sử dụng hết)
```

### Scenario 2: Approve Nhiều Lần

**Lần 1: Approve 500 DAI**
```javascript
await dai.approve(LendingPoolAddress, ethers.parseUnits("500", 18));
// Allowance: 500 DAI
```

**Lần 2: Approve 1000 DAI (thay thế)**
```javascript
await dai.approve(LendingPoolAddress, ethers.parseUnits("1000", 18));
// Allowance: 1000 DAI (không phải 1500!)
```

**⚠️ Lưu ý:** `approve()` **thay thế** allowance cũ, không cộng dồn!

**Nếu muốn tăng allowance:**
```javascript
// Cách 1: Approve số lớn hơn
await dai.approve(LendingPoolAddress, ethers.parseUnits("2000", 18));

// Cách 2: Approve vô hạn (không khuyến khích)
await dai.approve(LendingPoolAddress, ethers.MaxUint256);
```

---

## 🔍 Code Trong Dự Án LendHub

### 1. Kiểm Tra Allowance

**File:** `lendhub-frontend-nextjs/src/lib/tx.ts`

```typescript
export async function getTokenAllowance(
  provider: ethers.Provider,
  tokenAddress: string,
  userAddress: string,
  spender: string,
  decimals: number
): Promise<string> {
  // Kiểm tra allowance
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const allowance = await tokenContract.allowance(userAddress, spender);
  return formatUnits(allowance, decimals);
}
```

**Sử dụng:**
```typescript
const allowance = await getTokenAllowance(
  provider,
  DAIAddress,
  userAddress,
  LendingPoolAddress,
  18
);
console.log(`Allowance: ${allowance} DAI`);
```

### 2. Approve Nếu Cần

**File:** `lendhub-frontend-nextjs/src/lib/tx.ts`

```typescript
export async function approveIfNeeded(
  signer: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<void> {
  // 1. Kiểm tra allowance hiện tại
  const currentAllowance = await tokenContract.allowance(userAddress, spender);
  
  // 2. Nếu đủ rồi thì skip
  if (currentAllowance >= amount) {
    console.log('✅ Allowance sufficient, skipping approval');
    return;
  }
  
  // 3. Nếu chưa đủ thì approve
  const txPromise = tokenContract.approve(spender, amount);
  await sendWithToast(txPromise, {
    pending: 'Approving tokens...',
    success: 'Token approved successfully!',
    error: 'Approval failed'
  }, toastCallback);
}
```

**Sử dụng:**
```typescript
// Trước khi supply
await approveIfNeeded(
  signer,
  DAIAddress,
  LendingPoolAddress,
  ethers.parseUnits("1000", 18)
);

// Sau đó mới supply
await lend(signer, DAIAddress, ethers.parseUnits("1000", 18));
```

### 3. Kiểm Tra Trong LendModal

**File:** `lendhub-frontend-nextjs/src/components/LendModal.tsx`

```typescript
// Load balance và allowance
const [balanceStr, allowanceStr] = await Promise.all([
  getTokenBalance(provider, token.address, userAddress, token.decimals),
  getTokenAllowance(provider, token.address, userAddress, poolAddress, token.decimals)
]);

// Hiển thị
console.log(`Balance: ${balanceStr} ${token.symbol}`);
console.log(`Allowance: ${allowanceStr} ${token.symbol}`);

// Cảnh báo nếu allowance = 0
if (parseFloat(allowanceStr) === 0 && parseFloat(balanceStr) > 0) {
  console.log('Allowance is 0 - user needs to approve');
}
```

---

## 🎨 Sơ Đồ Hoạt Động

### Flow 1: Approve và Supply

```
┌─────────┐                    ┌──────────────┐
│  User   │                    │ LendingPool  │
└────┬────┘                    └──────┬───────┘
     │                                │
     │ 1. approve(pool, 1000 DAI)     │
     │───────────────────────────────>│
     │                                │
     │ 2. allowance(user, pool)       │
     │<───────────────────────────────│
     │    = 1000 DAI ✅               │
     │                                │
     │ 3. lend(DAI, 1000)            │
     │───────────────────────────────>│
     │                                │
     │ 4. transferFrom(user, pool)    │
     │    Kiểm tra: allowance >= 1000 │
     │    ✅ Transfer thành công       │
     │                                │
     │ 5. allowance(user, pool)       │
     │<───────────────────────────────│
     │    = 0 DAI (đã dùng hết)       │
     │                                │
```

### Flow 2: Kiểm Tra Allowance Trước Khi Supply

```
User muốn supply 1000 DAI
     │
     ├─> Kiểm tra balance
     │   Balance: 1000 DAI ✅
     │
     ├─> Kiểm tra allowance
     │   Allowance: 500 DAI ❌ (chưa đủ)
     │
     ├─> Approve thêm
     │   approve(pool, 1000 DAI)
     │   Allowance: 1000 DAI ✅
     │
     └─> Supply
         lend(DAI, 1000)
         ✅ Thành công
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Approve Thay Thế, Không Cộng Dồn

```javascript
// Lần 1
await dai.approve(pool, 500);
// Allowance: 500

// Lần 2
await dai.approve(pool, 1000);
// Allowance: 1000 (KHÔNG phải 1500!)
```

### 2. Approve Vô Hạn (Không Khuyến Khích)

```javascript
// ⚠️ Nguy hiểm!
await dai.approve(pool, ethers.MaxUint256);
// Allowance: Vô hạn
// → Pool có thể lấy hết token của bạn bất cứ lúc nào
```

**Tại sao nguy hiểm:**
- Nếu pool bị hack → Hacker có thể lấy hết token
- Không kiểm soát được số lượng

**Khi nào dùng:**
- Chỉ với contract bạn hoàn toàn tin tưởng
- Hoặc approve số lượng lớn nhưng có giới hạn

### 3. Gas Optimization

**Approve một lần cho nhiều giao dịch:**
```javascript
// ✅ Tốt: Approve 10,000 DAI một lần
await dai.approve(pool, ethers.parseUnits("10000", 18));

// Sau đó có thể supply nhiều lần mà không cần approve lại
await pool.lend(DAI, 1000); // Dùng 1000, còn 9000
await pool.lend(DAI, 2000); // Dùng 2000, còn 7000
await pool.lend(DAI, 5000);  // Dùng 5000, còn 2000
```

### 4. Kiểm Tra Allowance Trước Khi Dùng

**Code trong dự án:**
```typescript
// Kiểm tra allowance trước khi supply
const currentAllowance = await tokenContract.allowance(userAddress, spender);

if (currentAllowance < amount) {
  // Cần approve
  await approveIfNeeded(signer, tokenAddress, spender, amount);
}
```

---

## 🔒 Bảo Mật

### 1. Chỉ Approve Khi Cần

```
✅ Tốt: Approve đúng số lượng cần dùng
❌ Xấu: Approve vô hạn cho tất cả contract
```

### 2. Kiểm Tra Spender

```
✅ Tốt: Chỉ approve cho contract đáng tin (LendingPool)
❌ Xấu: Approve cho contract không rõ nguồn gốc
```

### 3. Revoke Allowance Khi Không Dùng

```javascript
// Hủy allowance (set về 0)
await dai.approve(pool, 0);
// Allowance: 0
```

---

## 📝 Tóm Tắt

### Allowance Là Gì?

**Allowance** = Số lượng token bạn cho phép một địa chỉ khác sử dụng từ tài khoản của bạn.

### Tại Sao Cần?

1. **Bảo mật**: Kiểm soát ai được dùng bao nhiêu
2. **An toàn**: Giới hạn số lượng token có thể bị lấy
3. **Linh hoạt**: Có thể approve nhiều lần

### Cách Hoạt Động?

1. **Approve**: Cho phép spender sử dụng token
2. **Allowance**: Kiểm tra số lượng được phép
3. **TransferFrom**: Spender sử dụng token (giảm allowance)

### Trong Dự Án LendHub?

- Kiểm tra allowance trước khi supply/borrow
- Tự động approve nếu chưa đủ
- Hiển thị allowance trong UI
- Cảnh báo nếu allowance = 0

---

**Kết luận:** Allowance là cơ chế bảo mật quan trọng trong ERC20, cho phép bạn kiểm soát chính xác ai được sử dụng bao nhiêu token từ tài khoản của bạn! 🔐


