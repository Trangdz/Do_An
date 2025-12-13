# 🔒 Cơ Chế Bảo Mật Trong Dự Án LendHub

## 📋 Tổng Quan

Dự án LendHub sử dụng nhiều lớp bảo mật để bảo vệ protocol và người dùng khỏi các cuộc tấn công phổ biến trong DeFi. Tài liệu này giải thích chi tiết 3 cơ chế bảo mật chính:

1. **ReentrancyGuard và mô hình CEI (Checks-Effects-Interactions)**
2. **SafeERC20 và xử lý Fee-on-Transfer (FoT-aware delta)**
3. **Cơ chế xử lý "Dust" khi hoàn nợ**

---

## 1. 🔐 Cơ Chế Chống Tái Nhập (ReentrancyGuard) và Mô Hình CEI

### 1.1. Vấn Đề: Reentrancy Attack

**Reentrancy Attack** là một trong những lỗ hổng bảo mật nghiêm trọng nhất trong smart contract. Kẻ tấn công có thể gọi lại hàm ghi dữ liệu trước khi trạng thái được cập nhật, dẫn đến rút tài sản nhiều lần.

**Ví dụ tấn công (DAO Hack 2016):**
```
1. Attacker gọi withdraw(100 tokens)
2. Contract chuyển 100 tokens → Attacker
3. Attacker's fallback() gọi lại withdraw(100 tokens)
4. Contract chưa cập nhật balance → vẫn thấy 100 tokens
5. Contract chuyển thêm 100 tokens → Attacker
6. Lặp lại → Attacker rút hết pool
```

### 1.2. Giải Pháp: ReentrancyGuard + CEI Pattern

**LendingPool.sol:**
```solidity
contract LendingPool is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18) {
        // ✅ Checks: Kiểm tra điều kiện
        require(!pausedAssets[asset], "Asset is paused");
        _requireInited(asset);
        _accrue(asset);
        
        // ✅ Checks: Validate balance
        uint256 balNow = _currentSupply(msg.sender, asset);
        if (balNow == 0) return 0;
        
        // ✅ Checks: Calculate max withdraw
        uint256 xMax = _maxWithdrawAllowed(msg.sender, asset);
        uint256 available = r.reserveCash;
        uint256 amt = requested1e18 > xMax ? xMax : requested1e18;
        if (amt > available) amt = available;
        
        // ✅ Effects: Cập nhật trạng thái TRƯỚC KHI chuyển token
        uint256 sNew = balNow - amt;
        u.supply.principal = uint128(sNew);
        u.supply.index = r.liquidityIndex;
        r.reserveCash = uint128(uint256(r.reserveCash) - amt);
        
        // ✅ Accrue lại để tính rates mới
        _accrue(asset);
        
        // ✅ Interactions: Chuyển token SAU KHI cập nhật state
        uint256 transferOut = _from1e18(amt, r.decimals);
        IERC20(asset).safeTransfer(msg.sender, transferOut);
        
        emit Withdrawn(msg.sender, asset, amt);
        return amt;
    }
}
```

**Modifier `nonReentrant`:**
```solidity
function repay(address asset, uint256 amount, address onBehalfOf) 
    external 
    nonReentrant  // ✅ Ngăn reentrancy
    whenNotPaused 
    returns (uint256) 
{
    // Logic...
}
```

### 1.3. Mô Hình CEI (Checks-Effects-Interactions)

**Thứ tự thực thi an toàn:**

#### ✅ **Checks (Kiểm tra điều kiện)**
```solidity
// 1. Kiểm tra asset không bị pause
require(!pausedAssets[asset], "Asset is paused");

// 2. Kiểm tra asset đã được init
_requireInited(asset);

// 3. Kiểm tra balance đủ
uint256 balNow = _currentSupply(msg.sender, asset);
if (balNow == 0) return 0;

// 4. Kiểm tra health factor
uint256 xMax = _maxWithdrawAllowed(msg.sender, asset);
```

