# Hướng dẫn khắc phục lỗi Chainlink Queue Error

## Lỗi gặp phải
```
too many unstarted transactions in the queue (252/250)
```

## Đã thực hiện
✅ Đã tăng `MaxQueued` từ 250 → 1000 trong tất cả các file config:
- `config.toml`
- `chainlink-data/config.toml`
- `node1/config.toml`
- `node2/config.toml`

## Các bước tiếp theo

### Bước 1: Kiểm tra ETH node đang chạy

**Kiểm tra Ganache (port 7545):**
```bash
# Chạy script kiểm tra
CHECK_GANACHE_STATUS.bat

# Hoặc kiểm tra thủ công
curl -X POST http://localhost:7545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Kiểm tra Hardhat (port 8545):**
```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

### Bước 2: Khởi động ETH node nếu chưa chạy

**Nếu dùng Ganache:**
```bash
# Ganache CLI
ganache-cli -p 7545 -m "globe equip glow concert garage canvas sword feature stereo prison pony brief"

# Hoặc Ganache GUI - mở ứng dụng và set port 7545
```

**Nếu dùng Hardhat:**
```bash
npx hardhat node --port 8545
```

### Bước 3: Khởi động lại Chainlink với config mới

```bash
# Dừng Chainlink
docker-compose stop chainlink

# Khởi động lại
docker-compose up -d chainlink

# Hoặc restart
docker-compose restart chainlink
```

### Bước 4: Kiểm tra logs

```bash
# Xem logs real-time
docker-compose logs -f chainlink

# Xem logs gần đây
docker-compose logs --tail=50 chainlink
```

### Bước 5: Kiểm tra Chainlink UI

Mở trình duyệt: http://localhost:6688

Kiểm tra:
- ✅ Node status
- ✅ Balance
- ✅ Jobs status
- ✅ Transactions

## Nguyên nhân có thể

1. **ETH node không chạy** → Khởi động lại ETH node
2. **ETH node không broadcast transactions** → Kiểm tra logs của ETH node
3. **Kết nối mạng giữa Chainlink và ETH node** → Kiểm tra firewall, network
4. **ETH node bị quá tải** → Giảm số lượng transactions hoặc tăng tài nguyên

## Giải pháp dài hạn

### Thêm backup ETH nodes

Sửa file `chainlink-data/config.toml`:

```toml
[[EVM.Nodes]]
Name   = "ganache-primary"
WSURL  = "ws://host.docker.internal:7545"
HTTPURL = "http://host.docker.internal:7545"

[[EVM.Nodes]]
Name   = "ganache-backup"
WSURL  = "ws://host.docker.internal:7546"
HTTPURL = "http://host.docker.internal:7546"
SendOnly = true
```

### Tối ưu cấu hình

```toml
[EVM.Transactions]
MaxInFlight = 32        # Tăng số transactions đang xử lý
MaxQueued = 1000        # Đã tăng
ReaperInterval = '30m'  # Dọn dẹp thường xuyên hơn
ResendAfterThreshold = '30s'  # Resend nhanh hơn
```

## Script tự động

Chạy script `FIX_CHAINLINK_QUEUE_ERROR.bat` để tự động kiểm tra và khắc phục.



