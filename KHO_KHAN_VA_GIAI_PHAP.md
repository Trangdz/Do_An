# 🎯 Khó Khăn Lớn Nhất Khi Làm Dự Án LendHub

## 📋 Tổng Quan

Khi được hỏi về khó khăn lớn nhất trong dự án, em có thể trả lời dựa trên các vấn đề thực tế đã gặp phải và giải quyết. Dưới đây là các khó khăn chính và cách em đã xử lý:

---

## 🔴 Khó Khăn #1: Xử Lý Precision và Scientific Notation

### Vấn Đề

**Khó khăn:** Khi người dùng trả nợ với số tiền rất nhỏ (ví dụ: 0.000000000000001 USDC), JavaScript tự động chuyển sang **scientific notation** (2.7e-7), nhưng `ethers.parseUnits()` không thể xử lý format này.

**Lỗi gặp phải:**
```
TypeError: invalid FixedNumber string value (argument="value", value="2.70083360753e-7", code=INVALID_ARGUMENT)
```

**Nguyên nhân:**
- JavaScript sử dụng floating-point (IEEE 754) → mất precision với số nhỏ
- `parseUnits()` chỉ nhận decimal string, không nhận scientific notation
- Khi debt rất nhỏ, tính toán tạo ra số như `2.7e-7` → parseUnits() fail

### Giải Pháp

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**

