# 🔍 Hướng dẫn Debug Indexer

## ❌ Vấn đề: Không ghi được vào database

### Các bước kiểm tra:

#### 1. **Chạy script debug để kiểm tra từng bước:**
```bash
npm run debug
# hoặc
node debug-indexer.js
```

Script này sẽ kiểm tra:
- ✅ Environment variables
- ✅ Kết nối MongoDB
- ✅ Kết nối RPC/Blockchain
- ✅ Contract addresses
- ✅ Tìm events trong 100 blocks gần đây
- ✅ Test ghi một event vào database
- ✅ Kiểm tra dữ liệu hiện có

#### 2. **Kiểm tra kết nối cơ bản:**
```bash
npm run check
# hoặc
node check-connection.js
```

#### 3. **Xem log khi chạy indexer:**
```bash
npm start
```

**Các log quan trọng cần chú ý:**
- `🔍 Processing event:` - Có events được tìm thấy không?
- `💾 Đang ghi transaction vào database...` - Có đến bước ghi database không?
- `✅ Ghi database thành công` - Có thông báo thành công không?
- `❌ Error` - Có lỗi nào không?

## 🔍 Các vấn đề thường gặp:

### 1. **Không tìm thấy events**
**Nguyên nhân:**
- Contract chưa được deploy hoặc address sai
- Chưa có transactions nào trên blockchain
- Block range không đúng

**Kiểm tra:**
```bash
npm run debug
# Xem phần "5️⃣ Kiểm tra events trong các block gần đây"
```

**Giải pháp:**
- Kiểm tra lại `LENDING_POOL_ADDRESS` trong `config.env`
- Đảm bảo đã có transactions trên blockchain
- Kiểm tra block range trong `indexFromLatestBlock()`

### 2. **Lỗi kết nối MongoDB**
**Nguyên nhân:**
- MongoDB chưa chạy
- URI sai
- Không có quyền truy cập

**Kiểm tra:**
```bash
npm run check
# Xem phần "🗄️ Kiểm tra MongoDB..."
```

**Giải pháp:**
- Đảm bảo MongoDB đang chạy: `mongod` hoặc service MongoDB
- Kiểm tra `MONGODB_URI` trong `config.env`
- Test kết nối: `mongosh "mongodb://localhost:27017"`

### 3. **Lỗi kết nối RPC**
**Nguyên nhân:**
- Ganache/Node chưa chạy
- RPC URL sai
- Port không đúng

**Kiểm tra:**
```bash
npm run check
# Xem phần "🔗 Kiểm tra kết nối blockchain (RPC)..."
```

**Giải pháp:**
- Đảm bảo Ganache đang chạy ở port 7545
- Kiểm tra `RPC_URL` trong `config.env`
- Test kết nối: `curl -X POST http://127.0.0.1:7545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

### 4. **Events được tìm thấy nhưng không ghi vào database**
**Nguyên nhân:**
- Lỗi khi xử lý event (get asset info, calculate USD, etc.)
- Database connection bị mất
- Lỗi validation

**Kiểm tra:**
- Xem log chi tiết khi chạy `npm start`
- Tìm các dòng `❌ Error processing event`
- Kiểm tra `💾 Đang ghi transaction vào database...` có xuất hiện không

**Giải pháp:**
- Xem log để biết lỗi cụ thể
- Kiểm tra event structure có đúng không
- Kiểm tra asset contracts có tồn tại không

### 5. **Database connection bị mất giữa chừng**
**Nguyên nhân:**
- MongoDB bị restart
- Connection timeout
- Network issues

**Giải pháp:**
- Thêm reconnection logic
- Kiểm tra MongoDB logs
- Đảm bảo MongoDB ổn định

## 📊 Các cải thiện đã thực hiện:

### 1. **Error Handling tốt hơn:**
- Log chi tiết từng bước
- Validate event args trước khi xử lý
- Catch và log từng loại lỗi riêng biệt
- Không dừng indexer khi một event lỗi

### 2. **Logging chi tiết:**
- Log khi bắt đầu xử lý event
- Log khi ghi database
- Log kết quả ghi database (matched, modified, upserted)
- Log lỗi với stack trace

### 3. **Validation:**
- Kiểm tra event args có đầy đủ không
- Kiểm tra database connection trước khi ghi
- Validate từng bước xử lý

## 🧪 Test Scripts:

1. **debug-indexer.js** - Kiểm tra toàn diện
2. **check-connection.js** - Kiểm tra kết nối
3. **view-history.js** - Xem lịch sử giao dịch
4. **test.js** - Test cơ bản

## 💡 Tips:

1. **Luôn chạy debug script trước khi chạy indexer:**
   ```bash
   npm run debug
   ```

2. **Xem log chi tiết:**
   ```bash
   npm start 2>&1 | tee indexer.log
   ```

3. **Kiểm tra database trực tiếp:**
   ```bash
   mongosh
   use lendhub_local
   db.transactions.find().limit(10)
   ```

4. **Reset indexer (nếu cần):**
   ```bash
   mongosh
   use lendhub_local
   db.transactions.deleteMany({})
   db.metadata.deleteMany({ key: "lastIndexedBlock" })
   ```

## 📝 Checklist khi gặp vấn đề:

- [ ] MongoDB đang chạy?
- [ ] Ganache/Node đang chạy?
- [ ] Environment variables đúng?
- [ ] Contract addresses đúng?
- [ ] Có events trên blockchain không?
- [ ] Database connection ổn định?
- [ ] Xem log chi tiết có lỗi gì không?
- [ ] Chạy debug script để kiểm tra?






















