# 🔑 Hướng dẫn lấy Private Key từ Ganache và Import vào MetaMask

## ⚠️ VẤN ĐỀ HIỆN TẠI

Bạn đang thấy:
- ✅ 100 ETH (native token from Ganache)
- ❌ 0 WETH, 0 DAI, 0 USDC, 0 LINK

**Nguyên nhân:** Bạn đang dùng **SAI ACCOUNT** trong MetaMask!

**Account đúng** (có tất cả tokens):
```
0xC42B5Ed782ebE05C3621b601be03b89E86ed5558
```

Tokens của account này:
- 99.99 ETH
- 1,000,000 WETH
- 1,000,000 DAI
- 1,000,000 USDC
- 1,000,000 LINK

---

## 📝 BƯỚC 1: TÌM CỬA SỔ GANACHE

### Option 1: Dùng Alt + Tab

1. Nhấn **`Alt + Tab`** nhiều lần
2. Xem từng cửa sổ PowerShell
3. Tìm cửa sổ có text giống như sau:

```
┌─────────────────────────────────────────────────┐
│  ganache v7.9.1 (@ganache/cli: 0.10.1, ...)   │
│  Starting RPC server                            │
│                                                 │
│  Available Accounts                             │
│  ==================                             │
│  (0) 0xC42B5Ed782ebE05C3621b601be03b89E86ed5558│  <-- Đây là account bạn cần!
│  (1) 0xabaf3554008411a0b3cceb7453eaac401631c5dc│
│  (2) 0xf639e4645788ca15d3ac7e65d44b1aeab5b0465a│
│  ...                                            │
│                                                 │
│  Private Keys                                   │
│  ==================                             │
│  (0) 0xabc123def456... <-- COPY CÁI NÀY!!!     │
│  (1) 0x...                                      │
│  (2) 0x...                                      │
└─────────────────────────────────────────────────┘
```

### Option 2: Tìm trong Taskbar

1. Nhìn vào **Taskbar** (thanh dưới cùng màn hình)
2. Tìm icon **PowerShell** (có thể có nhiều icon)
3. **Hover** chuột lên từng icon để xem preview
4. Tìm cửa sổ có text **"ganache"** hoặc **"Available Accounts"**

### Option 3: Task Manager

1. Nhấn **`Ctrl + Shift + Esc`** mở Task Manager
2. Tab **"Details"**
3. Tìm **powershell.exe** processes
4. Click phải → **"Switch to"** để mở từng cửa sổ
5. Tìm cửa sổ có Ganache output

---

## 📋 BƯỚC 2: LẤY PRIVATE KEY

Khi đã tìm thấy cửa sổ Ganache:

1. **Scroll lên TRÊN CÙNG** của cửa sổ:
   - Nhấn **`Ctrl + Home`** (jump to top)
   - Hoặc dùng chuột scroll lên

2. **Tìm section "Private Keys"**:
   ```
   Private Keys
   ==================
   (0) 0xabc123def456789... <-- Account (0) - COPY CÁI NÀY
   (1) 0x...
   (2) 0x...
   ```

3. **Copy private key của Account (0)**:
   - Bôi đen private key (bắt đầu từ `0x` đến hết)
   - Click chuột phải → Copy
   - Hoặc nhấn **`Ctrl + C`**

⚠️ **LƯU Ý:**
- Private key BẮT ĐẦU bằng `0x`
- Private key dài khoảng 66 ký tự (bao gồm `0x`)
- Ví dụ: `0xabc123def456789...` (66 chars total)

---

## 📱 BƯỚC 3: IMPORT VÀO METAMASK

### 3.1. Mở MetaMask

1. Click vào **icon MetaMask** ở góc trên phải browser
2. Nếu đã lock, unlock bằng password

### 3.2. Import Account

1. Click vào **icon account** (hình tròn/avatar ở góc trên bên phải MetaMask)
2. Trong dropdown menu, chọn **"Import Account"**
3. **"Select Type"** → Chọn **"Private Key"**
4. **"Paste your private key string here"** → Paste private key vừa copy:
   ```
   0xabc123def456789...
   ```
5. Click nút **"Import"**

### 3.3. Kiểm tra Account

Sau khi import, kiểm tra:

✅ **Address phải là:** `0xC42B5Ed782ebE05C3621b601be03b89E86ed5558`
- Nhìn ở góc trên MetaMask, copy address và so sánh

✅ **ETH Balance phải là:** ~99.99 ETH
- Nếu thấy 100 ETH hoặc 99.99 ETH là đúng

