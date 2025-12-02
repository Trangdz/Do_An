# 🔧 HƯỚNG DẪN DEMO LIQUIDATION - CHI TIẾT

## ❌ VẤN ĐỀ THƯỜNG GẶP

1. **Trang `/liquidations` không hiển thị user nào**
   - Nguyên nhân: Không có user nào có Health Factor < 1.0
   - Giải pháp: Tạo tình huống HF < 1.0 theo hướng dẫn bên dưới

2. **Không tìm thấy user trong 5000 block gần nhất**
   - Nguyên nhân: User vay quá lâu trước đó (> 5000 blocks)
   - Giải pháp: Vay mới hoặc tăng số block tìm kiếm (sửa code)

3. **Health Factor không giảm xuống < 1.0**
   - Nguyên nhân: Vay chưa đủ gần giới hạn LTV
   - Giải pháp: Vay gần 75% LTV hoặc vay thêm

---

## ✅ GIẢI PHÁP: TẠO TÌNH HUỐNG LIQUIDATION DỄ DÀNG

### 📋 CHUẨN BỊ

**Cần 2 tài khoản:**
- **Account A (Borrower)**: Sẽ bị thanh lý
- **Account B (Liquidator)**: Sẽ thực hiện thanh lý

**Token cần có:**
- Account A: Ít nhất 2,000 DAI (hoặc WETH)
- Account B: Ít nhất 1,000 USDC (hoặc token nợ)

---

## 🎯 PHƯƠNG PHÁP 1: VAY GẦN GIỚI HẠN LTV (ĐƠN GIẢN NHẤT)

### Bước 1: Gửi Collateral (Account A)

1. **Kết nối Account A** (ví dụ: Account 0)
2. Điều hướng đến `/deposit/DAI`
3. **Gửi 2,000 DAI** vào pool
4. Kiểm tra:
   - ✅ Supply: 2,000 DAI
   - ✅ Collateral Value: ~$2,000

### Bước 2: Vay Gần Giới Hạn (Account A)

1. Điều hướng đến `/borrow/USDC`
2. **Tính toán số lượng vay:**
   - Collateral: $2,000
   - LTV: 75%
   - **Borrowing Power**: $2,000 × 75% = **$1,500**
   - **Vay tối đa**: 1,500 USDC (≈ $1,500)

3. **Vay 1,450 USDC** (gần giới hạn, để lại buffer nhỏ)
   - Nhập: **1450 USDC**
   - Click **"Borrow"**
   - Confirm transaction

4. **Kiểm tra Health Factor:**
   - Dashboard → Health Factor: **~1.03 - 1.05** (rất gần nguy hiểm)
   - Total Collateral: ~$2,000
   - Total Debt: ~$1,450

### Bước 3: Vay Thêm Để HF < 1.0 (Account A)

1. **Vay thêm 100 USDC** (tổng = 1,550 USDC, vượt $1,500)
   - Điều hướng đến `/borrow/USDC`
   - Nhập: **100 USDC**
   - Click **"Borrow"**
   - **Lưu ý**: Transaction có thể revert nếu frontend check HF
   - **Nếu revert**: Thử vay ít hơn (50 USDC) hoặc dùng script

2. **Kiểm tra Health Factor sau khi vay:**
   - Dashboard → Health Factor: **< 1.0** (ví dụ: 0.97)
   - ✅ **Đã tạo tình huống nguy hiểm!**

### Bước 4: Kiểm tra Trang Liquidation (Account B)

1. **Chuyển sang Account B** (ví dụ: Account 1)
2. **Kết nối Account B** trong MetaMask
3. Điều hướng đến `/liquidations`
4. **Kết quả mong đợi:**
   - Danh sách hiển thị Account A
   - Health Factor: **0.97** (màu đỏ)
   - Status: **🔴 Có thể thanh lý**
   - Nút **"Thanh lý"** hiển thị

### Bước 5: Thực hiện Liquidation (Account B)

1. **Click nút "Thanh lý"** trên Account A
2. Modal hiện ra với thông tin:
   - **Borrower**: Địa chỉ Account A
   - **Debt Asset**: USDC (chọn từ dropdown)
   - **Collateral Asset**: DAI (chọn từ dropdown)
   - **Repay amount**: Nhập số lượng USDC muốn trả

3. **Nhập số lượng:**
   - **Repay amount**: **500 USDC** (một phần nợ)
   - Hoặc nhập **MAX** để trả tối đa (50% close factor = ~775 USDC)

4. **Kiểm tra ước tính:**
   - **Seize amount**: ~525 DAI (500 USDC + 5% bonus)
   - **Bonus**: 25 DAI (5%)

