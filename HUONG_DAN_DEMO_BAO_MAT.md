# 🎬 HƯỚNG DẪN DEMO BẢO MẬT

## 📋 Tổng quan

File này hướng dẫn cách chạy các demo để chứng minh các cơ chế bảo mật của hệ thống reward.

## 🚀 Cách chạy demo

### Demo 1: Access Control (Kiểm soát truy cập)

**Mục đích:** Chứng minh user không thể tự tăng reward

**Chạy:**
```bash
npx hardhat run scripts/demo_access_control.cjs --network ganache
```

**Kết quả mong đợi:**
```
✅ PASS: Transaction reverted
Error: "RewardAccumulator: only LendingPool"
```

**Giải thích:**
- User cố gắng tự gọi `updateSupplyBalance()` để tăng reward
- Transaction bị revert vì chỉ LendingPool được phép gọi
- Điều này ngăn chặn user tự manipulate reward

---

### Demo 2: Anti-Spam Protection (Chống spam)

**Mục đích:** Chứng minh user không thể spam transactions

**Chạy:**
```bash
npx hardhat run scripts/demo_anti_spam.cjs --network ganache
```

**Kết quả mong đợi:**
```
1️⃣ Initial reward: 0.0 LENDX
2️⃣ Supplying 100 DAI...
   ✅ Reward accumulated (first time)
3️⃣ Supplying 0.0001 DAI again (1 second later)...
   ✅ Reward NOT accumulated (time < 60s)
```

**Giải thích:**
- User supply lần 1 → reward được accumulate
- User supply lần 2 ngay sau đó (1 giây) → reward KHÔNG được accumulate
- Phải đợi ít nhất 60 giây giữa các lần accumulate
- Điều này ngăn chặn spam transactions

---

### Demo 3: Daily Claim Limit (Giới hạn claim mỗi ngày)

**Mục đích:** Chứng minh user không thể claim quá daily limit

**Chạy:**
```bash
npx hardhat run scripts/demo_daily_limit.cjs --network ganache
```

**Kết quả mong đợi:**
```
1️⃣ Accumulating 5000 LENDX reward...
2️⃣ Claimable reward: 5000.0 LENDX
3️⃣ Claiming reward (1st time)...
   ✅ Claimed: 1000.0 LENDX
4️⃣ Claiming reward (2nd time)...
   ✅ Claimed: 2000.0 LENDX
5️⃣ Claiming reward (3rd time)...
   ✅ PASS: Daily limit exceeded
```

**Giải thích:**
- User có 5000 LENDX reward
- Lần 1: Claim 1000 LENDX ✅
- Lần 2: Claim 1000 LENDX ✅
- Lần 3: REVERT ❌ (đã đạt daily limit 2000 LENDX)
- Điều này đảm bảo fair distribution

---

## 📝 Kịch bản demo đầy đủ

### Bước 1: Setup

```bash
# Đảm bảo contracts đã được deploy
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

### Bước 2: Chạy các demo

```bash
# Demo 1: Access Control
npx hardhat run scripts/demo_access_control.cjs --network ganache

# Demo 2: Anti-Spam
npx hardhat run scripts/demo_anti_spam.cjs --network ganache

# Demo 3: Daily Limit
npx hardhat run scripts/demo_daily_limit.cjs --network ganache
```

### Bước 3: Giải thích kết quả

Sau mỗi demo, giải thích:
1. **Vấn đề:** Tấn công nào đang được ngăn chặn?
2. **Cơ chế:** Làm thế nào hệ thống ngăn chặn?
3. **Kết quả:** Tại sao transaction bị revert hoặc không hoạt động?

---

## 🎯 Điểm chính cần nhấn mạnh

1. **Access Control:**
   - User không thể tự gọi functions quan trọng
   - Chỉ authorized contracts được phép

2. **Anti-Spam:**
   - Phải đợi 60 giây giữa các lần accumulate
   - Hoặc reward phải >= 0.01 LENDX

3. **Daily Limit:**
   - Tối đa 1000 LENDX/ngày/user
   - Đảm bảo fair distribution

---

## 📚 Tài liệu tham khảo

Xem file `BAO_CAO_BAO_MAT_REWARD_SYSTEM.md` để biết chi tiết về:
- Tất cả các cơ chế bảo mật
- Ví dụ cụ thể
- Code examples
- Kịch bản tấn công và cách phòng thủ






