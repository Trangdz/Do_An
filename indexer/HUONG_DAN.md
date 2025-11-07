# 📖 Hướng dẫn sử dụng LendHub Indexer

## 🚀 Các lệnh chạy

### 1. Kiểm tra kết nối và cấu hình
```bash
npm run check
# hoặc
node check-connection.js
```
Kiểm tra:
- ✅ Kết nối MongoDB
- ✅ Kết nối blockchain (RPC)
- ✅ Contract addresses
- ✅ Ghi/xóa dữ liệu test
- ✅ Thống kê dữ liệu hiện có

### 2. Xem lịch sử giao dịch
```bash
npm run history
# hoặc
node view-history.js
```
Hiển thị:
- 📝 20 giao dịch mới nhất
- 📈 Thống kê theo loại giao dịch
- 👥 Top users
- 💰 Top assets
- 📦 Trạng thái indexer

### 3. Xem lịch sử của một user cụ thể
```bash
node view-history.js <user_address>
# Ví dụ:
node view-history.js 0x1234567890abcdef1234567890abcdef12345678
```

### 4. Chạy indexer
```bash
npm start
# hoặc
node index.js
```

### 5. Chạy indexer (development mode - auto reload)
```bash
npm run dev
```

### 6. Test kết nối cơ bản
```bash
npm test
# hoặc
node test.js
```

## 📋 Quy trình làm việc

1. **Kiểm tra kết nối trước khi chạy:**
   ```bash
   npm run check
   ```

2. **Chạy indexer:**
   ```bash
   npm start
   ```

3. **Xem lịch sử giao dịch:**
   ```bash
   npm run history
   ```

## 🔧 Yêu cầu

- MongoDB phải đang chạy (localhost:27017)
- Ganache/Blockchain node phải đang chạy
- File `config.env` đã được cấu hình đúng

## 📊 Database Collections

- **transactions**: Lịch sử giao dịch
- **users**: Thông tin và thống kê users
- **assets**: Thông tin và thống kê assets
- **metadata**: Trạng thái indexer (lastIndexedBlock)

## 💡 Lưu ý

- Indexer sẽ tự động index từ block cuối cùng đã index
- Indexer chạy real-time, lắng nghe các block mới
- Dữ liệu được lưu vào database `lendhub_local`