#### ✅ **Effects (Cập nhật trạng thái)**
```solidity
// 1. Cập nhật user balance
uint256 sNew = balNow - amt;
u.supply.principal = uint128(sNew);
u.supply.index = r.liquidityIndex;

// 2. Cập nhật pool balance
r.reserveCash = uint128(uint256(r.reserveCash) - amt);

// 3. Accrue để tính rates mới
_accrue(asset);
```

#### ✅ **Interactions (Tương tác bên ngoài)**
```solidity
// Chuyển token SAU KHI đã cập nhật state
uint256 transferOut = _from1e18(amt, r.decimals);
IERC20(asset).safeTransfer(msg.sender, transferOut);
```

### 1.4. Tại Sao CEI Quan Trọng?

**Nếu không tuân thủ CEI:**
```solidity
// ❌ SAI: Chuyển token TRƯỚC KHI cập nhật state
IERC20(asset).safeTransfer(msg.sender, transferOut);
u.supply.principal = uint128(sNew); // Attacker có thể reenter ở đây
```

**Kết quả:**
- Attacker nhận token → gọi lại withdraw() → balance chưa cập nhật → rút thêm lần nữa
- Pool bị rút cạn

**Với CEI:**
- State được cập nhật trước → Attacker reenter → balance đã = 0 → không thể rút thêm
- Pool an toàn ✅

---

## 2. 🛡️ SafeERC20 và Xử Lý Fee-on-Transfer (FoT-aware Delta)

### 2.1. Vấn Đề: Fee-on-Transfer Tokens

Một số token (như PAXG, STA) có cơ chế **Fee-on-Transfer (FoT)**: Khi chuyển token, một phần bị trừ làm phí.

**Ví dụ:**
```
User chuyển 100 PAXG
→ Contract chỉ nhận được 98 PAXG (2 PAXG bị trừ phí)
→ Nhưng contract ghi nhận user đã nạp 100 PAXG
→ Sổ cái bị sai lệch: Ghi 100, thực tế chỉ có 98
→ Thiếu hụt thanh khoản
```

### 2.2. Giải Pháp: FoT-aware Delta Calculation

**LendingPool.sol - Function `lend()`:**
```solidity
function lend(address asset, uint256 amount) external {
    // ... checks ...
    
    // ✅ FoT-aware: Đo balance TRƯỚC KHI nhận token
    uint256 balBefore = IERC20(asset).balanceOf(address(this));
    
    // ✅ SafeERC20: Chuyển token an toàn
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    
    // ✅ FoT-aware: Đo balance SAU KHI nhận token
    uint256 delta = IERC20(asset).balanceOf(address(this)) - balBefore;
    
    // ✅ Sử dụng delta (số thực nhận) thay vì amount (số yêu cầu)
    uint256 delta1e18 = _to1e18(delta, r.decimals);
    
    // ✅ Cập nhật state với delta thực tế
    uint256 sNow = _currentSupply(msg.sender, asset);
    uint256 sNew = sNow + delta1e18; // Dùng delta, không dùng amount
    u.supply.principal = uint128(sNew);
    r.reserveCash = uint128(uint256(r.reserveCash) + delta1e18);
    
    // ...
}
```

**LendingPool.sol - Function `repay()`:**
```solidity
function repay(address asset, uint256 amount, address onBehalfOf) 
    external 
    nonReentrant 
    returns (uint256) 
{
    // ... checks ...
    
    // ✅ FoT-aware: Đo balance TRƯỚC KHI nhận token
    uint256 balBefore = IERC20(asset).balanceOf(address(this));
    
    // ✅ SafeERC20: Chuyển token an toàn
    IERC20(asset).safeTransferFrom(msg.sender, address(this), transferAmount);
    
    // ✅ FoT-aware: Đo balance SAU KHI nhận token
    uint256 received = IERC20(asset).balanceOf(address(this)) - balBefore;
    uint256 received1e18 = _to1e18(received, r.decimals);
    
    // ✅ Sử dụng received (số thực nhận) thay vì amount
    if (received1e18 < repayAmount1e18) repayAmount1e18 = received1e18;
    
    // ✅ Cập nhật debt với số thực nhận
    uint256 newDebt = currentDebt - repayAmount1e18;
    u.borrow.principal = uint128(newDebt);
    
    // ...
}
```

