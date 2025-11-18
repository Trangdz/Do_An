# Giải thích Transaction Throttling Warning

## Cảnh báo bạn đang thấy

```
Transaction throttling; 50 transactions in-flight and 258 unstarted transactions pending
```

## Đây có phải lỗi không?

**KHÔNG!** Đây chỉ là **cảnh báo (WARNING)**, không phải lỗi. Transactions vẫn đang được xử lý bình thường.

## Tại sao có cảnh báo này?

1. **Nhiều jobs đang chạy**: Bạn có nhiều price feed jobs (ETH/USD, WETH/USD, LINK/USD, v.v.) chạy mỗi 1 phút
2. **Mỗi job tạo transaction**: Mỗi job tạo 1 transaction để update price trên blockchain
3. **Giới hạn MaxInFlight**: Chainlink chỉ xử lý 50 transactions cùng lúc (đã tăng từ 16)
4. **Queue tích lũy**: Khi có nhiều jobs, transactions tích lũy trong queue

## Tình trạng hiện tại

- ✅ **50 transactions đang xử lý** (đạt giới hạn MaxInFlight = 50)
- ⏳ **258 transactions đang chờ** (sẽ được xử lý khi có slot trống)
- ✅ **Jobs đang chạy bình thường**
- ✅ **Không có lỗi "insufficient funds"**

## Có cần làm gì không?

### Lựa chọn 1: Giữ nguyên (KHUYẾN NGHỊ)

Transactions sẽ được xử lý dần dần. Cảnh báo này là bình thường khi có nhiều jobs.

**Ưu điểm:**
- An toàn, không có rủi ro
- Ganache không bị quá tải
- Transactions vẫn được xử lý đúng

**Nhược điểm:**
- Transactions có thể mất thời gian để được xử lý (vài phút)

### Lựa chọn 2: Tăng MaxInFlight thêm

Nếu muốn xử lý nhanh hơn, có thể tăng `MaxInFlight` lên 100 hoặc cao hơn.

**CẢNH BÁO:**
- Phải đảm bảo Ganache không evict local transactions
- Có thể làm Ganache bị quá tải
- Chỉ nên làm nếu thực sự cần throughput cao

**Cách tăng:**
```toml
[EVM.Transactions]
MaxInFlight = 100  # Tăng từ 50 lên 100
MaxQueued = 1000
```

Sau đó restart Chainlink:
```bash
docker-compose restart chainlink
```

### Lựa chọn 3: Giảm tần suất jobs

Nếu không cần update price mỗi 1 phút, có thể tăng lên 5 phút hoặc 10 phút.

**Cách sửa:**
Trong job spec, thay đổi schedule:
```toml
# Từ
schedule = "@every 1m"

# Thành
schedule = "@every 5m"  # Hoặc "@every 10m"
```

## Kiểm tra transactions có đang được xử lý

```bash
# Xem logs để kiểm tra transactions có được submit
docker-compose logs -f chainlink | Select-String -Pattern "submitted|confirmed|broadcast"
```

## Kết luận

**Cảnh báo "Transaction throttling" là BÌNH THƯỜNG** khi có nhiều jobs chạy cùng lúc. 

Nếu transactions vẫn được xử lý (không bị stuck mãi), bạn không cần làm gì cả. Hệ thống sẽ tự động xử lý queue.

Nếu muốn xử lý nhanh hơn, có thể tăng `MaxInFlight`, nhưng phải cẩn thận với cấu hình Ganache.

