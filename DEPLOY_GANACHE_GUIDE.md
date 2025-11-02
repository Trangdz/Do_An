# 🚀 HƯỚNG DẪN DEPLOY VÀ TEST VỚI GANACHE

## 📋 Yêu cầu

1. **Ganache** đã cài đặt và chạy
2. **Node.js** và **npm** đã cài đặt
3. **MetaMask** extension

## 🔧 Bước 1: Khởi động Ganache

### Option A: Ganache GUI
1. Mở Ganache GUI
2. Tạo workspace mới hoặc mở workspace có sẵn
3. Đảm bảo RPC Server đang chạy ở: `http://127.0.0.1:8545`
4. Chain ID: `1337` (hoặc `5777` tùy phiên bản)

### Option B: Ganache CLI
```bash
ganache-cli -p 8545 -i 1337
```

## 🚀 Bước 2: Deploy Contracts

```bash
# Từ thư mục gốc lendhub_v2
npx hardhat run scripts/deploy_ganache.cjs --network ganache
```

Script sẽ tự động:
- ✅ Deploy tất cả contracts (USDC, DAI, WETH, LendingPool, Oracle, InterestRateModel)
- ✅ Setup oracle prices
- ✅ Initialize reserves
- ✅ Mint tokens cho test accounts
- ✅ **Test lending (cho vay)**
- ✅ **Test borrowing (vay)**
- ✅ **Test withdraw (rút tiền)**
- ✅ **Test repay (trả nợ)**
- ✅ **Test repay all (trả hết nợ - DEBT VỀ 0!)**
- ✅ Update frontend config tự động

## 📊 Kết quả mong đợi

```
🎉 DEPLOYMENT TO GANACHE COMPLETE!

📋 CONTRACT ADDRESSES:
LendingPool: 0x...
USDC: 0x...
DAI: 0x...
WETH: 0x...

✅ All tests passed!
✅ DEBT CLEARED TO ZERO! 🎉
```

## 🌐 Bước 3: Setup MetaMask

### 1. Thêm Ganache Network
- **Network Name**: Ganache Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `1337`
- **Currency Symbol**: ETH

### 2. Import Account
Từ Ganache, copy **Private Key** của account đầu tiên và import vào MetaMask

## 🖥️ Bước 4: Khởi động Frontend

```bash
cd lendhub-frontend-nextjs
npm run dev
```

Frontend sẽ chạy ở: `http://localhost:3000`

## ✅ Bước 5: Test Các Chức Năng

### 1. **Lending (Cho vay)**
- Chọn token (USDC, DAI, WETH)
- Nhập số lượng
- Click "Lend"
- ✅ Kiểm tra: Balance giảm, Supply tăng

### 2. **Borrowing (Vay)**
- **Lưu ý**: Cần có collateral trước (ví dụ: lend WETH)
- Chọn token muốn vay
- Nhập số lượng
- Click "Borrow"
- ✅ Kiểm tra: Balance tăng, Debt tăng

### 3. **Withdraw (Rút tiền)**
- Chọn token đã lend
- Nhập số lượng muốn rút
- Click "Withdraw"
- ✅ Kiểm tra: Balance tăng, Supply giảm
- ⚠️ **Lưu ý**: Không thể rút nếu đang dùng làm collateral

### 4. **Repay (Trả nợ)**
- Chọn token đang nợ
- Nhập số lượng muốn trả
- Click "Repay"
- ✅ Kiểm tra: Debt giảm

### 5. **Repay All (Trả hết nợ) - QUAN TRỌNG!**
- Chọn token đang nợ
- Click nút **"MAX"**
- Click "Repay"
- ✅ Kiểm tra: **Debt về 0 hoàn toàn!** 🎯

## 🔍 Kiểm tra Logic

### ✅ Lending Logic
- [ ] Token được transfer vào contract
- [ ] Supply balance tăng đúng số lượng
- [ ] Có thể set/unset collateral

### ✅ Borrowing Logic
- [ ] Cần có đủ collateral (LTV < threshold)
- [ ] Token được transfer ra cho user
- [ ] Borrow balance tăng đúng
- [ ] Interest accrual hoạt động

### ✅ Withdraw Logic
- [ ] Không thể rút quá số đã lend
- [ ] Không thể rút nếu làm collateral cho khoản vay
- [ ] Token được transfer về user
- [ ] Supply balance giảm đúng

### ✅ Repay Logic
- [ ] Token được transfer vào contract
- [ ] Borrow balance giảm đúng
- [ ] Interest được tính chính xác

### ✅ Repay All Logic (QUAN TRỌNG NHẤT!)
- [ ] Click MAX → amount = "REPAY_ALL"
- [ ] Frontend tính debt + 20% buffer
- [ ] Contract cap amount về đúng debt
- [ ] **Dust protection**: transfer tối thiểu 1 wei
- [ ] **Dust cleanup**: debt < 1000 wei → về 0
- [ ] **Final check**: Debt === 0n ✅

## 🐛 Xử lý lỗi thường gặp

### ❌ "Cannot connect to Ganache"
**Giải pháp**: Đảm bảo Ganache đang chạy ở `http://127.0.0.1:8545`

### ❌ "Insufficient funds"
**Giải pháp**: 
1. Check balance của account trong Ganache
2. Re-deploy để mint tokens mới

### ❌ "Insufficient collateral"
**Giải pháp**: 
1. Lend thêm WETH hoặc token khác làm collateral
2. Giảm số lượng muốn vay

### ❌ "Cannot withdraw - used as collateral"
**Giải pháp**: 
1. Repay hết debt trước
2. Hoặc toggle off "Use as collateral" (nếu health factor cho phép)

### ❌ "Repay all still leaves debt"
**Giải pháp**: 
- Đây là bug cũ, đã được fix trong version hiện tại
- Đảm bảo bạn đã deploy contract mới nhất
- Check console log để thấy dust protection hoạt động

## 📁 File quan trọng

### Contract với Dust Protection
- `contracts/core/LendingPool.sol`
  - Line 326-329: Dust protection (minimum 1 wei transfer)
  - Line 342-345: Dust cleanup (debt < 1000 wei → 0)
  - Line 353-359: Underflow protection

### Frontend với Repay All Logic
- `lendhub-frontend-nextjs/src/components/RepayModal.tsx`
  - "REPAY_ALL" mode
  - Round up conversion từ 1e18
  - 20% buffer cho interest accrual
  - Cap to user balance

### Deployment Info
- `deployment-info-ganache.json` - Tất cả addresses sau khi deploy
- `lendhub-frontend-nextjs/src/addresses.js` - Frontend config
- `lendhub-frontend-nextjs/.env.local` - Environment variables

## 🎯 Kết luận

Sau khi deploy và test, bạn có thể:
- ✅ Cho vay (lend) các token
- ✅ Vay (borrow) với collateral
- ✅ Rút tiền (withdraw)
- ✅ Trả nợ (repay)
- ✅ **Trả hết nợ và đưa debt về 0 hoàn toàn** (repay all) 🎉

**Tất cả logic đều hoạt động đúng và có thông báo rõ ràng cho người dùng!**

## 📞 Hỗ trợ

Nếu gặp vấn đề, check:
1. Ganache console logs
2. Browser console (F12)
3. MetaMask transactions
4. `deployment-info-ganache.json` để verify addresses

