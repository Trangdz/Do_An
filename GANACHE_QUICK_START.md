# 🚀 GANACHE QUICK START - 10 USERS DEMO

## 📋 Bước 1: Khởi động Ganache

### Sử dụng lệnh này:

```bash
ganache-cli -p 7545 -i 1337 -m "test test test test test test test test test test test junk"
```

**Hoặc nếu dùng Ganache GUI:**
1. Mở Ganache
2. New Workspace
3. Settings → Server:
   - PORT: `7545`
   - NETWORK ID: `1337`
4. Settings → Accounts & Keys:
   - MNEMONIC: `test test test test test test test test test test test junk`
   - ACCOUNT DEFAULT BALANCE: `100` ETH
5. Save Workspace

---

## 📦 Bước 2: Deploy Contracts

```bash
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

### Script sẽ tự động:
- ✅ Deploy WETH, DAI, USDC, LINK
- ✅ Deploy LendingPool, Oracle, InterestRateModel
- ✅ Setup oracle prices
- ✅ Initialize reserves với dust protection
- ✅ **Mint tokens cho 10 users:**
  - **100 WETH** mỗi user
  - **50,000 DAI** mỗi user
  - **50,000 USDC** mỗi user
  - **10,000 LINK** mỗi user
- ✅ Update frontend config tự động

---

## 🦊 Bước 3: Setup MetaMask

### 1. Add Ganache Network:
- **Network Name**: Ganache Local
- **RPC URL**: `http://127.0.0.1:7545`
- **Chain ID**: `1337`
- **Currency Symbol**: ETH

### 2. Import Accounts:

Bạn có thể import bất kỳ account nào trong 10 accounts.

**Cách lấy Private Key:**

#### Option A: Từ Ganache CLI
Khi chạy `ganache-cli`, nó sẽ hiện 10 private keys:
```
Available Accounts
==================
(0) 0x... (100 ETH)
(1) 0x... (100 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

Copy private key và import vào MetaMask.

#### Option B: Từ Ganache GUI
1. Click vào icon 🔑 bên cạnh mỗi account
2. Copy private key
3. Import vào MetaMask

---

## 🌐 Bước 4: Start Frontend

```bash
cd lendhub-frontend-nextjs
npm run dev
```

Frontend chạy tại: `http://localhost:3000`

---

## 🎮 Bước 5: Test Demo

### Bạn có 10 users, mỗi user có:
- ✅ 100 ETH (gas)
- ✅ 100 WETH (collateral)
- ✅ 50,000 DAI (lend/borrow)
- ✅ 50,000 USDC (lend/borrow)
- ✅ 10,000 LINK (lend/borrow)

### Test scenarios:

#### 1. **Lend (Cho vay)**
- Connect user 0
- Lend 10,000 DAI → Supply balance tăng

#### 2. **Borrow (Vay)**
- Connect user 1
- Lend 10 WETH (collateral)
- Borrow 5,000 DAI → Debt balance tăng

#### 3. **Repay (Trả nợ)**
- Repay 2,000 DAI → Debt giảm

#### 4. **Repay All (Trả hết nợ)**
- Click **MAX** button
- Repay → **Debt về 0!** ✅

#### 5. **Withdraw (Rút tiền)**
- Withdraw DAI đã lend

---

## 🔄 Reset Ganache (nếu cần)

Nếu muốn reset lại từ đầu:

1. Stop Ganache (Ctrl+C hoặc GUI Stop)
2. Start lại với cùng mnemonic
3. Re-deploy: `npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache`

---

## 📊 Kiểm tra kết nối

```bash
npx hardhat run scripts/check_ganache.cjs --network ganache
```

Sẽ hiện:
```
✅ Connected to network: ganache (1337)
✅ Found 10 signers
✅ Current block: 0
🎉 Ganache is ready!
```

---

## 🎯 TÓM TẮT

```
MNEMONIC: test test test test test test test test test test test junk
RPC: http://127.0.0.1:7545
CHAIN ID: 1337
USERS: 10 (mỗi user có 100 WETH, 50K DAI, 50K USDC, 10K LINK)
```

**Sau deploy, tất cả 10 users đều có đầy đủ tokens để demo!** 🎉

---

## ❓ Troubleshooting

### Lỗi "insufficient funds"
→ Đảm bảo Ganache đang chạy với đúng mnemonic

### Lỗi "cannot connect"
→ Check Ganache đang chạy tại `http://127.0.0.1:7545`

### Lỗi "wrong chain ID"
→ Đảm bảo Ganache chain ID là `1337`

### MetaMask không thấy tokens
→ Import token addresses từ console log sau khi deploy

---

**Happy Testing! 🚀**

