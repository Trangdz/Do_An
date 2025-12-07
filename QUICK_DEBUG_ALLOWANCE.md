# 🚀 Quick Debug Allowance = 0

## ⚡ Cách Nhanh Nhất

### Bước 1: Mở Browser Console (F12)

Tìm các log sau:

```
✅ [LendModal] Balance: X DAI, Allowance: 0 DAI
ℹ️ [LendModal] Allowance is 0 - this is normal. User hasn't approved yet.
```

**→ Nếu thấy log này → Bình thường! Chưa approve thôi.**

---

### Bước 2: Chạy Script Debug

```bash
# Lấy địa chỉ user từ MetaMask, sau đó chạy:
node scripts/check_allowance.cjs <userAddress> DAI

# Ví dụ:
node scripts/check_allowance.cjs 0x3A716b4DeeA7dcdAAdd42b90BaA30E0A7B2fd412 DAI
```

Script sẽ tự động kiểm tra:
- ✅ Network connection
- ✅ Token contract
- ✅ Pool contract
- ✅ Allowance hiện tại
- ✅ Approval events

---

## 🔍 Nếu Có Lỗi

### Lỗi 1: "Token contract has no code"

**Giải pháp:**
```bash
# Deploy lại token
node scripts/deploy_tokens.cjs
```

### Lỗi 2: "Pool contract has no code"

**Giải pháp:**
```bash
# Deploy lại LendingPool
node scripts/deploy_ganache_simple.cjs
```

### Lỗi 3: "Cannot connect to RPC"

**Giải pháp:**
- Khởi động Ganache
- Kiểm tra port 7545

### Lỗi 4: "Network mismatch"

**Giải pháp:**
- Switch network trong MetaMask về Localhost 8545
- Hoặc sửa Chain ID trong config

---

## ✅ Kết Luận

**Nếu Allowance = 0 và:**
- ✅ Console log bình thường → **Chưa approve, bình thường!**
- ❌ Có lỗi trong console → **Xem phần "Nếu Có Lỗi" ở trên**

**Giải pháp:**
- Để hệ thống tự động approve khi click "Supply" (khuyến nghị)
- Hoặc chạy script debug để kiểm tra chi tiết