**LendingPool.sol - Function `liquidationCall()`:**
```solidity
function liquidationCall(...) external nonReentrant {
    // ... checks ...
    
    // ✅ FoT-aware: Đo balance TRƯỚC KHI nhận token
    uint256 before = IERC20(debtAsset).balanceOf(address(this));
    
    // ✅ SafeERC20: Chuyển token an toàn
    IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), _from1e18(repay1e18, d.decimals));
    
    // ✅ FoT-aware: Đo balance SAU KHI nhận token
    uint256 received = IERC20(debtAsset).balanceOf(address(this)) - before;
    uint256 received1e18 = _to1e18(received, d.decimals);
    
    // ✅ Clamp theo số thực nhận
    if (received1e18 < repay1e18) { 
        repay1e18 = received1e18; 
    }
    
    // ✅ Tính seize amount dựa trên số thực nhận
    uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;
    uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;
    uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;
    
    // ...
}
```

### 2.3. SafeERC20 Library

**OpenZeppelin SafeERC20** cung cấp:
- ✅ Xử lý token không tuân thủ ERC20 chuẩn
- ✅ Xử lý token trả về `bool` hoặc không trả về gì
- ✅ Xử lý token revert thay vì trả về `false`

**Code:**
```solidity
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LendingPool is ReentrancyGuard {
    using SafeERC20 for IERC20; // ✅ Enable SafeERC20
    
    // Sử dụng safeTransfer thay vì transfer
    IERC20(asset).safeTransfer(msg.sender, transferOut);
    
    // Sử dụng safeTransferFrom thay vì transferFrom
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
}
```

### 2.4. Công Thức FoT-aware Delta

```
Delta = Balance_After - Balance_Before

Trong đó:
- Balance_Before: Số dư contract TRƯỚC KHI nhận token
- Balance_After: Số dư contract SAU KHI nhận token
- Delta: Số token thực tế nhận được (sau khi trừ phí)
```

**Ví dụ:**
```
User yêu cầu nạp: 100 PAXG
Balance_Before: 1000 PAXG
→ safeTransferFrom(100 PAXG)
→ Token trừ 2% phí → Contract chỉ nhận 98 PAXG
Balance_After: 1098 PAXG
Delta = 1098 - 1000 = 98 PAXG ✅

Contract ghi nhận: 98 PAXG (đúng với thực tế)
```

---

## 3. 🧹 Cơ Chế Xử Lý "Dust" Khi Hoàn Nợ

### 3.1. Vấn Đề: Dust Debt

**Dust debt** là các khoản nợ cực nhỏ (ví dụ: 0.000000000000001 USDC) không thể thanh toán hết do:
- Làm tròn số (rounding errors)
- Interest accrual tạo ra số lẻ rất nhỏ
- Precision loss trong tính toán

**Vấn đề:**
- User không thể thanh toán hết nợ
- Vị thế bị "treo" (stuck position)
- Hệ thống có nhiều "nợ ma" (ghost debt)
- Ảnh hưởng trải nghiệm người dùng

### 3.2. Giải Pháp: Dust Cleanup

**LendingPool.sol - Function `repay()`:**
```solidity
function repay(address asset, uint256 amount, address onBehalfOf) 
    external 
    nonReentrant 
    returns (uint256) 
{
    // ... checks và nhận token ...
    
    // ✅ Update user debt position
    uint256 newDebt = currentDebt - repayAmount1e18;
    
    // ✅ DUST CLEANUP: Clear dust based on token decimals
    // For 18 decimals (DAI): 1000 wei = 0.000000000000001
    // For 6 decimals (USDC): 1000000000000 wei (1e12) = 0.000001 USDC
    uint256 dustThreshold;
    if (r.decimals >= 18) {
        dustThreshold = 1000; // ~0.000000000000001 for 18 decimals
    } else {
        // Scale threshold: 1e12 for 6 decimals, 1e15 for 3 decimals, etc.
        dustThreshold = 10 ** (18 - r.decimals); 
    }
    
    // ✅ Nếu nợ còn lại < threshold → xóa về 0
    if (newDebt > 0 && newDebt < dustThreshold) {
        newDebt = 0;
    }
    
    u.borrow.principal = uint128(newDebt);
    u.borrow.index = r.variableBorrowIndex;
    
    // ...
}
```

