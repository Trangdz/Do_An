# 🚀 Hướng dẫn Setup Ganache và Import Account vào MetaMask

## 📋 Thông tin Account có Tokens

**Account Address:** `0xC42B5Ed782ebE05C3621b601be03b89E86ed5558`

**Token Balances:**
- ✅ 99.99 ETH
- ✅ 1,000,000 WETH
- ✅ 1,000,000 DAI
- ✅ 1,000,000 USDC
- ✅ 1,000,000 LINK

## 🔑 Cách lấy Private Key từ Ganache

### Bước 1: Tìm cửa sổ PowerShell đang chạy Ganache

Ganache đang chạy trong một cửa sổ PowerShell riêng. Hãy tìm và mở cửa sổ đó.

### Bước 2: Xem Private Keys

Khi Ganache khởi động, nó sẽ hiển thị output giống như thế này:

```
ganache v7.9.1 (@ganache/cli: 0.10.1, @ganache/core: 0.10.1)
Starting RPC server

Available Accounts
==================
(0) 0xC42B5Ed782ebE05C3621b601be03b89E86ed5558 (100 ETH)
(1) 0xabaf3554008411a0b3cceb7453eaac401631c5dc (100 ETH)
...

Private Keys
==================
(0) 0xABCDEF1234567890... <-- Copy cái này!
(1) 0x...
```

**Scroll lên phía trên** trong cửa sổ Ganache và tìm section **"Private Keys"**.

### Bước 3: Copy Private Key của Account (0)

Copy private key của Account (0) - đây là account có tất cả tokens.

## 📱 Import vào MetaMask

### 1. Thêm Ganache Network

1. Mở MetaMask
2. Click vào dropdown network (hiện đang là "Localhost 7545")
3. Chọn **"Add network"** → **"Add a network manually"**
4. Điền thông tin:
   - **Network Name:** `Ganache Local`
   - **New RPC URL:** `http://127.0.0.1:7545` ⚠️ Port **7545** không phải 7545!
   - **Chain ID:** `1337`
   - **Currency Symbol:** `ETH`
5. Click **"Save"**

### 2. Import Account

1. Click vào icon account ở góc trên bên phải MetaMask
2. Chọn **"Import Account"**
3. Chọn **"Private Key"**
4. Paste private key bạn vừa copy từ Ganache
5. Click **"Import"**

### 3. Chuyển sang Ganache Network

1. Click vào dropdown network
2. Chọn **"Ganache Local"**

### 4. Thêm Tokens (Tùy chọn)

Để xem balance của WETH, DAI, USDC, LINK trong MetaMask:

1. Scroll xuống trong MetaMask
2. Click **"Import tokens"**
3. Paste địa chỉ token:

| Token | Address |
|-------|---------|
| WETH | `0x7C641c35fE63D2feb530Db477262351D752FAd76` |
| DAI | `0xA08b4084B0dD0F91516637D47951CcE653f2EE5E` |
| USDC | `0xBbB7f7030F70A69DB872458cFd979f5A919f4de1` |
| LINK | `0xe640a9d2C4F972FeCd2ECA2a5a5A529778CfdaAB` |

## ✅ Kiểm tra

Sau khi hoàn tất, bạn sẽ thấy:
- Account address: `0xC42B...558`
- ETH Balance: ~99.99 ETH
- WETH, DAI, USDC, LINK tokens (nếu đã import)

## 🌐 Mở Frontend

1. Mở trình duyệt: `http://localhost:3000`
2. Click **"Connect Wallet"**
3. Chọn account vừa import
4. Bạn sẽ thấy đầy đủ tokens trong dashboard!

## ⚠️ Lưu ý quan trọng

- **Port 7545, không phải 7545!** Đây là sự khác biệt giữa Ganache và Hardhat node.
- **Chain ID phải là 1337** để match với Ganache.
- **Private key chỉ dùng cho development!** Không bao giờ sử dụng private key này trên mainnet hoặc testnet thật.

## 🔄 Nếu Ganache bị restart

Khi Ganache restart, tất cả contracts và balances sẽ mất. Hãy chạy lại:

```bash
# Deploy lại contracts
npx hardhat run scripts/deploy_to_ganache.cjs --network ganache
```

Frontend sẽ tự động cập nhật addresses mới.

## 🆘 Troubleshooting

### "Cannot find Ganache window"

Nếu không tìm thấy cửa sổ Ganache, có thể nó bị minimize. Hãy:
1. Nhấn `Alt + Tab` để xem tất cả windows
2. Tìm window có title chứa "powershell" hoặc "ganache"

### "Private key không work"

Đảm bảo bạn:
1. Copy ĐÚNG private key của Account (0)
2. Private key phải bắt đầu bằng `0x`
3. Không có khoảng trắng hoặc ký tự thừa

### "Frontend vẫn hiển thị 0 tokens"

1. Đảm bảo đã chuyển sang network "Ganache Local" (port 7545)
2. Refresh trang web
3. Kiểm tra account address có đúng là `0xC42B...558` không

---

Made with ❤️ by LendHub Team