❌ **Nếu thấy 100 ETH nhưng address KHÁC** → Bạn import sai account!
- Kiểm tra lại private key
- Phải là private key của Account (0), không phải (1), (2), etc.

---

## 🌐 BƯỚC 4: KIỂM TRA NETWORK

### 4.1. Chọn Network

1. Click vào **dropdown network** ở góc trên bên trái MetaMask
2. Chọn **"Ganache Local"**

### 4.2. Nếu chưa có "Ganache Local" network

1. Click dropdown network → **"Add network"** → **"Add a network manually"**
2. Điền thông tin:

```
Network Name:     Ganache Local
New RPC URL:      http://127.0.0.1:7545
Chain ID:         1337
Currency Symbol:  ETH
```

⚠️ **QUAN TRỌNG:**
- RPC URL phải là `http://127.0.0.1:7545` (PORT **7545**, KHÔNG phải 7545!)
- Chain ID phải là `1337`

3. Click **"Save"**
4. Chọn network **"Ganache Local"** vừa tạo

---

## ✅ BƯỚC 5: KIỂM TRA KẾT QUẢ

### 5.1. Refresh Frontend

1. Mở browser → `http://localhost:3000`
2. Nhấn **`Ctrl + Shift + R`** (hard refresh)
3. Click **"Connect Wallet"**
4. Chọn account `0xC42B...558`

### 5.2. Kiểm tra Dashboard

Bây giờ bạn sẽ thấy:

✅ **Assets to supply:**
- ETH: 100 ETH
- WETH: 1,000,000 WETH
- DAI: 1,000,000 DAI
- USDC: 1,000,000 USDC
- LINK: 1,000,000 LINK

✅ **Collateral Value:** $0 (chưa supply)
✅ **Debt Value:** $0 (chưa borrow)
✅ **Health Factor:** ∞ (healthy)

---

## 🆘 TROUBLESHOOTING

### ❌ "Không tìm thấy cửa sổ Ganache"

**Ganache có thể đã bị tắt.** Hãy khởi động lại:

```bash
# Trong terminal/PowerShell tại thư mục project
npx ganache --port 7545 --chain.chainId 1337 --wallet.mnemonic "test test test test test test test test test test test junk" --wallet.totalAccounts 10
```

Sau đó:
1. **NGAY LẬP TỨC** scroll lên và copy private key của Account (0)
2. Lưu vào notepad để sau này dùng lại
3. Chạy lại deploy:
   ```bash
   npx hardhat run scripts/deploy_all_in_one.cjs --network ganache
   ```

### ❌ "Import xong nhưng vẫn thấy 0 tokens"

Kiểm tra:
1. **Address có đúng không?** → Phải là `0xC42B5Ed782ebE05C3621b601be03b89E86ed5558`
2. **Network có đúng không?** → Phải là "Ganache Local" (port 7545, Chain ID 1337)
3. **Contracts đã deploy chưa?** → Kiểm tra file `deployment-info.json` có tồn tại không
4. **Frontend addresses đúng chưa?** → Kiểm tra file `lendhub-frontend-nextjs/src/addresses.js`

Nếu vẫn lỗi, chạy lại deploy:
```bash
npx hardhat run scripts/deploy_all_in_one.cjs --network ganache
```

### ❌ "Private key invalid"

- Đảm bảo copy **CẢ** private key (bao gồm `0x`)
- Không có khoảng trắng thừa ở đầu/cuối
- Private key phải dài 66 ký tự (bao gồm `0x`)

### ❌ "Network khác Chain ID"

- Xóa network "Ganache Local" cũ trong MetaMask
- Add lại với **đúng** Chain ID = **1337** và RPC URL = `http://127.0.0.1:7545`

---

## 💾 LƯU PRIVATE KEY ĐỂ SAU NÀY DÙNG

⚠️ **CHỈ CHO DEVELOPMENT!** Không dùng private key này trên mainnet/testnet thật!

Sau khi có private key, bạn có thể lưu vào file `.env.local` (trong gitignore):

```
DEPLOYER_PRIVATE_KEY=0xabc123def...
DEPLOYER_ADDRESS=0xC42B5Ed782ebE05C3621b601be03b89E86ed5558
```

Như vậy lần sau chỉ cần:
1. Khởi động Ganache với mnemonic cố định
2. Import account bằng private key đã lưu
3. Deploy và dùng luôn!

---

## 📞 Cần Thêm Hỗ Trợ?

Nếu vẫn gặp vấn đề:
1. Chụp screenshot cửa sổ Ganache (phần Available Accounts và Private Keys)
2. Chụp screenshot MetaMask (account address và network settings)
3. Chụp screenshot frontend dashboard

---

Made with ❤️ by LendHub Team












