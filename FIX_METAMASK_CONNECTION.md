# 🔧 Hướng dẫn Fix: MetaMask không hiển thị tokens

## ✅ Tokens đã có trong accounts!

Tất cả 10 test accounts đã có tokens:
- ✅ **WETH**: 10,000 WETH mỗi account
- ✅ **DAI**: 1,000,000 DAI mỗi account  
- ⚠️ **USDC**: Có vấn đề nhỏ (chỉ 0.000001)
- ✅ **LINK**: 100,000 LINK mỗi account
- ✅ **ETH**: 1000 ETH mỗi account

## 🔍 Vấn đề có thể là:

### 1. MetaMask chưa connect với đúng account
- MetaMask đang dùng account khác (không có tokens)
- Hoặc chưa import account vào MetaMask

### 2. Network chưa đúng
- MetaMask đang ở network khác (không phải Chain ID 5777)
- Hoặc chưa add Ganache network

### 3. Frontend chưa refresh
- Frontend cache cũ
- Hoặc chưa detect account change

## 🛠️ Giải pháp:

### Bước 1: Import Account vào MetaMask

**Cách 1: Import bằng Private Key**
1. Mở Ganache CLI window
2. Copy Private Key của account (ví dụ: User 0)
3. MetaMask → Import Account → Paste Private Key

**Cách 2: Import bằng Mnemonic**
1. Đảm bảo Ganache dùng mnemonic: `dwarf virtual cotton sudden uncover initial true apple call prepare inquiry west`
2. MetaMask → Import Account → Mnemonic → Paste mnemonic
3. Chọn account index (0-9)

### Bước 2: Add Ganache Network vào MetaMask

Network Settings:
- **Network Name**: Ganache Local
- **RPC URL**: `http://127.0.0.1:7545`
- **Chain ID**: `5777`
- **Currency Symbol**: ETH

### Bước 3: Kiểm tra trong Frontend

1. Refresh trang (`Ctrl+F5` hoặc `Ctrl+Shift+R`)
2. Đảm bảo MetaMask đã connect
3. Kiểm tra console để xem có lỗi không

### Bước 4: Kiểm tra Account Address

Đảm bảo address trong MetaMask match với một trong các addresses:
- User 0: `0x38ceaD2cB294F3D881C122e16578BBBc781ECa06` ✅ (có nhiều tokens nhất)
- User 1: `0xB3Cf4f1665aD8cCeD0750C5181047736F5d93747`
- ... (xem `addresses.js`)

## 📝 Quick Fix:

1. **Copy Private Key từ Ganache** (Account đầu tiên)
2. **Import vào MetaMask** bằng Private Key
3. **Add Network** Ganache (Chain ID 5777)
4. **Refresh frontend** và connect wallet

## 🔍 Debug:

Chạy script để check balance:
```powershell
node scripts/check_token_balances.cjs
```

Kiểm tra xem MetaMask đang dùng account nào:
- Xem address trong MetaMask
- So sánh với addresses trong `lendhub-frontend-nextjs/src/addresses.js`



