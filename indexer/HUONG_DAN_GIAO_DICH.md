# 📝 Hướng dẫn: Khi có giao dịch, indexer sẽ ghi vào database

## ✅ Đã hoàn thành

1. ✅ Contract address đã được cập nhật đúng
2. ✅ Indexer đã được cấu hình và sẵn sàng
3. ✅ Database connection đã được thiết lập

## 🚀 Các bước để test

### Bước 1: Reset last indexed block (nếu cần)

Nếu bạn muốn scan lại từ đầu để tìm các events cũ:

```bash
# Kết nối MongoDB
mongosh

# Chọn database
use lendhub_local

# Xóa last indexed block
db.metadata.deleteMany({ key: "lastIndexedBlock" })

# (Tùy chọn) Xóa transactions cũ
db.transactions.deleteMany({})
```

### Bước 2: Chạy indexer

```bash
cd indexer
npm start
```

Indexer sẽ:
- ✅ Kết nối MongoDB
- ✅ Kết nối blockchain
- ✅ Scan các blocks chưa được index
- ✅ Lắng nghe các blocks mới
- ✅ Tự động ghi events vào database

### Bước 3: Thực hiện giao dịch

Có 2 cách:

#### Cách 1: Sử dụng Frontend (Khuyến nghị)

1. Mở frontend: `http://localhost:3000` (hoặc port bạn đã cấu hình)
2. Kết nối wallet (MetaMask với Ganache)
3. Thực hiện một giao dịch:
   - **Deposit/Supply**: Gửi token vào pool
   - **Withdraw**: Rút token từ pool
   - **Borrow**: Vay token
   - **Repay**: Trả nợ

4. Indexer sẽ **tự động** bắt được event và ghi vào database!

#### Cách 2: Sử dụng Script Test

```bash
cd indexer
node test-transaction.js
```

**Lưu ý**: Script này chỉ test nếu đã có token và allowance.

### Bước 4: Kiểm tra kết quả

#### Xem log indexer

Khi có giao dịch, bạn sẽ thấy trong log indexer:

```
📦 New block: 1000
📈 Block 1000: Found 1 events
   - Supplied: 1
📝 Processing event 1/1: Supplied
🔍 Processing event: Supplied in block 1000
   👤 User: 0x..., Asset: 0x..., Amount: 1000000000000000000
   💰 Asset: WETH (18 decimals)
   💾 Đang ghi transaction vào database...
   ✅ Ghi database thành công (matched: 0, modified: 0, upserted: 1)
✅ Indexed Lend transaction: 0x1234567...
```

#### Xem trong database

```bash
npm run history
```

Hoặc:

```bash
mongosh
use lendhub_local
db.transactions.find().sort({ timestamp: -1 }).limit(10).pretty()
```

## 🔍 Debug nếu không thấy events

### 1. Kiểm tra contract có events không

```bash
npm run find-events
```

### 2. Kiểm tra contract address

```bash
npm run check
```

### 3. Xem log chi tiết

Chạy indexer với debug mode (đã bật trong config.env):

```bash
npm start
```

Xem các log:
- `📦 New block: XXX` - Indexer đang lắng nghe blocks
- `📈 Found X events` - Có events được tìm thấy
- `💾 Đang ghi transaction` - Đang ghi vào database
- `✅ Ghi database thành công` - Đã ghi thành công

### 4. Kiểm tra database trực tiếp

```bash
mongosh
use lendhub_local

# Xem số transactions
db.transactions.countDocuments()

# Xem transactions mới nhất
db.transactions.find().sort({ timestamp: -1 }).limit(5)

# Xem last indexed block
db.metadata.findOne({ key: "lastIndexedBlock" })
```

## 📊 Cấu trúc dữ liệu trong database

### Collection: transactions

```javascript
{
  hash: "0x...",              // Transaction hash
  user: "0x...",              // User address
  asset: {
    address: "0x...",         // Token address
    symbol: "WETH",           // Token symbol
    decimals: 18              // Token decimals
  },
  amount: "1.0",              // Amount (formatted)
  amountUSD: 100.0,           // USD value
  type: "Lend",               // Transaction type
  timestamp: 1234567890,      // Block timestamp
  blockNumber: 1000,          // Block number
  gas: {                      // Gas info
    used: "21000",
    price: "20000000000",
    fee: "0.00042"
  },
  status: "success",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## 💡 Tips

1. **Indexer chạy real-time**: Chỉ cần chạy `npm start` một lần, indexer sẽ tự động lắng nghe các blocks mới

2. **Không cần restart**: Indexer sẽ tự động tiếp tục từ block cuối cùng đã index

3. **Events được xử lý tự động**: Mọi event từ contract sẽ được tự động ghi vào database

4. **Xem lịch sử**: Dùng `npm run history` để xem lịch sử giao dịch

5. **Reset nếu cần**: Nếu muốn scan lại từ đầu, xóa `lastIndexedBlock` trong metadata collection

## 🎯 Tóm tắt

1. ✅ Contract address đã đúng
2. ✅ Indexer đã sẵn sàng
3. ✅ Chạy `npm start` trong thư mục indexer
4. ✅ Thực hiện giao dịch qua frontend hoặc script
5. ✅ Indexer tự động bắt events và ghi vào database
6. ✅ Xem kết quả bằng `npm run history`

**Indexer sẽ tự động làm việc trong background!** 🚀

























