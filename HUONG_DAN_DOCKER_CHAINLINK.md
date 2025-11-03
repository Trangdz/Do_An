# 🔗 Hướng Dẫn Chạy Docker Chainlink

## ✅ Đã Chuẩn Bị

1. ✅ **docker-compose.yml** - Đã update với:
   - PostgreSQL 15 (port 5432)
   - Chainlink Node (port 6688) - dùng image chính thức `public.ecr.aws/chainlink/chainlink:latest`
   - Database: `chainlink_db`

2. ✅ **chainlink-data/.password** - Password file đã tạo
3. ✅ **chainlink-data/.api** - API credentials đã tạo
4. ✅ **chainlink-data/config.toml** - Cấu hình Chainlink (ChainID 1337, Ganache)
5. ✅ **chainlink-data/secrets.toml** - Database connection string

## 🚀 Các Bước Chạy

### Bước 1: Kiểm tra Docker đang chạy
```powershell
docker info
```

### Bước 2: Stop các containers cũ (nếu có)
```powershell
docker-compose down
```

### Bước 3: Start Docker services
```powershell
docker-compose up -d
```

### Bước 4: Kiểm tra status
```powershell
docker-compose ps
```

Bạn sẽ thấy:
- `cl-postgres` (PostgreSQL) - Status: Up
- `chainlink-node` (Chainlink) - Status: Up

### Bước 5: Xem logs để kiểm tra
```powershell
# Xem logs Chainlink
docker-compose logs -f chainlink

# Xem logs PostgreSQL
docker-compose logs -f postgres

# Xem tất cả logs
docker-compose logs -f
```

### Bước 6: Truy cập Chainlink UI
Mở trình duyệt: **http://localhost:6688**

Credentials:
- **Email**: `phamlendhub@email.com`
- **Password**: `SuperSecretUIpass!@#`

## 📊 Kiểm Tra Services

### Kiểm tra PostgreSQL
```powershell
# Test connection
docker exec -it cl-postgres psql -U postgres -d chainlink_db -c "SELECT version();"
```

### Kiểm tra Chainlink Node
```powershell
# Health check
curl http://localhost:6688/health

# Hoặc dùng PowerShell
Invoke-WebRequest -Uri http://localhost:6688/health
```

## 🔧 Troubleshooting

### Nếu Chainlink không start:
1. Kiểm tra logs: `docker-compose logs chainlink`
2. Kiểm tra file `.password` và `.api` tồn tại trong `chainlink-data/`
3. Kiểm tra PostgreSQL đã start: `docker-compose ps`

### Nếu port conflict:
- Port 5432 (PostgreSQL) đang được dùng → Stop PostgreSQL local
- Port 6688 (Chainlink) đang được dùng → Stop service khác

### Reset hoàn toàn:
```powershell
# Stop và xóa containers + volumes
docker-compose down -v

# Xóa image (nếu cần)
docker rmi public.ecr.aws/chainlink/chainlink:latest

# Start lại
docker-compose up -d
```

## 📝 Cấu Hình Hiện Tại

### Network Configuration
- **Ganache**: `http://host.docker.internal:7545` (ChainID 1337)
- **PostgreSQL**: `postgresql://postgres:mysecretpassword@postgres:5432/chainlink_db`

### Chainlink Config
- **ChainID**: 1337 (Ganache)
- **HTTP Port**: 6688
- **Database**: PostgreSQL trong Docker
- **Node URL**: `http://host.docker.internal:7545` (Ganache)

## ✅ Next Steps

Sau khi Docker Chainlink đã chạy thành công:

1. ✅ **Fund Chainlink node với ETH và LINK** (từ Ganache)
2. ✅ **Authorize node để gọi updateAnswer()** trên PriceAggregator
3. ✅ **Tạo Chainlink cron job** để update giá từ Binance/CoinGecko
4. ✅ **Test đọc giá** từ PriceAggregator contract