5. **Click "Xác nhận"**
6. MetaMask hiện popup:
   - **Transaction 1**: Approve USDC (nếu chưa approve)
   - **Transaction 2**: `liquidationCall(USDC, DAI, AccountA, 500 USDC)`
   - Gas: ~200,000 - 300,000
   - Click **"Confirm"**

7. **Đợi transaction confirm** (thường < 5 giây trên Ganache)

### Bước 6: Kiểm tra Kết quả

**Với Account B (Liquidator):**
- ✅ Wallet: USDC giảm 500, DAI tăng ~525
- ✅ Nhận được bonus 25 DAI

**Với Account A (Borrower):**
- ✅ Health Factor: Tăng từ 0.97 → ~1.3 (an toàn hơn)
- ✅ Debt: Giảm từ 1,550 → 1,050 USDC
- ✅ Collateral: Giảm từ 2,000 → ~1,475 DAI

---

## 🎯 PHƯƠNG PHÁP 2: SỬ DỤNG SCRIPT ĐỂ TẠO TÌNH HUỐNG (NẾU PHƯƠNG PHÁP 1 KHÔNG ĐƯỢC)

Nếu frontend không cho phép vay khi HF < 1.0, bạn có thể dùng script Hardhat:

### Tạo file script: `scripts/create_liquidation_scenario.cjs`

```javascript
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { CONFIG } = require("../lendhub-frontend-nextjs/src/config/contracts");

async function main() {
  const [deployer, borrower, liquidator] = await ethers.getSigners();
  
  console.log("Borrower:", borrower.address);
  console.log("Liquidator:", liquidator.address);
  
  const pool = await ethers.getContractAt("LendingPool", CONFIG.LENDING_POOL);
  const dai = await ethers.getContractAt("TokenWithWithdraw", CONFIG.DAI_ADDRESS);
  const usdc = await ethers.getContractAt("TokenWithWithdraw", CONFIG.USDC_ADDRESS);
  
  // 1. Mint tokens cho borrower
  await dai.mint(borrower.address, ethers.parseUnits("2000", 18));
  console.log("✅ Minted 2000 DAI to borrower");
  
  // 2. Borrower approve và supply
  await dai.connect(borrower).approve(pool.target, ethers.MaxUint256);
  await pool.connect(borrower).lend(dai.target, ethers.parseUnits("2000", 18));
  console.log("✅ Borrower supplied 2000 DAI");
  
  // 3. Borrower borrow gần giới hạn
  const borrowAmount = ethers.parseUnits("1500", 6); // 1500 USDC
  await pool.connect(borrower).borrow(usdc.target, borrowAmount);
  console.log("✅ Borrower borrowed 1500 USDC");
  
  // 4. Kiểm tra Health Factor
  const accountData = await pool.getAccountData(borrower.address);
  const hf = Number(ethers.formatEther(accountData.healthFactor1e18));
  console.log("📊 Health Factor:", hf.toFixed(2));
  
  if (hf < 1.0) {
    console.log("✅ Health Factor < 1.0 - Ready for liquidation!");
  } else {
    console.log("⚠️ Health Factor still > 1.0, borrowing more...");
    // Vay thêm để HF < 1.0
    const extraBorrow = ethers.parseUnits("100", 6);
    await pool.connect(borrower).borrow(usdc.target, extraBorrow);
    const newAccountData = await pool.getAccountData(borrower.address);
    const newHf = Number(ethers.formatEther(newAccountData.healthFactor1e18));
    console.log("📊 New Health Factor:", newHf.toFixed(2));
  }
  
  // 5. Mint USDC cho liquidator
  await usdc.mint(liquidator.address, ethers.parseUnits("1000", 6));
  console.log("✅ Minted 1000 USDC to liquidator");
  
  console.log("\n✅ Liquidation scenario created!");
  console.log("Borrower:", borrower.address);
  console.log("Liquidator:", liquidator.address);
  console.log("\n💡 Now go to /liquidations page with liquidator account");
}

main().catch(console.error);
```

### Chạy script:

```bash
npx hardhat run scripts/create_liquidation_scenario.cjs --network ganache
```

---

## 🎯 PHƯƠNG PHÁP 3: TĂNG SỐ BLOCK TÌM KIẾM (NẾU KHÔNG TÌM THẤY USER)

Nếu trang `/liquidations` không tìm thấy user, có thể do:
- User vay quá lâu trước đó (> 5000 blocks)
- Cần tăng số block tìm kiếm

### Sửa file: `lendhub-frontend-nextjs/src/pages/liquidations.tsx`

Tìm dòng:
```typescript
const fromBlock = Math.max(0, current - 5000);
```

Sửa thành:
```typescript
const fromBlock = Math.max(0, current - 50000); // Tăng lên 50k blocks
```

