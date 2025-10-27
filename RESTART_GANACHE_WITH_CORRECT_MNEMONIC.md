# 🔄 RESTART GANACHE VỚI MNEMONIC ĐÚNG

## 🔍 VẤN ĐỀ:

Ganache hiện tại có 10 accounts với 100 ETH mỗi account, NHƯNG:
- Mnemonic trong Hardhat: `test test test test test test test test test test test junk`
- Ganache đang dùng mnemonic KHÁC → accounts không match

## ✅ GIẢI PHÁP:

### Option 1: Restart Ganache với mnemonic đúng (KHUYẾN NGHỊ)

1. **Close Ganache**
2. **Mở Ganache lại**
3. **New Workspace** hoặc **Quickstart**
4. **Settings:**
   - Hostname: `127.0.0.1`
   - Port: `7545`
   - Network ID: `1337`
   - Chain ID: `1337`
   - Mnemonic: `test test test test test test test test test test test junk` ← IMPORTANT!
5. **Start**

### Option 2: Fund accounts từ Ganache GUI

1. Trong Ganache, tìm account có địa chỉ: `0xD51d4b680Cd89E834413c48fa6EE2c59863B738d`
2. Copy private key của account đó
3. Fund nó với ETH

### Option 3: Dùng accounts từ Ganache hiện tại

Update Hardhat config để dùng accounts từ Ganache:

```javascript
// hardhat.config.cjs
ganache: {
  url: "http://127.0.0.1:7545",
  chainId: 1337,
  accounts: [],  // Let Ganache manage accounts
}
```

---

## 🎯 SAU KHI RESTART:

1. Verify mnemonic:
```bash
node check_deploy_account.js
# Should show: ✅ Ready to deploy!
```

2. Deploy:
```bash
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

3. Start frontend:
```bash
cd lendhub-frontend-nextjs
npm run dev
```

---

**Chọn Option 1 (restart Ganache) là đơn giản nhất!** 🚀