### 3.3. Công Thức Dust Threshold

**Công thức:**
```
Dust Threshold = {
    1000 wei                    nếu decimals >= 18
    10^(18 - decimals) wei     nếu decimals < 18
}
```

**Ví dụ:**

| Token | Decimals | Dust Threshold | Giá Trị Thực Tế |
|-------|----------|----------------|-----------------|
| DAI   | 18       | 1000 wei       | 0.000000000000001 DAI |
| USDC  | 6        | 1e12 wei       | 0.000001 USDC |
| WBTC  | 8        | 1e10 wei       | 0.00000001 WBTC |

**Code:**
```solidity
uint256 dustThreshold;
if (r.decimals >= 18) {
    dustThreshold = 1000; // Fixed threshold for 18+ decimals
} else {
    // Scale: 1e12 for 6 decimals, 1e15 for 3 decimals
    dustThreshold = 10 ** (18 - r.decimals); 
}

// Cleanup: Nếu nợ < threshold → xóa về 0
if (newDebt > 0 && newDebt < dustThreshold) {
    newDebt = 0;
}
```

### 3.4. Dust Protection Khi Transfer

**LendingPool.sol - Function `repay()`:**
```solidity
// ✅ DUST PROTECTION: Nếu transferAmount làm tròn về 0, set minimum 1 wei
uint256 transferAmount = _from1e18(repayAmount1e18, r.decimals);

if (transferAmount == 0 && repayAmount1e18 > 0) {
    transferAmount = 1; // Minimum 1 wei để đảm bảo transfer thành công
}

uint256 balBefore = IERC20(asset).balanceOf(address(this));
IERC20(asset).safeTransferFrom(msg.sender, address(this), transferAmount);
uint256 received = IERC20(asset).balanceOf(address(this)) - balBefore;
```

**Tại sao cần?**
- Nếu `repayAmount1e18` rất nhỏ (ví dụ: 0.0000000000000001 USDC)
- Khi convert về native decimals (6 decimals) → `transferAmount = 0`
- ERC20 transfer với amount = 0 có thể revert
- Set minimum 1 wei để đảm bảo transfer thành công

### 3.5. Ví Dụ Cụ Thể

**Scenario:**
```
User nợ: 0.0000000000000015 DAI (1500 wei)
User trả: 0.000000000000001 DAI (1000 wei)
Nợ còn lại: 0.0000000000000005 DAI (500 wei)

Dust Threshold: 1000 wei
500 < 1000 → Xóa về 0 ✅

Kết quả: User không còn nợ, vị thế được giải phóng
```

**Nếu không có dust cleanup:**
```
Nợ còn lại: 500 wei
→ User không thể thanh toán (quá nhỏ)
→ Vị thế bị "treo"
→ User không thể withdraw collateral
→ Ảnh hưởng trải nghiệm
```

---

## 📊 Tóm Tắt

### ✅ ReentrancyGuard + CEI
- **Mục tiêu:** Ngăn reentrancy attack
- **Cách:** `nonReentrant` modifier + CEI pattern
- **Kết quả:** State được cập nhật trước khi external call

### ✅ SafeERC20 + FoT-aware Delta
- **Mục tiêu:** Xử lý Fee-on-Transfer tokens
- **Cách:** Đo `balanceOf` trước/sau, dùng delta thực tế
- **Kết quả:** Sổ cái chính xác, không thiếu hụt thanh khoản

### ✅ Dust Cleanup
- **Mục tiêu:** Xóa nợ cực nhỏ
- **Cách:** Threshold dựa trên decimals, auto cleanup
- **Kết quả:** Không có vị thế "treo", UX tốt hơn

---

## 🎯 Best Practices

1. **Luôn tuân thủ CEI:** Checks → Effects → Interactions
2. **Luôn dùng SafeERC20:** Cho mọi token transfer
3. **Luôn đo delta:** Cho mọi token nhận vào
4. **Luôn cleanup dust:** Sau mọi thao tác tính toán nợ
5. **Luôn dùng nonReentrant:** Cho mọi function có external call