Hoặc tìm từ block 0:
```typescript
const fromBlock = 0; // Tìm từ đầu
```

---

## 🔍 KIỂM TRA VÀ DEBUG

### 1. Kiểm tra Health Factor trực tiếp

Mở Console (F12) và chạy:

```javascript
// Lấy provider và pool
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const poolAddress = '0x...'; // Lấy từ addresses.js
const poolABI = ['function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'];
const pool = new ethers.Contract(poolAddress, poolABI, provider);

// Kiểm tra Health Factor của user
const userAddress = '0x...'; // Địa chỉ Account A
const accountData = await pool.getAccountData(userAddress);
const hf = Number(ethers.formatEther(accountData.healthFactor1e18));
console.log('Health Factor:', hf);
```

### 2. Kiểm tra danh sách Borrowers

```javascript
// Lấy tất cả events Borrowed
const currentBlock = await provider.getBlockNumber();
const fromBlock = Math.max(0, currentBlock - 50000);
const logs = await provider.getLogs({
  address: poolAddress,
  topics: [ethers.id('Borrowed(address,address,uint256,uint256)')],
  fromBlock,
  toBlock: currentBlock
});
console.log('Borrowers found:', logs.length);
```

### 3. Kiểm tra trang Liquidation

1. Mở `/liquidations`
2. Mở Console (F12)
3. Xem log:
   - `Đang tải...` → Đang tìm borrowers
   - `Không có vị thế cần thanh lý` → Không có user nào có HF < 1.0
   - Danh sách user → Có user có HF < 1.0

---

## 📝 CHECKLIST DEMO LIQUIDATION

### Trước khi demo:
- [ ] Account A đã supply ít nhất 2,000 DAI
- [ ] Account A đã borrow gần giới hạn (HF < 1.0)
- [ ] Account B có đủ USDC để liquidate
- [ ] Trang `/liquidations` hiển thị Account A

### Trong khi demo:
- [ ] Giải thích Health Factor < 1.0 là gì
- [ ] Chỉ ra Account A trong danh sách
- [ ] Giải thích liquidation bonus (5%)
- [ ] Thực hiện liquidation
- [ ] Kiểm tra kết quả

### Sau khi demo:
- [ ] Account A Health Factor tăng
- [ ] Account B nhận được collateral + bonus
- [ ] Debt và Collateral giảm đúng

---

## 🚨 LỖI THƯỜNG GẶP VÀ CÁCH XỬ LÝ

### 1. "Không có vị thế cần thanh lý"

**Nguyên nhân:**
- Không có user nào có HF < 1.0
- User vay quá lâu (> 5000 blocks)

**Giải pháp:**
- Tạo tình huống mới (Phương pháp 1 hoặc 2)
- Tăng số block tìm kiếm (Phương pháp 3)

### 2. "Transaction revert: Health factor too high"

**Nguyên nhân:**
- Health Factor của borrower đã tăng > 1.0 (có thể do interest tăng collateral)

**Giải pháp:**
- Kiểm tra lại Health Factor trước khi liquidate
- Nếu HF > 1.0, cần tạo tình huống mới

### 3. "Insufficient balance"

**Nguyên nhân:**
- Liquidator không có đủ token để trả nợ

**Giải pháp:**
- Mint thêm token cho liquidator
- Hoặc giảm số lượng liquidate

### 4. "Close factor exceeded"

**Nguyên nhân:**
- Liquidate quá 50% nợ (close factor = 50%)

**Giải pháp:**
- Giảm số lượng liquidate xuống < 50% nợ

---

## 💡 TIPS CHO DEMO

1. **Chuẩn bị trước:**
   - Tạo tình huống liquidation trước khi demo
   - Test tất cả các bước
   - Chuẩn bị sẵn 2 tài khoản

2. **Trong khi demo:**
   - Giải thích Health Factor là gì
   - Chỉ ra tại sao HF < 1.0 là nguy hiểm
   - Giải thích liquidation bonus (incentive cho liquidator)
   - Chỉ ra Account A và Account B

3. **Sau khi demo:**
   - Tóm tắt lại quá trình
   - Nhấn mạnh tính năng bảo vệ protocol
   - Trả lời câu hỏi

---

## ✅ KẾT LUẬN

Với hướng dẫn trên, bạn có thể:
1. ✅ Tạo tình huống liquidation dễ dàng
2. ✅ Kiểm tra và debug vấn đề
3. ✅ Demo liquidation thành công

**Phương pháp đơn giản nhất:** Vay gần giới hạn LTV (75%) rồi vay thêm một chút để HF < 1.0.

Chúc bạn demo thành công! 🚀









