# Hướng Dẫn Sửa Lỗi: Không Lấy Được Giá Từ MultiPriceAggregator

## ✅ Đã Kiểm Tra

1. **Writer đã được set** ✅
   - Writer: `0x805436EB3fd7BeF4F4c67D4bfAdD2e62A8f9903b`
   - Chainlink node có thể gọi `updatePrice()`

2. **Token symbols đã được set** ✅
   - WETH → `0xdABDcE3688395D70C7741af45F9B590Ebd7Ed828`
   - DAI → `0xA8d25687D48b20d150d854f2685015a7B75a4B1c`
   - USDC → `0xf3d10A676c281A94d3ea00acad55715C95b46a08`
   - LINK → `0x16EC5c874Fc068e87502A776785138E76599F0e5`

3. **Job addresses đã được sửa** ✅
   - job-dai-simple.toml: Đã sửa từ địa chỉ cũ sang địa chỉ mới

---

## ❌ Vấn Đề: Giá Vẫn Chưa Có

**Nguyên nhân có thể:**
1. Chainlink node chưa chạy
2. Chainlink jobs chưa được tạo trong node
3. Chainlink jobs chưa được kích hoạt
4. Chainlink node chưa có ETH để gửi transactions

---

## 🔧 Các Bước Sửa

### Bước 1: Kiểm Tra Chainlink Node

```bash
docker compose ps
```

**Kết quả mong đợi:**
```
NAME              STATUS
chainlink-node    Up
cl-postgres       Up
```

**Nếu không chạy:**
```bash
docker compose up -d
```

---

### Bước 2: Kiểm Tra Chainlink UI

Mở browser: `http://localhost:6688`

**Kiểm tra:**
1. Node có đang chạy không?
2. Jobs có được tạo chưa?
3. Jobs có đang chạy không? (có runs không?)

---

### Bước 3: Tạo Jobs Trong Chainlink Node

**Nếu jobs chưa được tạo:**

1. Vào Chainlink UI: `http://localhost:6688`
2. Vào tab "Jobs"
3. Click "New Job"
4. Copy nội dung từ file `.toml` (ví dụ: `job-eth.toml`)
5. Paste vào và tạo job

**Hoặc dùng API:**
```bash
# Lấy API credentials từ Chainlink UI
# Sau đó dùng curl để tạo job
```

---

### Bước 4: Kiểm Tra Node Có ETH Không

```bash
npx hardhat run scripts/check_node_balance.cjs --network ganache
```

**Nếu node không có ETH:**
```bash
# Fund node với ETH
$env:NODE_ADDRESS="0x805436EB3fd7BeF4F4c67D4bfAdD2e62A8f9903b"
$env:AMOUNT_ETH="10.0"
npx hardhat run scripts/fund_node.cjs --network ganache
```

---

### Bước 5: Kiểm Tra Jobs Có Chạy Không

**Trong Chainlink UI:**
1. Vào tab "Jobs"
2. Click vào từng job
3. Kiểm tra "Runs" - có runs nào không?
4. Nếu có runs, kiểm tra status:
   - ✅ Success: Job đã chạy thành công
   - ❌ Error: Có lỗi, xem logs

---

### Bước 6: Kiểm Tra Job Addresses

**Đảm bảo tất cả jobs đều gửi đến đúng địa chỉ:**

```bash
# Kiểm tra địa chỉ trong jobs
grep "to=" chainlink-data/job-*.toml
```

**Tất cả phải là:** `0x1D00835fB29E1E2f7FDf52533Da99315B951670f`

**Nếu có địa chỉ khác, sửa bằng cách:**
1. Chạy lại deploy script (sẽ tự động update)
2. Hoặc sửa thủ công trong file `.toml`

---

## 🎯 Checklist

- [ ] Chainlink node đang chạy (`docker compose ps`)
- [ ] Chainlink UI accessible (`http://localhost:6688`)
- [ ] Jobs đã được tạo trong node
- [ ] Jobs đang chạy (có runs)
- [ ] Node có ETH để gửi transactions
- [ ] Writer đã được set cho MultiPriceAggregator
- [ ] Token symbols đã được set
- [ ] Job addresses đúng với MultiPriceAggregator address

---

## 📋 Scripts Hữu Ích

1. **Kiểm tra status:**
   ```bash
   npx hardhat run scripts/check_multi_price_aggregator.cjs --network ganache
   ```

2. **Set token symbols:**
   ```bash
   npx hardhat run scripts/set_token_symbols.cjs --network ganache
   ```

3. **Set writer:**
   ```bash
   $env:NODE_ADDRESS="0x805436EB3fd7BeF4F4c67D4bfAdD2e62A8f9903b"
   npx hardhat run scripts/set_multi_writer.cjs --network ganache
   ```

4. **Đọc giá:**
   ```bash
   npx hardhat run scripts/read_all_prices.cjs --network ganache
   ```

---

## 💡 Lưu Ý

- **Giá sẽ không có ngay sau deploy** - cần đợi Chainlink jobs chạy (mỗi 30 giây)
- **Kiểm tra Chainlink UI** để xem jobs có chạy không
- **Nếu jobs fail**, xem logs trong Chainlink UI để debug