```typescript
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    // ✅ Convert scientific notation to decimal string if needed
    let amountStr = amount;
    if (amount.includes('e') || amount.includes('E')) {
      const num = parseFloat(amount);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${amount}`);
      }
      // ✅ Convert to fixed decimal string
      amountStr = num.toFixed(decimals);
    }
    
    return parseUnits(amountStr, decimals);
  } catch (error: any) {
    // ✅ Handle "too many decimals" by rounding
    if (error.code === 'NUMERIC_FAULT' && error.fault === 'underflow') {
      const num = parseFloat(amount);
      const rounded = num.toFixed(decimals);
      const trimmed = parseFloat(rounded).toString();
      return parseUnits(trimmed, decimals);
    }
    // ✅ Handle invalid FixedNumber (scientific notation)
    if (error.code === 'INVALID_ARGUMENT' && error.argument === 'value') {
      const num = parseFloat(amount);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${amount}`);
      }
      // Convert to fixed decimal string
      const fixed = num.toFixed(decimals);
      return parseUnits(fixed, decimals);
    }
    throw error;
  }
}
```

**Thêm xử lý trong RepayModal:**
```typescript
// ✅ Nếu debt < 0.000001 → set về 0
const MIN_DEBT_THRESHOLD = 0.000001;
if (parseFloat(userDebt) < MIN_DEBT_THRESHOLD) {
  setRepayAmount("0");
  toast.info("Nợ quá nhỏ, đã tự động làm tròn về 0");
  return;
}
```

### Bài Học

- ✅ Luôn convert scientific notation → decimal string trước khi parse
- ✅ Xử lý edge cases với số rất nhỏ (< 0.000001)
- ✅ Validate và round số trước khi gửi lên blockchain

---

## 🔴 Khó Khăn #2: Tính Toán Health Factor Không Đồng Nhất

### Vấn Đề

**Khó khăn:** Health Factor (HF) được tính khác nhau giữa:
- **Smart Contract:** Dùng `liqThresholdBps` (Liquidation Threshold)
- **Frontend (ban đầu):** Dùng `ltvBps` (Loan-to-Value)

**Hậu quả:**
- UI hiển thị HF = 0.96 (dựa trên LTV)
- Contract tính HF = 1.0187 (dựa trên Liquidation Threshold)
- User bối rối vì số liệu không khớp
- Có thể dẫn đến quyết định sai (rút quá nhiều → bị liquidate)

**Ví dụ:**
```
User có:
- Collateral: 1000 USDC (ltvBps = 80%, liqThresholdBps = 85%)
- Debt: 800 USDC

Frontend tính (SAI):
HF = (1000 * 0.80) / 800 = 0.96 ❌

Contract tính (ĐÚNG):
HF = (1000 * 0.85) / 800 = 1.0625 ✅
```

### Giải Pháp

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

**Trước (SAI):**
```javascript
// ❌ Dùng ltvBps cho HF calculation
const ltvBps = Number(reserveData?.ltvBps ?? 0);
const weighted = (supplyAmount * priceUSD) * (ltvBps / 10000);
```

**Sau (ĐÚNG):**
```javascript
// ✅ Dùng liqThresholdBps cho HF calculation
const liqThresholdBps = Number(reserveData?.liqThresholdBps ?? 0);
const useAsCollateral = Boolean(userReserve?.useAsCollateral);
let collateralUSD = 0;
if (supplyAmount > 0 && useAsCollateral && liqThresholdBps > 0) {
  const weighted = (supplyAmount * priceUSD) * (liqThresholdBps / 10000);
  if (Number.isFinite(weighted)) {
    collateralUSD = weighted;
  }
}
```

**Contract: `LendingPool.sol`**
```solidity
// ✅ Contract đã đúng từ đầu
uint256 weightedCollateral = (supplyValueUSD * uint256(r.liqThresholdBps)) / 10000;
```

### Bài Học

- ✅ **Luôn đồng bộ logic giữa Frontend và Smart Contract**
- ✅ **Hiểu rõ sự khác biệt giữa LTV và Liquidation Threshold:**
  - **LTV (Loan-to-Value):** Tỷ lệ vay tối đa khi mở vị thế
  - **Liquidation Threshold:** Ngưỡng thanh lý (thường > LTV)
- ✅ **Test với nhiều scenarios:** So sánh kết quả Frontend vs Contract

---

## 🔴 Khó Khăn #3: Xử Lý Fee-on-Transfer (FoT) Tokens

### Vấn Đề

**Khó khăn:** Một số token (như PAXG, STA) có cơ chế **Fee-on-Transfer**: Khi chuyển token, một phần bị trừ làm phí.

**Ví dụ:**
```
User yêu cầu nạp: 100 PAXG
→ Token trừ 2% phí
→ Contract chỉ nhận được: 98 PAXG
→ Nhưng nếu dùng `amount` (100) → Sổ cái sai
```

**Hậu quả:**
- Sổ cái ghi 100 PAXG, thực tế chỉ có 98 PAXG
- Thiếu hụt thanh khoản
- Pool có thể bị rút cạn

### Giải Pháp

**File: `contracts/core/LendingPool.sol`**

```solidity
function lend(address asset, uint256 amount) external {
    // ... checks ...
    
    // ✅ FoT-aware: Đo balance TRƯỚC KHI nhận token
    uint256 balBefore = IERC20(asset).balanceOf(address(this));
    
    // ✅ SafeERC20: Chuyển token an toàn
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    
    // ✅ FoT-aware: Đo balance SAU KHI nhận token
    uint256 delta = IERC20(asset).balanceOf(address(this)) - balBefore;
    
    // ✅ Sử dụng delta (số thực nhận) thay vì amount
    uint256 delta1e18 = _to1e18(delta, r.decimals);
    
    // ✅ Cập nhật state với delta thực tế
    uint256 sNew = sNow + delta1e18; // Dùng delta, không dùng amount
    u.supply.principal = uint128(sNew);
    r.reserveCash = uint128(uint256(r.reserveCash) + delta1e18);
}
```

**Áp dụng tương tự cho `repay()` và `liquidationCall()`:**
```solidity
// repay()
uint256 balBefore = IERC20(asset).balanceOf(address(this));
IERC20(asset).safeTransferFrom(msg.sender, address(this), transferAmount);
uint256 received = IERC20(asset).balanceOf(address(this)) - balBefore;
uint256 received1e18 = _to1e18(received, r.decimals);
if (received1e18 < repayAmount1e18) repayAmount1e18 = received1e18;
```

### Bài Học

- ✅ **Luôn đo `balanceOf` trước và sau khi nhận token**
- ✅ **Dùng delta (số thực nhận) thay vì amount (số yêu cầu)**
- ✅ **Áp dụng cho TẤT CẢ functions nhận token:** `lend()`, `repay()`, `liquidationCall()`

---

## 🔴 Khó Khăn #4: Xử Lý "Dust" Debt

### Vấn Đề

**Khó khăn:** Sau khi trả nợ, có thể còn lại nợ cực nhỏ (dust) do:
- Làm tròn số (rounding errors)
- Interest accrual tạo ra số lẻ rất nhỏ
- Precision loss trong tính toán

**Ví dụ:**
```
User nợ: 0.0000000000000015 DAI (1500 wei)
User trả: 0.000000000000001 DAI (1000 wei)
Nợ còn lại: 0.0000000000000005 DAI (500 wei)

→ User không thể thanh toán hết (quá nhỏ)
→ Vị thế bị "treo" (stuck position)
→ User không thể withdraw collateral
```

### Giải Pháp

**File: `contracts/core/LendingPool.sol`**

```solidity
function repay(address asset, uint256 amount, address onBehalfOf) 
    external 
    nonReentrant 
    returns (uint256) 
{
    // ... nhận token và tính newDebt ...
    
    uint256 newDebt = currentDebt - repayAmount1e18;
    
    // ✅ DUST CLEANUP: Clear dust based on token decimals
    uint256 dustThreshold;
    if (r.decimals >= 18) {
        dustThreshold = 1000; // ~0.000000000000001 for 18 decimals
    } else {
        // Scale threshold: 1e12 for 6 decimals, 1e15 for 3 decimals
        dustThreshold = 10 ** (18 - r.decimals); 
    }
    
    // ✅ Nếu nợ còn lại < threshold → xóa về 0
    if (newDebt > 0 && newDebt < dustThreshold) {
        newDebt = 0;
    }
    
    u.borrow.principal = uint128(newDebt);
    // ...
}
```

**Dust Threshold theo decimals:**
| Token | Decimals | Threshold | Giá Trị Thực Tế |
|-------|----------|-----------|-----------------|
| DAI   | 18       | 1000 wei  | 0.000000000000001 DAI |
| USDC  | 6        | 1e12 wei  | 0.000001 USDC |
| WBTC  | 8        | 1e10 wei  | 0.00000001 WBTC |

### Bài Học

- ✅ **Xử lý dust dựa trên decimals của token**
- ✅ **Threshold phù hợp:** Không quá lớn (mất tiền user), không quá nhỏ (không hiệu quả)
- ✅ **Áp dụng cho tất cả operations liên quan đến debt**

---

## 🔴 Khó Khăn #5: Decimal Conversion và Precision Loss

### Vấn Đề

**Khó khăn:** Dự án hỗ trợ nhiều token với decimals khác nhau:
- **18 decimals:** DAI, WETH
- **6 decimals:** USDC, USDT
- **8 decimals:** WBTC

**Vấn đề:**
- Contract lưu tất cả với **18 decimals (WAD format)**
- Cần convert qua lại giữa native decimals ↔ 18 decimals
- Precision loss khi convert có thể tích lũy theo thời gian

**Ví dụ:**
```
USDC (6 decimals): 100.123456 USDC
→ Convert to 18 decimals: 100123456000000000000 (1e20)
→ Convert back: 100.123456 USDC ✅

Nhưng nếu có rounding:
→ Convert: 100.123456789 USDC
→ Round to 6 decimals: 100.123457 USDC
→ Precision loss: 0.000000789 USDC
```

### Giải Pháp

**File: `contracts/core/LendingPool.sol`**

```solidity
// ✅ Helper functions để convert decimals
function _to1e18(uint256 amount, uint8 decimals) internal pure returns (uint256) {
    if (decimals == 18) return amount;
    if (decimals < 18) {
        return amount * (10 ** (18 - decimals));
    } else {
        return amount / (10 ** (decimals - 18));
    }
}

function _from1e18(uint256 amount1e18, uint8 decimals) internal pure returns (uint256) {
    if (decimals == 18) return amount1e18;
    if (decimals < 18) {
        return amount1e18 / (10 ** (18 - decimals));
    } else {
        return amount1e18 * (10 ** (decimals - 18));
    }
}
```

**Best Practices:**
- ✅ **Luôn normalize về 18 decimals trong contract**
- ✅ **Chỉ convert khi cần transfer (external call)**
- ✅ **Sử dụng integer math (không dùng float)**
- ✅ **Test với nhiều decimals khác nhau**

### Bài Học

- ✅ **Chuẩn hóa format:** Tất cả tính toán trong contract dùng 18 decimals
- ✅ **Convert chỉ khi cần:** Khi transfer hoặc hiển thị UI
- ✅ **Test edge cases:** Số rất nhỏ, số rất lớn, decimals khác nhau

---

## 🔴 Khó Khăn #6: Governance Proposal Parsing

### Vấn Đề

**Khó khăn:** Khi tạo proposal để thay đổi liquidation bonus, cần parse giá trị từ proposal description.

**Vấn đề:**
- Proposal description là string: `"Update liquidation bonus to 5.00%"`
- Contract cần extract số `5.00` từ string
- Phải xử lý nhiều format: `"5%"`, `"5.00%"`, `"5.0%"`, `"5 %"`

### Giải Pháp

**File: `contracts/governance/LendHubGovernor.sol`**

```solidity
function _extractProposedLiquidationBonus(string memory description) 
    internal 
    pure 
    returns (uint16) 
{
    // ✅ Parse từ description: "Update liquidation bonus to 5.00%"
    bytes memory descBytes = bytes(description);
    
    // Tìm pattern: "bonus to X.XX%"
    // Extract số từ string
    // Convert sang basis points (5.00% = 500 bps)
    
    // Implementation...
}
```

**Frontend: `lendhub-frontend-nextjs/src/pages/governance/create.tsx`**
```typescript
// ✅ Format description với giá trị rõ ràng
const description = `Update liquidation bonus for ${assetSymbol} from ${currentBonus}% to ${proposedBonus}%`;

// ✅ Parse lại khi execute proposal
const bonusMatch = description.match(/to ([\d.]+)%/);
const proposedBonus = parseFloat(bonusMatch[1]);
```

### Bài Học

- ✅ **Format description chuẩn:** Dễ parse, tránh ambiguity
- ✅ **Validate input:** Đảm bảo giá trị hợp lệ
- ✅ **Test với nhiều formats:** Edge cases

---

## 📊 Tóm Tắt: Khó Khăn Lớn Nhất

### 🎯 **Câu Trả Lời Ngắn Gọn:**

> **"Khó khăn lớn nhất của em là xử lý precision và đồng bộ logic giữa Frontend và Smart Contract.**
> 
> **Cụ thể:**
> 1. **Precision Loss:** JavaScript dùng floating-point, khiến số nhỏ chuyển sang scientific notation, không tương thích với `ethers.parseUnits()`. Em đã xử lý bằng cách detect và convert scientific notation → decimal string.
> 
> 2. **Health Factor Calculation:** Ban đầu Frontend dùng `ltvBps` (Loan-to-Value) để tính HF, nhưng Contract dùng `liqThresholdBps` (Liquidation Threshold). Điều này khiến UI hiển thị HF khác với on-chain, gây nhầm lẫn cho user. Em đã fix bằng cách đồng bộ Frontend dùng `liqThresholdBps` như Contract.
> 
> 3. **Fee-on-Transfer Tokens:** Một số token trừ phí khi transfer, khiến số ghi nhận khác số thực nhận. Em đã xử lý bằng cách đo `balanceOf` trước/sau, dùng delta thực tế thay vì amount yêu cầu.
> 
> **Bài học:** Trong DeFi, precision và consistency giữa các layer (Frontend ↔ Contract) là cực kỳ quan trọng. Một sai sót nhỏ có thể dẫn đến thiếu hụt thanh khoản hoặc mất tiền của user."

### 📝 **Câu Trả Lời Chi Tiết (Nếu Có Thời Gian):**

Có thể trình bày theo format:
1. **Vấn đề:** Mô tả khó khăn
2. **Nguyên nhân:** Tại sao xảy ra
3. **Giải pháp:** Cách em xử lý
4. **Kết quả:** Kết quả sau khi fix
5. **Bài học:** Rút ra kinh nghiệm

---

## 🎓 Kỹ Năng Đã Học Được

1. ✅ **Xử lý precision trong JavaScript/TypeScript**
2. ✅ **Đồng bộ logic giữa Frontend và Smart Contract**
3. ✅ **Xử lý edge cases:** Scientific notation, dust, FoT tokens
4. ✅ **Best practices trong DeFi:** CEI pattern, SafeERC20, ReentrancyGuard
5. ✅ **Testing và debugging:** So sánh Frontend vs Contract results

---

## 💡 Lời Khuyên

- ✅ **Luôn test với edge cases:** Số rất nhỏ, số rất lớn, decimals khác nhau
- ✅ **Đồng bộ logic:** Frontend phải match với Contract
- ✅ **Document rõ ràng:** Giải thích tại sao làm như vậy
- ✅ **Code review:** Nhờ người khác review để phát hiện lỗi
- ✅ **Learn from mistakes:** Mỗi bug là một bài học

