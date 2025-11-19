# Hướng dẫn làm sạch Chainlink Queue

## Các cách làm sạch

### Cách 1: Xóa transactions pending (Nhanh - Khuyến nghị)

Chạy script tự động:
```bash
CLEAN_CHAINLINK_QUEUE.bat
```

Script này sẽ:
- Dừng Chainlink
- Xóa tất cả transactions ở trạng thái `unstarted` và `in_progress`
- Khởi động lại Chainlink

### Cách 2: Xóa transactions bằng SQL (Thủ công)

1. Kết nối vào PostgreSQL:
```bash
docker-compose exec postgres psql -U postgres -d postgres
```

2. Chạy SQL:
```sql
-- Xóa transactions pending
DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress');

-- Xem số lượng còn lại
SELECT state, COUNT(*) as count FROM eth_txes GROUP BY state;
```

3. Khởi động lại Chainlink:
```bash
docker-compose restart chainlink
```

### Cách 3: Reset hoàn toàn (Xóa tất cả dữ liệu)

⚠️ **CẢNH BÁO:** Cách này sẽ xóa TẤT CẢ dữ liệu!

```bash
RESET_CHAINLINK_COMPLETE.bat
```

Sau khi reset, bạn cần:
1. Tạo lại Chainlink account
2. Thêm ETH keys
3. Fund ETH cho addresses
4. Tạo lại jobs

### Cách 4: Xóa transactions cũ (Giữ lại transactions mới)

Kết nối PostgreSQL và chạy:
```sql
-- Xóa transactions cũ hơn 24 giờ
DELETE FROM eth_txes WHERE created_at < NOW() - INTERVAL '24 hours';

-- Hoặc xóa transactions cũ hơn 1 giờ
DELETE FROM eth_txes WHERE created_at < NOW() - INTERVAL '1 hour';
```

## Kiểm tra sau khi clean

```bash
# Xem logs
docker-compose logs -f chainlink

# Kiểm tra queue status
docker-compose logs chainlink | findstr "Transaction throttling"
```

## Lưu ý

- **Cách 1** (Clean queue) là an toàn nhất và nhanh nhất
- **Cách 3** (Reset complete) chỉ dùng khi muốn bắt đầu lại từ đầu
- Sau khi clean, transactions mới sẽ được tạo và xử lý bình thường




