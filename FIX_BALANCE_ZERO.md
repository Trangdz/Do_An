# 🔧 Fix: Balance hiển thị 0 trên Frontend

## ❌ Vấn đề đã phát hiện:

Account bạn đang dùng trong MetaMask: `0x87EA1C24418b717D5e331e07d5246748eF3e96fE`
- ✅ Đây là account hợp lệ từ Ganache
- ❌ **KHÔNG CÓ tokens** (đã check: tất cả = 0)

### Tại sao?
- Account này từ **mnemonic MỚI** (`dwarf virtual cotton...`)
- Tokens đã mint cho accounts từ **mnemonic CŨ** (User 0-9 trong `addresses.js`)
- → Account mới = Không có tokens!

## ✅ Giải pháp:

### **Cách 1: Import Account có Tokens vào MetaMask** (KHUYẾN NGHỊ)

1. **Mở Ganache CLI window** và tìm Private Key của một trong các accounts sau:

   **User 0** (nhiều tokens nhất):
   - Address: `0x38ceaD2cB294F3D881C122e16578BBBc781ECa06`
   - Private Key: (copy từ Ganache window)
   - Tokens: 10,010,000 WETH, 101,000,000 DAI, 100,000 LINK

   **User 1-9** (mỗi account có):
   - 10,000 WETH
   - 1,000,000 DAI
   - 100,000 LINK

2. **Import vào MetaMask:**
   - MetaMask → Import Account
   - Dán Private Key
   - Account sẽ xuất hiện với tokens

3. **Refresh frontend** và connect wallet mới

### **Cách 2: Re-deploy để Mint Tokens cho Mnemonic Mới**

Nếu bạn muốn dùng mnemonic mới, cần re-deploy:

```powershell
# 1. Đảm bảo Ganache dùng mnemonic mới
.\START_GANACHE_SIMPLE.bat

# 2. Re-deploy contracts và mint tokens
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

Lưu ý: Cách này sẽ deploy lại tất cả contracts với addresses mới.

## 📋 Danh sách Accounts có Tokens:

Xem file: `lendhub-frontend-nextjs/src/addresses.js`

- User0Address: `0x38ceaD2cB294F3D881C122e16578BBBc781ECa06` ⭐ (nhiều nhất)
- User1Address: `0xB3Cf4f1665aD8cCeD0750C5181047736F5d93747`
- User2Address: `0x879d4BacB3E7D708624b22851feE0D7e736f6801`
- ... (xem file đầy đủ)

Tất cả đều có:
- ✅ 10,000 WETH (User 0 có 10,010,000)
- ✅ 1,000,000 DAI
- ✅ 100,000 LINK
- ✅ 1,000 ETH

## 🔍 Kiểm tra Balance:

```powershell
# Check balance của account bất kỳ
node scripts/check_specific_account.cjs <address>

# Check tất cả accounts
node scripts/check_token_balances.cjs
```

## ⚠️ Lưu ý:

- **Ganache CLI** phải dùng **mnemonic CŨ** để match với accounts đã có tokens
- Hoặc **re-deploy** với mnemonic mới nếu muốn đổi
- **MetaMask** phải import đúng account từ addresses.js



